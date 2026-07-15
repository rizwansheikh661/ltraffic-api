'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const ms = require('ms');

const env = require('../../config/env');
const logger = require('../../config/logger');
const ApiError = require('../../common/apiError');
const ERROR_CODES = require('../../constants/errorCodes');
const { withTransaction } = require('../../common/db');
const {
  detectFormat,
  verifyMd5,
  verifyBcrypt,
  hashBcrypt,
  MD5_RE,
} = require('../../utils/legacyHash.helper');
const { toMysqlDatetime } = require('../../utils/date.helper');

const repo = require('./auth.repository');
const levelsCache = require('./levels.cache');
const { publicUser, resolveLevels, userTypeFromLevelIds } = require('./auth.dto');

// ── token helpers ───────────────────────────────────────────

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function newOpaqueToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars, 256 bits
}

function signAccessToken(user) {
  const ids = resolveLevels(user.user_level);
  const names = levelsCache.idsToNames(ids);
  const userType = userTypeFromLevelIds(ids);
  const payload = {
    sub: String(user.user_id),
    username: user.username,
    email: user.email,
    roles: names,
    levelIds: ids,
    userType,
    // legacy claims (retained so existing middleware and clients keep working)
    level: ids[0] || null,
    ltrafficid: user.ltrafficid || null,
    name: user.name || user.name1 || user.username,
  };
  // SEC-03 — set issuer so `jwt.verify({ issuer: 'ltraffic-api' })` can pin it.
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_EXPIRES,
    issuer: 'ltraffic-api',
    jwtid: crypto.randomUUID(),
  });
}

function refreshExpiryDate() {
  const millis = ms(env.JWT_REFRESH_EXPIRES);
  if (!millis || !Number.isFinite(millis)) {
    throw new Error(`invalid JWT_REFRESH_EXPIRES: ${env.JWT_REFRESH_EXPIRES}`);
  }
  return new Date(Date.now() + millis);
}

// ── password verification ───────────────────────────────────

/**
 * Verify `plaintext` against a user's canonical password, using the bcrypt
 * cache when it's still valid. Returns `{ verified: bool, rehashed: bool }`.
 *
 * Rules:
 *   1. Read live `login_users.password` (SoT).
 *   2. If sidecar exists AND sidecar.md5_snapshot === live SoT → bcrypt path.
 *   3. Otherwise: verify against live MD5. On success, rebuild sidecar.
 *   4. Never overwrite `login_users.password` here (that only happens on
 *      change-password / reset-password).
 */
async function verifyPasswordAndMaybeCache(userRow, plaintext) {
  const currentSoT = String(userRow.password || '');
  const sidecar = await repo.findCredentialsByUserId(userRow.user_id);

  if (sidecar && sidecar.md5_snapshot === currentSoT) {
    // cache is fresh — trust bcrypt
    const ok = await verifyBcrypt(plaintext, sidecar.bcrypt_hash);
    return { verified: ok, rehashed: false };
  }

  // cache is stale or missing — self-heal from SoT (which must be MD5)
  if (!MD5_RE.test(currentSoT)) {
    // e.g. user 94's literal 'N/a' — unrecoverable via mobile
    return { verified: false, rehashed: false };
  }
  const ok = verifyMd5(plaintext, currentSoT);
  if (!ok) return { verified: false, rehashed: false };

  const bcryptHash = await hashBcrypt(plaintext);
  try {
    await repo.upsertCredentials(userRow.user_id, bcryptHash, currentSoT);
  } catch (err) {
    // never fail login just because the cache write failed — log and continue
    logger.warn(`[auth] cache rebuild failed for user ${userRow.user_id}: ${err.message}`);
    return { verified: true, rehashed: false };
  }
  return { verified: true, rehashed: true };
}

// ── level gate ──────────────────────────────────────────────

/** Reject login if EVERY level the user holds is disabled in `login_levels`. */
function assertLevelsUsable(levelIds) {
  if (levelIds.length === 0) {
    throw ApiError.forbidden('User has no assigned level', ERROR_CODES.AUTH_LEVEL_UNKNOWN);
  }
  const anyUsable = levelIds.some((id) => {
    const entry = levelsCache.getById(id);
    return entry && !entry.disabled;
  });
  if (!anyUsable) {
    throw ApiError.forbidden('User level is disabled', ERROR_CODES.AUTH_USER_DISABLED);
  }
}

// ── public service ──────────────────────────────────────────

// SEC-04 — a stable well-formed bcrypt hash used only to burn CPU time when the
// requested user does not exist. Prevents timing-based user enumeration: a bcrypt
// compare runs whether or not the user is real. The plaintext never matches this
// hash, so verify returns false, but the response time is comparable to the real path.
const DUMMY_BCRYPT_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.tCkFqOZBUXWue0Thq9StjUM0uabc';

async function login({ identifier, password, deviceId, ip, userAgent }) {
  const user = await repo.findUserByUsernameOrEmail(identifier);

  if (!user) {
    // Burn equivalent bcrypt time then reject — equalises latency vs the real-user path.
    await verifyBcrypt(String(password), DUMMY_BCRYPT_HASH);
    throw ApiError.unauthorized('Invalid credentials', ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  const { verified } = await verifyPasswordAndMaybeCache(user, password);
  if (!verified) throw ApiError.unauthorized('Invalid credentials', ERROR_CODES.AUTH_INVALID_CREDENTIALS);

  const levelIds = resolveLevels(user.user_level);
  assertLevelsUsable(levelIds);

  const accessToken = signAccessToken(user);
  const refreshToken = newOpaqueToken();
  const expiresAt = refreshExpiryDate();

  await repo.insertRefreshToken({
    user_id: user.user_id,
    token_hash: sha256(refreshToken),
    device_id: deviceId || null,
    user_agent: userAgent || null,
    ip: ip || null,
    expires_at: toMysqlDatetime(expiresAt),
  });

  // Best-effort — a failed timestamp write is not a login failure.
  try {
    await repo.recordLogin(user.user_id, ip || '');
  } catch (err) {
    logger.warn(`[auth] login_timestamps write failed for user ${user.user_id}: ${err.message}`);
  }

  return {
    accessToken,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES,
    refreshToken,
    refreshExpiresAt: expiresAt.toISOString(),
    user: publicUser(user),
  };
}

async function refresh({ refreshToken, ip, userAgent }) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Missing refresh token', ERROR_CODES.AUTH_REFRESH_INVALID);
  }
  const tokenHash = sha256(refreshToken);

  return withTransaction(async (conn) => {
    const row = await repo.findRefreshTokenByHash(tokenHash, conn);
    if (!row) throw ApiError.unauthorized('Refresh token not recognised', ERROR_CODES.AUTH_REFRESH_INVALID);
    if (row.revoked_at) throw ApiError.unauthorized('Refresh token revoked', ERROR_CODES.AUTH_REFRESH_INVALID);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw ApiError.unauthorized('Refresh token expired', ERROR_CODES.AUTH_REFRESH_INVALID);
    }

    const user = await repo.findUserById(row.user_id, conn);
    if (!user) throw ApiError.unauthorized('User no longer exists', ERROR_CODES.AUTH_REFRESH_INVALID);

    const levelIds = resolveLevels(user.user_level);
    assertLevelsUsable(levelIds);

    // rotate: revoke this row, issue a fresh pair
    await repo.revokeRefreshTokenById(row.id, conn);

    const nextRefresh = newOpaqueToken();
    const nextExpiry = refreshExpiryDate();
    await repo.insertRefreshToken({
      user_id: user.user_id,
      token_hash: sha256(nextRefresh),
      device_id: row.device_id || null,
      user_agent: userAgent || null,
      ip: ip || null,
      expires_at: toMysqlDatetime(nextExpiry),
    }, conn);

    return {
      accessToken: signAccessToken(user),
      accessExpiresIn: env.JWT_ACCESS_EXPIRES,
      refreshToken: nextRefresh,
      refreshExpiresAt: nextExpiry.toISOString(),
    };
  });
}

async function logout({ refreshToken }) {
  if (!refreshToken) return { revoked: false };
  const row = await repo.findRefreshTokenByHash(sha256(refreshToken));
  if (!row) return { revoked: false };
  if (row.revoked_at) return { revoked: false };
  await repo.revokeRefreshTokenById(row.id);
  return { revoked: true };
}

async function me(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return publicUser(user);
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await repo.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const { verified } = await verifyPasswordAndMaybeCache(user, currentPassword);
  if (!verified) {
    throw ApiError.unauthorized('Current password is incorrect', ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  const newMd5 = md5(String(newPassword));
  const newBcrypt = await hashBcrypt(newPassword);

  await withTransaction(async (conn) => {
    // 1. Update the canonical SoT (PHP-compatible: MD5, same column PHP writes).
    await repo.updateUserPasswordMd5(userId, newMd5, conn);
    // 2. Rebuild the sidecar cache with the new snapshot.
    await repo.upsertCredentials(userId, newBcrypt, newMd5, conn);
    // 3. Revoke all outstanding refresh tokens for this user — password change = session reset.
    await repo.revokeAllRefreshTokensForUser(userId, conn);
  });

  return { changed: true };
}

async function forgotPassword({ email }) {
  const user = await repo.findUserByEmail(email);
  // Always return success (no user-existence leak). Only insert if the email is real.
  if (user) {
    const key = md5(`${crypto.randomUUID()}${Date.now()}`);
    await withTransaction(async (conn) => {
      // PHP-01 — mirror PHP forgot.class.php:230-233 — invalidate any prior outstanding key.
      await repo.deleteConfirmByEmailAndType(user.email, 'forgot_pw', conn);
      await repo.insertConfirmRow({
        data: '',
        username: user.username,
        email: user.email,
        key,
        type: 'forgot_pw',
      }, conn);
    });
    // TODO(P5): actually send the email via the PHP-parity mail path.
    // SEC-08 — do not log the email; user_id is enough for correlation.
    logger.info(`[auth] forgot_pw key issued for user_id=${user.user_id}`);
  } else {
    logger.info('[auth] forgot_pw requested for unknown email');
  }
  return { requested: true };
}

async function resetPassword({ key, newPassword }) {
  const row = await repo.findConfirmByKeyAndType(key, 'forgot_pw');
  if (!row) {
    throw ApiError.badRequest('Reset link is invalid or has already been used');
  }

  const user = await repo.findUserByEmail(row.email);
  if (!user) throw ApiError.badRequest('Reset link is no longer valid');

  const newMd5 = md5(String(newPassword));
  const newBcrypt = await hashBcrypt(newPassword);

  await withTransaction(async (conn) => {
    await repo.updateUserPasswordMd5(user.user_id, newMd5, conn);
    // PHP-02 — clear any pending 2FA state on reset (PHP `forgot.class.php:105`).
    await repo.clearTwoFactorState(user.user_id, conn);
    await repo.upsertCredentials(user.user_id, newBcrypt, newMd5, conn);
    await repo.revokeAllRefreshTokensForUser(user.user_id, conn);
    await repo.deleteConfirmById(row.id, conn);
  });

  return { reset: true };
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  // exported for tests
  _internal: { sha256, newOpaqueToken, signAccessToken, verifyPasswordAndMaybeCache },
};

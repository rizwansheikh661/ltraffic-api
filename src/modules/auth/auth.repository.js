'use strict';

const { pool } = require('../../config/db');
const { LEGACY, NEW } = require('../../constants/tables');

/**
 * All SQL for the auth module lives here. Controllers/services never write SQL directly.
 *
 * IMPORTANT: `login_users.password` is the canonical password store (MD5),
 * shared with PHP web. `lt_user_credentials` is a derived cache — see
 * `docs/audit/09-pre-p1-addendum.md` §A.
 */

// ── login_users ─────────────────────────────────────────────

// PERF-02 — split the OR-lookup into two indexed queries. `WHERE username=? OR email=?`
// cannot use either index; two lookups use `username` (unique) and `ix_email` respectively.
async function findUserByUsernameOrEmail(identifier, conn = pool) {
  const cols = 'user_id, user_level, restricted, username, name, email, password, ltrafficid, team, name1, onboarding';
  const [byUsername] = await conn.query(
    `SELECT ${cols} FROM ${LEGACY.LOGIN_USERS} WHERE username = :id LIMIT 1`,
    { id: identifier },
  );
  if (byUsername[0]) return byUsername[0];
  const [byEmail] = await conn.query(
    `SELECT ${cols} FROM ${LEGACY.LOGIN_USERS} WHERE email = :id LIMIT 1`,
    { id: identifier },
  );
  return byEmail[0] || null;
}

async function findUserByEmail(email, conn = pool) {
  const [rows] = await conn.query(
    `SELECT user_id, username, email, name FROM ${LEGACY.LOGIN_USERS} WHERE email = :email LIMIT 1`,
    { email },
  );
  return rows[0] || null;
}

async function findUserById(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT user_id, user_level, restricted, username, name, email, password, ltrafficid, team, name1, onboarding
       FROM ${LEGACY.LOGIN_USERS}
      WHERE user_id = :id
      LIMIT 1`,
    { id: userId },
  );
  return rows[0] || null;
}

async function updateUserPasswordMd5(userId, md5Hash, conn = pool) {
  await conn.query(
    `UPDATE ${LEGACY.LOGIN_USERS} SET password = :hash WHERE user_id = :id`,
    { hash: md5Hash, id: userId },
  );
}

// PHP-02 — mirror PHP `forgot.class.php:105`. On successful reset, PHP clears
// any pending 2FA token/timestamp so a legit reset invalidates in-flight 2FA state.
async function clearTwoFactorState(userId, conn = pool) {
  await conn.query(
    `UPDATE ${LEGACY.LOGIN_USERS}
        SET tmp_auth_token = NULL, sms_time = NULL
      WHERE user_id = :id`,
    { id: userId },
  );
}

// ── login_timestamps ────────────────────────────────────────

async function recordLogin(userId, ip, conn = pool) {
  await conn.query(
    `INSERT INTO ${LEGACY.LOGIN_TIMESTAMPS} (user_id, ip) VALUES (:userId, :ip)`,
    { userId, ip: ip || '' },
  );
}

// ── lt_user_credentials (bcrypt cache) ──────────────────────

async function findCredentialsByUserId(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT user_id, bcrypt_hash, md5_snapshot, updated_at
       FROM ${NEW.USER_CREDENTIALS} WHERE user_id = :id LIMIT 1`,
    { id: userId },
  );
  return rows[0] || null;
}

async function upsertCredentials(userId, bcryptHash, md5Snapshot, conn = pool) {
  await conn.query(
    `INSERT INTO ${NEW.USER_CREDENTIALS} (user_id, bcrypt_hash, md5_snapshot)
     VALUES (:userId, :bcryptHash, :md5Snapshot)
     ON DUPLICATE KEY UPDATE bcrypt_hash = VALUES(bcrypt_hash),
                             md5_snapshot = VALUES(md5_snapshot)`,
    { userId, bcryptHash, md5Snapshot },
  );
}

async function deleteCredentials(userId, conn = pool) {
  await conn.query(`DELETE FROM ${NEW.USER_CREDENTIALS} WHERE user_id = :id`, { id: userId });
}

// ── lt_refresh_tokens ───────────────────────────────────────

async function insertRefreshToken(row, conn = pool) {
  await conn.query(
    `INSERT INTO ${NEW.REFRESH_TOKENS}
       (user_id, token_hash, device_id, user_agent, ip, expires_at)
     VALUES (:user_id, :token_hash, :device_id, :user_agent, :ip, :expires_at)`,
    row,
  );
}

async function findRefreshTokenByHash(tokenHash, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, user_id, token_hash, device_id, expires_at, revoked_at
       FROM ${NEW.REFRESH_TOKENS} WHERE token_hash = :h LIMIT 1`,
    { h: tokenHash },
  );
  return rows[0] || null;
}

async function revokeRefreshTokenById(id, conn = pool) {
  await conn.query(
    `UPDATE ${NEW.REFRESH_TOKENS} SET revoked_at = CURRENT_TIMESTAMP
      WHERE id = :id AND revoked_at IS NULL`,
    { id },
  );
}

async function revokeAllRefreshTokensForUser(userId, conn = pool) {
  await conn.query(
    `UPDATE ${NEW.REFRESH_TOKENS} SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = :id AND revoked_at IS NULL`,
    { id: userId },
  );
}

// ── login_confirm (forgot/reset — parity with PHP) ──────────

async function insertConfirmRow(row, conn = pool) {
  await conn.query(
    `INSERT INTO ${LEGACY.LOGIN_CONFIRM} (data, username, email, \`key\`, type)
     VALUES (:data, :username, :email, :key, :type)`,
    row,
  );
}

// PHP-01 — mirror PHP `forgot.class.php:230-233`. Wipe any prior outstanding
// reset rows for this email+type before issuing a new key. Prevents multiple
// simultaneously-valid reset links.
async function deleteConfirmByEmailAndType(email, type, conn = pool) {
  await conn.query(
    `DELETE FROM ${LEGACY.LOGIN_CONFIRM} WHERE email = :email AND type = :type`,
    { email, type },
  );
}

async function findConfirmByKeyAndType(key, type, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, data, username, email, \`key\`, type FROM ${LEGACY.LOGIN_CONFIRM}
      WHERE \`key\` = :key AND type = :type LIMIT 1`,
    { key, type },
  );
  return rows[0] || null;
}

async function deleteConfirmById(id, conn = pool) {
  await conn.query(`DELETE FROM ${LEGACY.LOGIN_CONFIRM} WHERE id = :id`, { id });
}

module.exports = {
  findUserByUsernameOrEmail,
  findUserByEmail,
  findUserById,
  updateUserPasswordMd5,
  clearTwoFactorState,
  recordLogin,
  findCredentialsByUserId,
  upsertCredentials,
  deleteCredentials,
  insertRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshTokenById,
  revokeAllRefreshTokensForUser,
  insertConfirmRow,
  deleteConfirmByEmailAndType,
  findConfirmByKeyAndType,
  deleteConfirmById,
};

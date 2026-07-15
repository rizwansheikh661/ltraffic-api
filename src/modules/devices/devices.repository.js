'use strict';

const { pool } = require('../../config/db');
const { NEW } = require('../../constants/tables');

async function upsertDeviceToken({ userId, token, platform, appVersion }, conn = pool) {
  // ON DUPLICATE KEY on `token`: same physical device (which owns the token)
  // may re-register under a different user after re-login. Reassign the row
  // to the current user and clear any prior revocation.
  await conn.query(
    `INSERT INTO ${NEW.DEVICE_TOKENS} (user_id, token, platform, app_version)
     VALUES (:userId, :token, :platform, :appVersion)
     ON DUPLICATE KEY UPDATE
       user_id     = VALUES(user_id),
       platform    = VALUES(platform),
       app_version = VALUES(app_version),
       last_seen_at = CURRENT_TIMESTAMP,
       revoked_at  = NULL`,
    { userId, token, platform, appVersion: appVersion || null },
  );
}

async function revokeDeviceToken({ userId, token }, conn = pool) {
  const [result] = await conn.query(
    `UPDATE ${NEW.DEVICE_TOKENS}
        SET revoked_at = CURRENT_TIMESTAMP
      WHERE token = :token AND user_id = :userId AND revoked_at IS NULL`,
    { token, userId },
  );
  return result.affectedRows > 0;
}

async function listActiveTokensForUser(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, token, platform, app_version, created_at, last_seen_at
       FROM ${NEW.DEVICE_TOKENS}
      WHERE user_id = :userId AND revoked_at IS NULL
      ORDER BY last_seen_at DESC`,
    { userId },
  );
  return rows;
}

module.exports = { upsertDeviceToken, revokeDeviceToken, listActiveTokensForUser };

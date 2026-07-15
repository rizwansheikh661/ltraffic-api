'use strict';

const { pool } = require('../config/db');
const { NEW } = require('../constants/tables');
const logger = require('../config/logger');

/**
 * Append-only audit trail. Every write to a legacy or new table that reflects
 * a business action (login, timesheet.approve, incident.close, etc.) should
 * call `audit(...)`. Best-effort: failures are logged but never propagated to
 * the request path, because losing a request over an audit failure is worse
 * than a gap in the log.
 */

async function audit({ req, action, entity, entityId = null, before = null, after = null }) {
  const userId = req?.user?.id ?? null;
  const requestId = req?.requestId ?? null;
  const ip = req?.ip ?? null;
  const userAgent = req?.headers?.['user-agent']?.slice(0, 255) ?? null;

  try {
    await pool.query(
      `INSERT INTO ${NEW.AUDIT_LOGS}
        (user_id, action, entity, entity_id, before_json, after_json, request_id, ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        action,
        entity,
        entityId != null ? String(entityId) : null,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        requestId,
        ip,
        userAgent,
      ],
    );
  } catch (err) {
    logger.warn('[audit] failed to persist entry', {
      requestId,
      action,
      entity,
      entityId,
      error: err.message,
    });
  }
}

module.exports = { audit };

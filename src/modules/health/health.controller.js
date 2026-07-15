'use strict';

const { ping } = require('../../config/db');
const { isEnabled: fcmEnabled } = require('../../config/firebase');
const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');

const bootTime = Date.now();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Liveness + dependency health check
 *     security: []
 *     responses:
 *       200:
 *         description: All good
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 */
const check = asyncHandler(async (_req, res) => {
  let dbOk = false;
  let dbError = null;
  try {
    dbOk = await ping();
  } catch (err) {
    dbError = err.message;
  }

  return ok(res, {
    status: dbOk ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '0.1.0',
    uptimeSec: Math.round((Date.now() - bootTime) / 1000),
    dependencies: {
      db: { ok: dbOk, error: dbError },
      fcm: { enabled: fcmEnabled() },
    },
  });
});

module.exports = { check };

'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ERROR_CODES = require('../constants/errorCodes');

function build({ windowMs, max, prefix, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Too many requests — please slow down.',
          details: { prefix },
          requestId: req.requestId,
        },
      });
    },
  });
}

const global = build({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  prefix: 'global',
});

const auth = build({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  prefix: 'auth',
});

// SEC-05 — per-account limiter. Keyed by the login identifier (username or email) so
// distributed password stuffing against one account is bounded regardless of IP rotation.
// Budget is intentionally tight: 5 attempts per 15 minutes per account.
const loginByAccount = build({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: 5,
  prefix: 'login-account',
  keyGenerator: (req) => {
    const b = (req.body || {});
    const raw = b.identifier || b.username || b.email || '';
    return `account:${String(raw).trim().toLowerCase()}`;
  },
});

// SEC-05 — per-user limiter for authenticated password change. Prevents a bearer-token
// holder from hammering the endpoint (bcrypt is expensive).
const changePasswordByUser = build({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: 5,
  prefix: 'change-pw-user',
  keyGenerator: (req) => `user:${req.user?.id || req.ip}`,
});

module.exports = { global, auth, loginByAccount, changePasswordByUser };

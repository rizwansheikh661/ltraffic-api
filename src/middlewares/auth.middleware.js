'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../common/apiError');
const ERROR_CODES = require('../constants/errorCodes');
const { userTypeFor } = require('../constants/roles');
const authRepository = require('../modules/auth/auth.repository');

function extractToken(req) {
  // SEC-02 — Bearer header ONLY. Query-string tokens leak into web-server access logs and Referer.
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('Missing bearer token'));

  let payload;
  try {
    // SEC-03 — pin algorithm + issuer to guard against algorithm-confusion attacks.
    payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'ltraffic-api',
    });
  } catch (err) {
    const code = err && err.name === 'TokenExpiredError'
      ? ERROR_CODES.AUTH_TOKEN_EXPIRED
      : ERROR_CODES.AUTH_TOKEN_INVALID;
    return next(ApiError.unauthorized('Invalid or expired token', code));
  }

  const userType = payload.userType || userTypeFor(payload.level);
  if (!userType) return next(ApiError.forbidden('Unknown level', ERROR_CODES.AUTH_LEVEL_UNKNOWN));

  req.user = {
    id: Number(payload.sub),
    ltrafficid: payload.ltrafficid || null,
    level: Number(payload.level),
    userType,
    name: payload.name || null,
  };

  try {
    const accessState = await authRepository.findUserAccessState(req.user.id);
    if (!accessState) return next(ApiError.unauthorized('User account no longer exists'));
    if (Number(accessState.restricted) === 1) {
      return next(ApiError.forbidden('This user account is restricted', ERROR_CODES.AUTH_USER_DISABLED));
    }
  } catch (err) {
    return next(err);
  }
  return next();
}

module.exports = { authenticate };

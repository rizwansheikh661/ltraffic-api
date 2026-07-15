'use strict';

const logger = require('../config/logger');
const env = require('../config/env');
const ApiError = require('../common/apiError');
const ERROR_CODES = require('../constants/errorCodes');

// Map common third-party error shapes to ApiError for uniform responses.
function normalise(err) {
  if (err instanceof ApiError) return err;

  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new ApiError(413, ERROR_CODES.UPLOAD_TOO_LARGE, 'Uploaded file exceeds maximum size');
    }
    return new ApiError(400, ERROR_CODES.BAD_REQUEST, `Upload error: ${err.message}`);
  }

  if (err && err.type === 'entity.too.large') {
    return new ApiError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, 'Request payload too large');
  }

  if (err && err.type === 'entity.parse.failed') {
    return new ApiError(400, ERROR_CODES.BAD_REQUEST, 'Malformed JSON body');
  }

  if (err && err.code === 'ECONNREFUSED') {
    return new ApiError(503, ERROR_CODES.DB_UNAVAILABLE, 'Database unavailable');
  }

  // SEC-07 — never leak internal error messages to clients. The full error is still
  // captured in the log (requestId links log <-> response). Non-ApiError throws produce
  // a generic message to callers, regardless of env.
  return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error');
}

// Express requires the 4-arg signature to recognise this as an error handler.
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, _next) {
  const api = normalise(err);
  const isServerError = api.status >= 500;

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status: api.status,
    code: api.code,
    userId: req.user?.id,
  };

  if (isServerError) {
    logger.error(api.message, { ...logPayload, stack: err?.stack });
  } else {
    logger.warn(api.message, logPayload);
  }

  const body = {
    success: false,
    error: {
      code: api.code,
      message: api.message,
      details: api.details,
      requestId: req.requestId,
    },
  };

  // Do not leak stack traces to clients in production.
  if (env.NODE_ENV !== 'production' && isServerError && err?.stack) {
    body.error.stack = err.stack.split('\n');
  }

  res.status(api.status).json(body);
}

module.exports = errorMiddleware;

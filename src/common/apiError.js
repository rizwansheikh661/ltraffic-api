'use strict';

const ERROR_CODES = require('../constants/errorCodes');

class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request', details = null) {
    return new ApiError(400, ERROR_CODES.BAD_REQUEST, message, details);
  }

  static validation(message = 'Validation failed', details = null) {
    return new ApiError(422, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'Unauthorized', code = ERROR_CODES.UNAUTHORIZED) {
    return new ApiError(401, code, message);
  }

  static forbidden(message = 'Forbidden', code = ERROR_CODES.FORBIDDEN) {
    return new ApiError(403, code, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message = 'Conflict', details = null) {
    return new ApiError(409, ERROR_CODES.CONFLICT, message, details);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}

module.exports = ApiError;

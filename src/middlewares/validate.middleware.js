'use strict';

const { ZodError } = require('zod');
const { validationResult } = require('express-validator');
const ApiError = require('../common/apiError');

/**
 * Two validation styles are supported so modules can pick the right tool:
 *
 * 1) Zod (preferred for structured DTOs):
 *      router.post('/x', validate({ body: BodySchema, query: QuerySchema, params: ParamsSchema }), handler)
 *    The parsed/coerced values replace req.body/query/params so downstream code sees clean data.
 *
 * 2) express-validator (kept for parity with the legacy codebase):
 *      router.post('/x', [check('foo').isString()], validateExpressResult, handler)
 */

function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.validation('Request validation failed', err.flatten()));
      }
      return next(err);
    }
  };
}

function validateExpressResult(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return next(ApiError.validation('Request validation failed', result.array()));
}

module.exports = { validate, validateExpressResult };

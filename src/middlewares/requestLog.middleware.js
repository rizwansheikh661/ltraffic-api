'use strict';

const logger = require('../config/logger');

const SKIP_PATHS = new Set(['/api/v1/health']);

function requestLog(req, res, next) {
  if (SKIP_PATHS.has(req.originalUrl)) return next();
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
    logger.info('request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      userId: req.user?.id,
      userType: req.user?.userType,
      ip: req.ip,
    });
  });

  return next();
}

module.exports = requestLog;

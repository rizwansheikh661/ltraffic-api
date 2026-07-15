'use strict';

function ok(res, data = null, meta = undefined) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.json(body);
}

function created(res, data = null) {
  return res.status(201).json({ success: true, data });
}

function noContent(res) {
  return res.status(204).end();
}

function fail(res, status, code, message, details = null, requestId = undefined) {
  return res.status(status).json({
    success: false,
    error: { code, message, details, requestId },
  });
}

module.exports = { ok, created, noContent, fail };

'use strict';

const { v4: uuidv4 } = require('uuid');

const HEADER = 'x-request-id';

function requestId(req, res, next) {
  const incoming = req.headers[HEADER];
  const id = typeof incoming === 'string' && incoming.length <= 64 ? incoming : uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestId;

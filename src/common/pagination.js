'use strict';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parse(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function meta({ page, limit }, total) {
  return { page, limit, total: Number(total) || 0 };
}

module.exports = { parse, meta, DEFAULT_LIMIT, MAX_LIMIT };

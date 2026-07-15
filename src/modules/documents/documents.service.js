'use strict';

const repo = require('./documents.repository');
const { formatDocument } = require('./documents.dto');
const ApiError = require('../../common/apiError');

async function getAll(type, query) {
  const { rows, total } = await repo.findAll(type, query);
  return { data: rows.map((r) => formatDocument(type, r)), total };
}

async function getById(type, id) {
  const row = await repo.findById(type, id);
  if (!row) throw ApiError.notFound('Document not found');
  return formatDocument(type, row);
}

async function create(type, body) {
  const id = await repo.create(type, body);
  const row = await repo.findById(type, id);
  return formatDocument(type, row);
}

async function update(type, id, fields) {
  const existing = await repo.findById(type, id);
  if (!existing) throw ApiError.notFound('Document not found');
  await repo.update(type, id, fields);
  const row = await repo.findById(type, id);
  return formatDocument(type, row);
}

async function remove(type, id) {
  const deleted = await repo.remove(type, id);
  if (!deleted) throw ApiError.notFound('Document not found');
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};

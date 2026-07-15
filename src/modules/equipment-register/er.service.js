'use strict';

const ApiError = require('../../common/apiError');
const repo = require('./er.repository');

async function getAll({ search, limit, offset }) {
  const { rows, total } = await repo.findAll({ search, limit, offset });
  return { data: rows, total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Equipment register entry not found');
  return row;
}

async function createEntry(fields) {
  const id = await repo.create(fields);
  return repo.findById(id);
}

async function updateEntry(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Equipment register entry not found');
  await repo.update(id, fields);
  return repo.findById(id);
}

async function removeEntry(id) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Equipment register entry not found');
  await repo.remove(id);
}

async function getDocuments({ erId, search, limit, offset }) {
  const existing = await repo.findById(erId);
  if (!existing) throw ApiError.notFound('Equipment register entry not found');
  return repo.findDocuments({ erId, search, limit, offset });
}

async function uploadDocument(erId, submittedby, fileName, doctype, docdesc) {
  const existing = await repo.findById(erId);
  if (!existing) throw ApiError.notFound('Equipment register entry not found');
  const docId = await repo.insertDocument({ erId, submittedby, fileName, doctype, docdesc });
  return { id: docId };
}

async function removeDocument(erId, docId) {
  const existing = await repo.findById(erId);
  if (!existing) throw ApiError.notFound('Equipment register entry not found');
  const doc = await repo.findDocumentById(docId);
  if (!doc || String(doc.name) !== String(erId)) {
    throw ApiError.notFound('Document not found');
  }
  await repo.removeDocument(docId);
}

module.exports = {
  getAll,
  getById,
  createEntry,
  updateEntry,
  removeEntry,
  getDocuments,
  uploadDocument,
  removeDocument,
};

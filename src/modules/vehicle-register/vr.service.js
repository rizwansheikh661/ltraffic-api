'use strict';

const ApiError = require('../../common/apiError');
const repo = require('./vr.repository');

async function getAll({ search, archived, limit, offset }) {
  const { rows, total } = await repo.findAll({ search, archived, limit, offset });
  return { data: rows, total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Vehicle register entry not found');
  return row;
}

async function createEntry(fields) {
  const id = await repo.create(fields);
  return repo.findById(id);
}

async function updateEntry(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Vehicle register entry not found');
  await repo.update(id, fields);
  return repo.findById(id);
}

async function removeEntry(id) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Vehicle register entry not found');
  await repo.remove(id);
}

async function getDocuments({ vrId, search, limit, offset }) {
  const existing = await repo.findById(vrId);
  if (!existing) throw ApiError.notFound('Vehicle register entry not found');
  return repo.findDocuments({ vrId, search, limit, offset });
}

async function uploadDocument(vrId, submittedby, fileName, doctype, docdesc) {
  const existing = await repo.findById(vrId);
  if (!existing) throw ApiError.notFound('Vehicle register entry not found');
  const docId = await repo.insertDocument({ vrId, submittedby, fileName, doctype, docdesc });
  return { id: docId };
}

async function removeDocument(vrId, docId) {
  const existing = await repo.findById(vrId);
  if (!existing) throw ApiError.notFound('Vehicle register entry not found');
  const doc = await repo.findDocumentById(docId);
  if (!doc || String(doc.name) !== String(vrId)) {
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

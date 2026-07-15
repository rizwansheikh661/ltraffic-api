'use strict';

const ApiError = require('../../common/apiError');
const repo = require('./pr.repository');

async function getAll({ search, limit, offset }) {
  const { rows, total } = await repo.findAll({ search, limit, offset });
  return { data: rows, total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Plant register entry not found');
  return row;
}

async function createEntry(fields) {
  const id = await repo.create(fields);
  return repo.findById(id);
}

async function updateEntry(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Plant register entry not found');
  await repo.update(id, fields);
  return repo.findById(id);
}

async function removeEntry(id) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Plant register entry not found');
  await repo.remove(id);
}

async function getDocuments({ prId, search, limit, offset }) {
  const existing = await repo.findById(prId);
  if (!existing) throw ApiError.notFound('Plant register entry not found');
  return repo.findDocuments({ prId, search, limit, offset });
}

async function uploadDocument(prId, submittedby, fileName, doctype, docdesc) {
  const existing = await repo.findById(prId);
  if (!existing) throw ApiError.notFound('Plant register entry not found');
  const docId = await repo.insertDocument({ prId, submittedby, fileName, doctype, docdesc });
  return { id: docId };
}

async function removeDocument(prId, docId) {
  const existing = await repo.findById(prId);
  if (!existing) throw ApiError.notFound('Plant register entry not found');
  const doc = await repo.findDocumentById(docId);
  if (!doc || String(doc.name) !== String(prId)) {
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

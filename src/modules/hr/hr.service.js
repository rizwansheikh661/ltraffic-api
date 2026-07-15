'use strict';

const repo = require('./hr.repository');
const { formatEmployee, formatEmployeeSummary, formatDocument } = require('./hr.dto');
const ApiError = require('../../common/apiError');

// ── Employee list/view ─────────────────────────────────────────

async function getAll(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatEmployeeSummary), total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Employee not found');
  return formatEmployee(row);
}

// ── Admin write ────────────────────────────────────────────────

async function updateEmployee(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Employee not found');
  await repo.update(id, fields);
  const row = await repo.findById(id);
  return formatEmployee(row);
}

async function removeEmployee(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Employee not found');
}

// ── Documents ──────────────────────────────────────────────────

async function getDocuments(employeeId, query) {
  const check = await repo.findById(employeeId);
  if (!check) throw ApiError.notFound('Employee not found');
  const { rows, total } = await repo.findDocuments(employeeId, query);
  return { data: rows.map(formatDocument), total };
}

async function uploadDocument(employeeId, submittedby, doctype, docdesc, fileName) {
  const check = await repo.findById(employeeId);
  if (!check) throw ApiError.notFound('Employee not found');
  const docId = await repo.insertDocument({ employeeId, submittedby, doctype, docdesc, fileName });
  return { id: docId };
}

async function removeDocument(employeeId, docId) {
  const check = await repo.findById(employeeId);
  if (!check) throw ApiError.notFound('Employee not found');
  const deleted = await repo.removeDocument(docId);
  if (!deleted) throw ApiError.notFound('Document not found');
}

module.exports = {
  getAll,
  getById,
  updateEmployee,
  removeEmployee,
  getDocuments,
  uploadDocument,
  removeDocument,
};

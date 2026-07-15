'use strict';

const ApiError = require('../../common/apiError');
const { formatArrivalDatetime } = require('../../utils/date.helper');
const repo = require('./ec.repository');

// ── Employee ──────────────────────────────────────────────────

async function submitCheck(operativesname, fields, imagePath) {
  const data = {
    operativesname,
    description: fields.description,
    ident: fields.ident,
    arrival_datetime: formatArrivalDatetime(),
    brakes: fields.brakes,
    steering: fields.steering,
    seatbelt: fields.seatbelt,
    mirrors: fields.mirrors,
    tyres: fields.tyres,
    wheelsecurity: fields.wheelsecurity,
    rotatingbeacon: fields.rotatingbeacon,
    horn: fields.horn,
    warninglights: fields.warninglights,
    coolant: fields.coolant,
    seat: fields.seat,
    access: fields.access,
    fuel: fields.fuel,
    cond: fields.cond,
    safe: fields.safe,
    report: fields.report || '',
    image: imagePath,
  };
  const id = await repo.create(data);
  return repo.findById(id);
}

async function getOwnChecks(operativesname, { search, limit, offset }) {
  return repo.findByOperative(operativesname, { search, limit, offset });
}

async function getOwnCheckById(operativesname, id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Equipment check not found');
  if (row.operativesname !== operativesname) {
    throw ApiError.notFound('Equipment check not found');
  }
  return row;
}

// ── Admin ─────────────────────────────────────────────────────

async function getAll({ search, limit, offset }) {
  return repo.findAll({ search, limit, offset });
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Equipment check not found');
  return row;
}

async function updateCheck(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Equipment check not found');
  await repo.update(id, fields);
  return repo.findById(id);
}

async function removeCheck(id) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Equipment check not found');
  await repo.remove(id);
}

// ── Documents ─────────────────────────────────────────────────

async function getDocuments(checkId, { search, limit, offset }) {
  const existing = await repo.findById(checkId);
  if (!existing) throw ApiError.notFound('Equipment check not found');
  return repo.findDocuments(checkId, { search, limit, offset });
}

async function uploadDocument(checkId, submittedby, fileName, docdesc) {
  const existing = await repo.findById(checkId);
  if (!existing) throw ApiError.notFound('Equipment check not found');
  const docId = await repo.insertDocument({ checkId, submittedby, fileName, docdesc });
  return { id: docId };
}

async function removeDocument(checkId, docId) {
  const existing = await repo.findById(checkId);
  if (!existing) throw ApiError.notFound('Equipment check not found');
  const doc = await repo.findDocumentById(docId);
  if (!doc || String(doc.name) !== String(checkId)) {
    throw ApiError.notFound('Document not found');
  }
  await repo.removeDocument(docId);
}

module.exports = {
  submitCheck,
  getOwnChecks,
  getOwnCheckById,
  getAll,
  getById,
  updateCheck,
  removeCheck,
  getDocuments,
  uploadDocument,
  removeDocument,
};

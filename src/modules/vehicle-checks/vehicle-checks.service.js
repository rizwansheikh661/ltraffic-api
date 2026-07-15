'use strict';

const repo = require('./vehicle-checks.repository');
const { formatVehicleCheck, formatVehicleCheckSummary, formatDocument } = require('./vehicle-checks.dto');
const ApiError = require('../../common/apiError');
const { toMysqlDatetime } = require('../../utils/date.helper');

const THROTTLE_HOURS = 8;

// ── Employee ──────────────────────────────────────────────────

async function createCheck(drivername, body) {
  const lastTime = await repo.getLastSubmissionTime(drivername);
  if (lastTime) {
    const last = new Date(lastTime);
    const diffMs = Date.now() - last.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < THROTTLE_HOURS) {
      throw ApiError.badRequest(
        `You can only submit one vehicle check every ${THROTTLE_HOURS} hours. Please try again later.`,
      );
    }
  }

  const now = toMysqlDatetime(new Date());
  const data = { ...body, drivername, arrival_datetime: now };
  const id = await repo.create(data);
  const row = await repo.findById(id);
  return formatVehicleCheck(row);
}

async function getMyChecks(drivername, query) {
  const { rows, total } = await repo.findByDriver(drivername, query);
  return { data: rows.map(formatVehicleCheckSummary), total };
}

async function getMyCheckById(drivername, id) {
  const row = await repo.findById(id);
  if (!row || row.drivername !== drivername) {
    throw ApiError.notFound('Vehicle check not found');
  }
  return formatVehicleCheck(row);
}

// ── Admin ─────────────────────────────────────────────────────

async function getAll(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatVehicleCheckSummary), total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Vehicle check not found');
  return formatVehicleCheck(row);
}

async function adminCreate(body) {
  const now = toMysqlDatetime(new Date());
  const data = { ...body, arrival_datetime: now };
  const id = await repo.adminCreate(data);
  const row = await repo.findById(id);
  return formatVehicleCheck(row);
}

async function update(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Vehicle check not found');
  await repo.update(id, fields);
  const row = await repo.findById(id);
  return formatVehicleCheck(row);
}

async function remove(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Vehicle check not found');
}

// ── Documents ─────────────────────────────────────────────────

async function getDocuments(vehicleCheckId) {
  const check = await repo.findById(vehicleCheckId);
  if (!check) throw ApiError.notFound('Vehicle check not found');
  const rows = await repo.findDocuments(vehicleCheckId);
  return rows.map(formatDocument);
}

async function uploadDocument(vehicleCheckId, submittedby, fileName) {
  const check = await repo.findById(vehicleCheckId);
  if (!check) throw ApiError.notFound('Vehicle check not found');
  const docId = await repo.insertDocument({ vehicleCheckId, submittedby, fileName });
  return { id: docId };
}

async function removeDocument(vehicleCheckId, docId) {
  const check = await repo.findById(vehicleCheckId);
  if (!check) throw ApiError.notFound('Vehicle check not found');
  const deleted = await repo.removeDocument(docId);
  if (!deleted) throw ApiError.notFound('Document not found');
}

module.exports = {
  createCheck,
  getMyChecks,
  getMyCheckById,
  getAll,
  getById,
  adminCreate,
  update,
  remove,
  getDocuments,
  uploadDocument,
  removeDocument,
};

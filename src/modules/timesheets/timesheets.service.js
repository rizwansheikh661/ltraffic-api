'use strict';

const repo = require('./timesheets.repository');
const { formatTimesheet, formatTimesheetSummary } = require('./timesheets.dto');
const ApiError = require('../../common/apiError');
const { TIMESHEET_STATUS } = require('../../constants/status');

// ── Helpers ───────────────────────────────────────────────────

function flattenForDb(body, user, status) {
  const { week, days = [], comments = '' } = body;
  const flat = { week, ltrafficid: user.ltrafficid, name: user.name, comments, status };
  for (let i = 0; i < 7; i += 1) {
    const d = days[i] || {};
    flat[`date${i + 1}`] = d.date || '';
    flat[`hours${i + 1}`] = d.hours || '0';
    flat[`location${i + 1}`] = d.location || '';
    flat[`activity${i + 1}`] = d.activity || '';
    flat[`contract${i + 1}`] = d.contract || '';
  }
  return flat;
}

function flattenForDbAdmin(body) {
  const { name, ltrafficid = '', week, days = [], comments = '' } = body;
  const flat = { week, ltrafficid, name, comments, status: TIMESHEET_STATUS.SUBMITTED };
  for (let i = 0; i < 7; i += 1) {
    const d = days[i] || {};
    flat[`date${i + 1}`] = d.date || '';
    flat[`hours${i + 1}`] = d.hours || '0';
    flat[`location${i + 1}`] = d.location || '';
    flat[`activity${i + 1}`] = d.activity || '';
    flat[`contract${i + 1}`] = d.contract || '';
  }
  return flat;
}

// ── Employee ──────────────────────────────────────────────────

async function submitTimesheet(user, body) {
  const data = flattenForDb(body, user, TIMESHEET_STATUS.SUBMITTED);
  const id = await repo.create(data);
  const row = await repo.findById(id);
  return formatTimesheet(row);
}

async function saveDraft(user, body) {
  const data = flattenForDb(body, user, TIMESHEET_STATUS.DRAFT);
  const id = await repo.create(data);
  const row = await repo.findById(id);
  return formatTimesheet(row);
}

async function getMyTimesheets(ltrafficid, query) {
  const { rows, total } = await repo.findByUser(ltrafficid, query);
  return { data: rows.map(formatTimesheetSummary), total };
}

async function getMyTimesheetById(ltrafficid, id) {
  const row = await repo.findById(id);
  if (!row || row.ltrafficid !== ltrafficid) {
    throw ApiError.notFound('Timesheet not found');
  }
  return formatTimesheet(row);
}

// ── Admin ─────────────────────────────────────────────────────

async function getAll(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatTimesheetSummary), total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Timesheet not found');
  return formatTimesheet(row);
}

async function adminCreate(body) {
  const data = flattenForDbAdmin(body);
  const id = await repo.create(data);
  const row = await repo.findById(id);
  return formatTimesheet(row);
}

async function approve(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Timesheet not found');
  await repo.updateStatus(id, TIMESHEET_STATUS.APPROVED);
  const updated = await repo.findById(id);
  return formatTimesheet(updated);
}

async function reject(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Timesheet not found');
  await repo.updateStatus(id, TIMESHEET_STATUS.REJECTED);
  const updated = await repo.findById(id);
  return formatTimesheet(updated);
}

async function remove(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Timesheet not found');
}

module.exports = {
  submitTimesheet,
  saveDraft,
  getMyTimesheets,
  getMyTimesheetById,
  getAll,
  getById,
  adminCreate,
  approve,
  reject,
  remove,
};

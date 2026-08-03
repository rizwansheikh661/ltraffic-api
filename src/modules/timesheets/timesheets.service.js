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
  const existing = await repo.findLatestEditableByUserAndWeek(user.ltrafficid, body.week);
  const id = existing ? existing.id : await repo.create(data);
  if (existing) await repo.updateSubmission(id, data);
  const row = await repo.findById(id);
  return {
    ...formatTimesheet(row),
    submission_action: existing ? 'updated' : 'created',
  };
}

async function saveDraft(user, body) {
  const data = flattenForDb(body, user, TIMESHEET_STATUS.DRAFT);
  const existing = await repo.findLatestEditableByUserAndWeek(user.ltrafficid, body.week);
  // Do not turn an already-submitted pending sheet back into a draft if an
  // older mobile client still calls this endpoint.
  const draft = existing?.status === TIMESHEET_STATUS.DRAFT ? existing : null;
  const id = draft ? draft.id : await repo.create(data);
  if (draft) await repo.updateSubmission(id, data);
  const row = await repo.findById(id);
  return {
    ...formatTimesheet(row),
    submission_action: draft ? 'updated' : 'created',
  };
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

async function listOptions(query) {
  return repo.findOptions(query);
}

async function createOption(fields) {
  const existing = await repo.findOptionByTypeAndName(fields.type, fields.name);
  if (existing) throw ApiError.conflict('A timesheet option with this name already exists');
  const id = await repo.createOption(fields);
  return repo.findOptionById(id);
}

async function updateOption(id, fields) {
  const existing = await repo.findOptionById(id);
  if (!existing) throw ApiError.notFound('Timesheet option not found');
  if (fields.name && fields.name !== existing.name) {
    const duplicate = await repo.findOptionByTypeAndName(existing.type, fields.name);
    if (duplicate) throw ApiError.conflict('A timesheet option with this name already exists');
  }
  await repo.updateOption(id, fields);
  return repo.findOptionById(id);
}

async function deactivateOption(id) {
  return updateOption(id, { is_active: false });
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
  listOptions,
  createOption,
  updateOption,
  deactivateOption,
};

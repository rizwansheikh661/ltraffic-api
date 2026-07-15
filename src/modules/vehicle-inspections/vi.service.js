'use strict';

const ApiError = require('../../common/apiError');
const { formatArrivalDatetime } = require('../../utils/date.helper');
const repo = require('./vi.repository');

// ── Employee — VIC ──────────────────────────────────────────

async function createPart1(user, body, imagePath) {
  const vr = await repo.findVrById(body.vrId);
  if (!vr) throw ApiError.notFound('Vehicle record not found');

  const data = {
    vic1: user.name,
    vic2: vr.reg || '',
    vic3: body.vic3 || '',
    vic4: formatArrivalDatetime(),
    vic5: body.vic5 || 'Pass', vic6: body.vic6 || 'Pass', vic7: body.vic7 || 'Pass',
    vic8: body.vic8 || 'Pass', vic9: body.vic9 || 'Pass', vic10: body.vic10 || 'Pass',
    vic11: body.vic11 || 'Pass', vic12: body.vic12 || 'Pass', vic13: body.vic13 || 'Pass',
    vic14: body.vic14 || 'Pass', vic15: body.vic15 || 'Pass', vic16: body.vic16 || 'Pass',
    vic17: body.vic17 || 'Pass', vic18: body.vic18 || 'Pass', vic19: body.vic19 || 'Pass',
    vic20: body.vic20 || 'Pass', vic21: body.vic21 || 'Pass', vic22: body.vic22 || 'Pass',
    vic23: body.vic23 || 'Pass', vic24: body.vic24 || 'Pass', vic25: body.vic25 || 'Pass',
    vic26: body.vic26 || 'Pass', vic27: body.vic27 || 'Pass', vic28: body.vic28 || 'Pass',
    vic29: body.vic29 || 'Pass', vic30: body.vic30 || 'Pass', vic31: body.vic31 || 'Pass',
    vic32: body.vic32 || 'Pass', vic33: body.vic33 || 'Pass', vic34: body.vic34 || 'Pass',
    vic35: body.vic35 || '',
    vic36: body.vic36 || '',
    status: 'In Progress',
    vrid: String(body.vrId),
    vehid: String(body.vrId),
    type: 'Vehicle Inspection',
    image: imagePath || '',
  };

  const id = await repo.createPart1(data);
  return repo.findById(id);
}

async function submitPart(user, id, partNum, body, imagePath) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Vehicle inspection not found');

  const imageCol = partNum === 2 ? 'image1' : partNum === 3 ? 'image2' : 'image3';
  const completedByCol = partNum === 2 ? 'vic37' : partNum === 3 ? 'vic87' : 'vic101';
  const datetimeCol = partNum === 2 ? 'vic38' : partNum === 3 ? 'vic88' : 'vic102';

  const data = { ...body };
  data[completedByCol] = user.name;
  data[datetimeCol] = formatArrivalDatetime();
  if (imagePath) data[imageCol] = imagePath;

  if (partNum === 4) {
    const name1 = await repo.findUserName1(user.id);
    data.vic109 = `admin/employeesignature/${name1}.jpg`;
    data.status = 'Completed';
  }

  await repo.updatePart(id, partNum, data);
  return repo.findById(id);
}

async function getOwn(userName, opts) {
  return repo.findByUser(userName, opts);
}

async function getOwnById(userName, id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Vehicle inspection not found');
  if (row.vic1 !== userName) throw ApiError.notFound('Vehicle inspection not found');
  return row;
}

// ── Employee — VIR ──────────────────────────────────────────

async function createRepair(user, vicId, body, imagePath) {
  const vic = await repo.findById(vicId);
  if (!vic) throw ApiError.notFound('Vehicle inspection not found');

  const name1 = await repo.findUserName1(user.id);
  const data = {
    vir1: vic.vic2 || '',
    vir2: body.vir2 || '',
    vir3: body.vir3 || '',
    vir4: body.vir4 || '',
    vir5: body.vir5 || 'Yes',
    vir6: body.vir6 || '',
    vir7: body.vir7 || 'Pass',
    vir8: body.vir8 || '',
    vir9: `admin/employeesignature/${name1}.jpg`,
    vir10: user.name,
    vrid: String(vic.id),
    vehid: String(vic.vrid),
    type: 'Inspection Repair',
    status: 'Completed',
    image: imagePath || '',
  };

  const repairId = await repo.createRepair(data);
  return repo.findRepairById(repairId);
}

// ── Admin ─────────────────────────────────────────────────────

async function getAll(opts) {
  return repo.findAll(opts);
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Vehicle inspection not found');
  return row;
}

async function updateInspection(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Vehicle inspection not found');
  await repo.update(id, fields);
  return repo.findById(id);
}

async function removeInspection(id) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Vehicle inspection not found');
  await repo.remove(id);
}

async function getRepairs(vicId) {
  const vic = await repo.findById(vicId);
  if (!vic) throw ApiError.notFound('Vehicle inspection not found');
  return repo.findRepairsByVicId(vicId);
}

async function removeRepair(vicId, repairId) {
  const vic = await repo.findById(vicId);
  if (!vic) throw ApiError.notFound('Vehicle inspection not found');
  const repair = await repo.findRepairById(repairId);
  if (!repair) throw ApiError.notFound('Repair not found');
  await repo.removeRepair(repairId);
}

module.exports = {
  createPart1,
  submitPart,
  getOwn,
  getOwnById,
  createRepair,
  getAll,
  getById,
  updateInspection,
  removeInspection,
  getRepairs,
  removeRepair,
};

'use strict';

const ApiError = require('../../common/apiError');
const { formatArrivalDatetime } = require('../../utils/date.helper');
const repo = require('./wra.repository');

function signaturePath(name) {
  const stripped = name.replace(/\s+/g, '');
  return `admin/employeesignature/${stripped}.jpg`;
}

// ── Employee ──────────────────────────────────────────────────

async function createPart1(user, body, imagePath) {
  const parent = await repo.findParentById(body.wildanetId);
  if (!parent) throw ApiError.notFound('Parent job not found');

  const data = {
    ra1: body.ra1 || 'Wildanet Project',
    ra2: formatArrivalDatetime(),
    ra3: parent.solonumber || '',
    ra4: parent.location || '',
    ra5: user.name,
    ra6: parent.startdate || '',
    ra7: parent.enddate || '',
    ra8: body.ra8,
    ra9: body.ra9,
    ra10: body.ra10,
    ra11: body.ra11,
    ra12: body.ra12 || '',
    civils: String(body.wildanetId),
    client: parent.client || '',
    status: 'In Progress',
    image: imagePath || '',
  };

  const id = await repo.createPart1(data);
  return repo.findById(id);
}

async function submitPart(user, id, partNum, body, imagePath) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Risk assessment not found');

  const imageCol = partNum === 2 ? 'image1'
    : partNum === 3 ? 'image2'
      : partNum === 4 ? 'image3'
        : partNum === 5 ? 'image4' : null;

  const data = { ...body };

  if (partNum === 2) {
    data.ra13 = formatArrivalDatetime();
  } else if (partNum === 3) {
    data.ra30 = formatArrivalDatetime();
  } else if (partNum === 4) {
    data.ra50 = user.name;
    data.ra51 = formatArrivalDatetime();
    data.ra63 = signaturePath(user.name);
  } else if (partNum === 5) {
    data.ra64 = user.name;
    data.ra65 = formatArrivalDatetime();
    data.ra74 = signaturePath(user.name);
    data.status = 'RA Completed';
  }

  if (imagePath) data[imageCol] = imagePath;

  await repo.updatePart(id, partNum, data);
  return repo.findById(id);
}

async function getOwn(userName, opts) {
  return repo.findByUser(userName, opts);
}

async function getOwnById(userName, id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Risk assessment not found');
  if (row.ra5 !== userName) throw ApiError.notFound('Risk assessment not found');
  return row;
}

// ── Admin ─────────────────────────────────────────────────────

async function getAll(opts) {
  return repo.findAll(opts);
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Risk assessment not found');
  return row;
}

async function updateRecord(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Risk assessment not found');
  await repo.update(id, fields);
  return repo.findById(id);
}

async function removeRecord(id) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Risk assessment not found');
  await repo.remove(id);
}

module.exports = {
  createPart1,
  submitPart,
  getOwn,
  getOwnById,
  getAll,
  getById,
  updateRecord,
  removeRecord,
};

'use strict';

const ApiError = require('../../common/apiError');
const { formatArrivalDatetime } = require('../../utils/date.helper');
const repo = require('./si.repository');

// ── Employee ──────────────────────────────────────────────────

async function createPart1(source, user, body, imagePath) {
  const parent = await repo.findParentById(source, body.civilsId);
  if (!parent) throw ApiError.notFound('Parent job not found');

  const data = {
    in1: parent.solonumber || '',
    in2: parent.location || '',
    in3: user.name,
    in4: formatArrivalDatetime(),
    in5: parent.client || '',
    in6: parent.assignedto || '',
    in7: body.in7 || '',
    in8: body.in8 || '',
    status: 'In Progress',
    civilsid: String(body.civilsId),
    image: imagePath || '',
  };

  const id = await repo.createPart1(source, data);
  return repo.findById(source, id);
}

async function submitPart(source, user, id, partNum, body, imagePath) {
  const existing = await repo.findById(source, id);
  if (!existing) throw ApiError.notFound('Inspection not found');

  const imageCol = partNum === 2 ? 'image1'
    : partNum === 3 ? 'image2'
      : partNum === 4 ? 'image3'
        : partNum === 5 ? 'image4'
          : partNum === 6 ? 'image5'
            : partNum === 7 ? 'image6'
              : partNum === 8 ? 'image7' : null;

  const byKey = `by${partNum - 1}`;
  const tiKey = `ti${partNum - 1}`;

  const data = { ...body };
  data[byKey] = user.name;
  data[tiKey] = formatArrivalDatetime();
  if (imagePath) data[imageCol] = imagePath;
  if (partNum === 8) data.status = 'Inspection Awaiting Review';

  await repo.updatePart(source, id, partNum, data);
  return repo.findById(source, id);
}

async function getOwn(source, userName, opts) {
  return repo.findByUser(source, userName, opts);
}

async function getOwnById(source, userName, id) {
  const row = await repo.findById(source, id);
  if (!row) throw ApiError.notFound('Inspection not found');
  if (row.in3 !== userName) throw ApiError.notFound('Inspection not found');
  return row;
}

// ── Admin ─────────────────────────────────────────────────────

async function getAll(source, opts) {
  return repo.findAll(source, opts);
}

async function getById(source, id) {
  const row = await repo.findById(source, id);
  if (!row) throw ApiError.notFound('Inspection not found');
  return row;
}

async function updateInspection(source, id, fields) {
  const existing = await repo.findById(source, id);
  if (!existing) throw ApiError.notFound('Inspection not found');
  await repo.update(source, id, fields);
  return repo.findById(source, id);
}

async function removeInspection(source, id) {
  const existing = await repo.findById(source, id);
  if (!existing) throw ApiError.notFound('Inspection not found');
  await repo.remove(source, id);
}

module.exports = {
  createPart1,
  submitPart,
  getOwn,
  getOwnById,
  getAll,
  getById,
  updateInspection,
  removeInspection,
};

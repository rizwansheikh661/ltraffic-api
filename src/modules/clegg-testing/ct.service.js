'use strict';

const repo = require('./ct.repository');
const ApiError = require('../../common/apiError');
const { fileUrl } = require('../../utils/url.helper');
const { formatArrivalDatetime } = require('../../utils/date.helper');

function formatRecord(row) {
  if (!row) return row;
  const result = { ...row };
  if (result.image) {
    result.image_urls = result.image.split(',').filter(Boolean).map((p) => fileUrl(p.trim()));
  } else {
    result.image_urls = [];
  }
  return result;
}

async function listRecords(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatRecord), total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Clegg test record not found');
  return formatRecord(row);
}

async function createRecord(fields, imagePath) {
  const data = {
    ct1: fields.ct1 || '',
    ct2: fields.ct2,
    ct3: formatArrivalDatetime(),
    ct4: fields.ct4,
    ct5: fields.ct5,
    ct6: fields.ct6,
    ct7: fields.ct7,
    ct8: fields.ct8,
    ct9: fields.ct9,
    ct10: fields.ct10,
    ct11: fields.ct11 || '',
    ct12: fields.ct12 || '',
    ct13: fields.ct13 || '',
    image: imagePath || '',
  };
  const id = await repo.create(data);
  const row = await repo.findById(id);
  return formatRecord(row);
}

async function updateRecord(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Clegg test record not found');
  await repo.update(id, fields);
  const row = await repo.findById(id);
  return formatRecord(row);
}

async function removeRecord(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Clegg test record not found');
}

module.exports = {
  listRecords,
  getById,
  createRecord,
  updateRecord,
  removeRecord,
};

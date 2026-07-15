'use strict';

const repo = require('./wr.repository');
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
  if (!row) throw ApiError.notFound('Work record not found');
  return formatRecord(row);
}

async function createRecord(fields, imagePath) {
  const data = {
    lt1: fields.lt1,
    lt2: formatArrivalDatetime(),
    lt3: fields.lt3,
    lt4: fields.lt4,
    lt5: fields.lt5,
    lt6: fields.lt6,
    lt7: fields.lt7,
    lt8: fields.lt8,
    lt9: fields.lt9,
    lt10: fields.lt10,
    lt11: fields.lt11,
    lt12: fields.lt12,
    image: imagePath || '',
    status: 'Pending',
  };
  const id = await repo.create(data);
  const row = await repo.findById(id);
  return formatRecord(row);
}

async function updateRecord(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Work record not found');
  await repo.update(id, fields);
  const row = await repo.findById(id);
  return formatRecord(row);
}

async function removeRecord(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Work record not found');
}

module.exports = {
  listRecords,
  getById,
  createRecord,
  updateRecord,
  removeRecord,
};

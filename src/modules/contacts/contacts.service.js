'use strict';

const repo = require('./contacts.repository');
const { formatContact } = require('./contacts.dto');
const ApiError = require('../../common/apiError');

async function getAll(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatContact), total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Contact not found');
  return formatContact(row);
}

module.exports = {
  getAll,
  getById,
};

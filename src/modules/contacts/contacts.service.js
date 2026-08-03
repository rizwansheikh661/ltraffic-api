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

async function create(fields) {
  const existing = await repo.findByEmployeeId(fields.employeeid);
  if (existing) throw ApiError.conflict('Employee ID already exists in the contact directory');

  const id = await repo.create({
    ...fields,
    phone: fields.phone || '',
    email: fields.email || '',
    jobtitle: fields.jobtitle || null,
    linemanager: fields.linemanager || null,
    location: fields.location || null,
    photo_url: fields.photo_url || '',
  });
  return formatContact(await repo.findById(id));
}

async function update(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Contact not found');

  if (fields.employeeid && fields.employeeid !== existing.employeeid) {
    const duplicate = await repo.findByEmployeeId(fields.employeeid);
    if (duplicate) throw ApiError.conflict('Employee ID already exists in the contact directory');
  }

  await repo.update(id, fields);
  return formatContact(await repo.findById(id));
}

async function remove(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Contact not found');
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};

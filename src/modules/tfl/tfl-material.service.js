'use strict';

const repo = require('./tfl-material.repository');
const ApiError = require('../../common/apiError');

function formatMaterial(row) {
  if (!row) return row;
  return { ...row };
}

async function getAllMaterials(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatMaterial), total };
}

async function getMaterialById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('TFL material not found');
  return formatMaterial(row);
}

async function createMaterial(fields) {
  const id = await repo.create(fields);
  const row = await repo.findById(id);
  return formatMaterial(row);
}

async function updateMaterial(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('TFL material not found');
  await repo.update(id, fields);
  const row = await repo.findById(id);
  return formatMaterial(row);
}

async function removeMaterial(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('TFL material not found');
}

module.exports = {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  removeMaterial,
};

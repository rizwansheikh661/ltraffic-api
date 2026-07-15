'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const SELECT_COLS = `id, employeeid, firstname, surname, ltrafficphone, ltrafficemail,
  jobtitle, linemanager, location, photoimage`;

async function findAll({ search, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('(h.firstname LIKE :search OR h.surname LIKE :search)');
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${SELECT_COLS} FROM ${LEGACY.HR} h ${where} ORDER BY h.employeeid ASC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.HR} h ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${SELECT_COLS} FROM ${LEGACY.HR} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
};

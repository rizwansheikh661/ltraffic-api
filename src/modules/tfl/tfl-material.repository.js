'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const TABLE = LEGACY.TFL_MATERIAL;

const COLS = 'id, item, unitsremaining, location, status';

async function findAll({ searchStatus, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (searchStatus) {
    conditions.push('status LIKE :searchStatus');
    params.searchStatus = `${searchStatus}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${COLS} FROM ${TABLE} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${TABLE} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${COLS} FROM ${TABLE} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function create(fields, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${TABLE}
       (item, unitsremaining, location, status)
     VALUES (:item, :unitsremaining, :location, :status)`,
    {
      item: fields.item,
      unitsremaining: fields.unitsremaining,
      location: fields.location,
      status: fields.status,
    },
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const allowed = ['item', 'unitsremaining', 'location', 'status'];
  const sets = [];
  const params = { id };

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = :${key}`);
      params[key] = fields[key];
    }
  }
  if (!sets.length) return false;

  const [result] = await conn.query(
    `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${TABLE} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};

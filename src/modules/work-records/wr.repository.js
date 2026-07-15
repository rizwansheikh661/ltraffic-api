'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const TABLE = LEGACY.WORKRECORD;

const COLS = 'id, lt1, lt2, lt3, lt4, lt5, lt6, lt7, lt8, lt9, lt10, lt11, lt12, image, status';

async function findAll({ status, search, searchLt9, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (status) {
    conditions.push('status = :status');
    params.status = status;
  }
  if (search) {
    conditions.push('lt1 LIKE :search');
    params.search = `${search}%`;
  }
  if (searchLt9) {
    conditions.push('lt9 LIKE :searchLt9');
    params.searchLt9 = `${searchLt9}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = status === 'Pending' ? 'ORDER BY id ASC' : 'ORDER BY id DESC';

  const [rows] = await conn.query(
    `SELECT ${COLS} FROM ${TABLE} ${where} ${order} LIMIT :limit OFFSET :offset`,
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
    `SELECT ${COLS} FROM ${TABLE} WHERE id = :id`,
    { id },
  );
  return rows[0] || null;
}

async function create(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${TABLE} (lt1, lt2, lt3, lt4, lt5, lt6, lt7, lt8, lt9, lt10, lt11, lt12, image, status)
     VALUES (:lt1, :lt2, :lt3, :lt4, :lt5, :lt6, :lt7, :lt8, :lt9, :lt10, :lt11, :lt12, :image, :status)`,
    data,
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const sets = Object.keys(fields).map((k) => `${k} = :${k}`);
  if (!sets.length) return;
  await conn.query(
    `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE id = :id`,
    { ...fields, id },
  );
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

'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const TABLE = LEGACY.CLEGGTESTING;

const COLS = 'id, ct1, ct2, ct3, ct4, ct5, ct6, ct7, ct8, ct9, ct10, ct11, ct12, ct13, image';

async function findAll({ search, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('ct4 LIKE :search');
    params.search = `${search}%`;
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
    `SELECT ${COLS} FROM ${TABLE} WHERE id = :id`,
    { id },
  );
  return rows[0] || null;
}

async function create(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${TABLE} (ct1, ct2, ct3, ct4, ct5, ct6, ct7, ct8, ct9, ct10, ct11, ct12, ct13, image)
     VALUES (:ct1, :ct2, :ct3, :ct4, :ct5, :ct6, :ct7, :ct8, :ct9, :ct10, :ct11, :ct12, :ct13, :image)`,
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

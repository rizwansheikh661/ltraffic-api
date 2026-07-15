'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const TABLE_MAP = {
  policies: LEGACY.POLICIES,
  'method-statements': LEGACY.METHOD_STATEMENTS,
  processes: LEGACY.PROCESSES,
  coshh: LEGACY.COSHH,
};

const COL_MAP = {
  policies: { ref: 'pol1', title: 'pol2', version: 'pol3' },
  'method-statements': { ref: 'ms1', title: 'ms2', version: 'ms3' },
  processes: { ref: 'pro1', title: 'pro2', version: 'pro3' },
  coshh: { ref: 'cos1', title: 'cos2', version: 'cos3' },
};

function getTable(type) {
  return TABLE_MAP[type];
}

function getCols(type) {
  return COL_MAP[type];
}

async function findAll(type, { search, limit, offset } = {}, conn = pool) {
  const table = getTable(type);
  const cols = getCols(type);
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push(`(${cols.ref} LIKE :search OR ${cols.title} LIKE :search)`);
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT * FROM ${table} ${where} ORDER BY id ASC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${table} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(type, id, conn = pool) {
  const table = getTable(type);
  const [rows] = await conn.query(
    `SELECT * FROM ${table} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function create(type, data, conn = pool) {
  const table = getTable(type);
  const cols = getCols(type);
  const [result] = await conn.query(
    `INSERT INTO ${table} (${cols.ref}, ${cols.title}, ${cols.version})
     VALUES (:ref, :title, :version)`,
    { ref: data.reference, title: data.title, version: data.version },
  );
  return result.insertId;
}

async function update(type, id, fields, conn = pool) {
  const table = getTable(type);
  const cols = getCols(type);
  const sets = [];
  const params = { id };

  if (fields.reference !== undefined) {
    sets.push(`${cols.ref} = :ref`);
    params.ref = fields.reference;
  }
  if (fields.title !== undefined) {
    sets.push(`${cols.title} = :title`);
    params.title = fields.title;
  }
  if (fields.version !== undefined) {
    sets.push(`${cols.version} = :version`);
    params.version = fields.version;
  }
  if (!sets.length) return false;

  const [result] = await conn.query(
    `UPDATE ${table} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(type, id, conn = pool) {
  const table = getTable(type);
  const [result] = await conn.query(
    `DELETE FROM ${table} WHERE id = :id`,
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
  getTable,
  getCols,
};

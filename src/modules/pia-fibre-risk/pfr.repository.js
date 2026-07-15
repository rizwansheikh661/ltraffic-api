'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const TABLES = {
  wah: LEGACY.WAH,
  ug: LEGACY.UG,
  mewp: LEGACY.MEWP,
};

function tbl(subtype) {
  const t = TABLES[subtype];
  if (!t) throw new Error(`Invalid subtype: ${subtype}`);
  return t;
}

const COLS = {
  wah: 'id, wah1, wah2, wah3, wah4, pn, snt, sn, wah5, wah6, wah7, wah8, wah9, wah10, wah11, wah12, wah13, wah14, type, status, image',
  ug: 'id, ug1, ug2, ug3, ug4, pn, snt, sn, ug5, ug6, ug7, ug8, ug9, ug10, ug11, ug12, ug13, type, status, image',
  mewp: 'id, mewp1, mewp2, mewp3, mewp4, pn, snt, sn, mewp5, mewp6, mewp7, mewp8, mewp9, mewp10, mewp11, mewp12, mewp13, mewp14, mewp15, type, status, image',
};

const NAME_COL = { wah: 'wah1', ug: 'ug1', mewp: 'mewp1' };

async function findAll(subtype, { search, limit, offset } = {}, conn = pool) {
  const table = tbl(subtype);
  const cols = COLS[subtype];
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push(`${NAME_COL[subtype]} LIKE :search`);
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${cols} FROM ${table} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${table} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(subtype, id, conn = pool) {
  const table = tbl(subtype);
  const cols = COLS[subtype];
  const [rows] = await conn.query(
    `SELECT ${cols} FROM ${table} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function createWah(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${TABLES.wah} (wah1, wah2, wah3, wah4, pn, snt, sn, wah5, wah6, wah7, wah8, wah9, wah10, wah11, wah12, wah13, wah14, type, status, image)
     VALUES (:wah1, :wah2, :wah3, :wah4, :pn, :snt, :sn, :wah5, :wah6, :wah7, :wah8, :wah9, :wah10, :wah11, :wah12, :wah13, :wah14, :type, :status, :image)`,
    data,
  );
  return result.insertId;
}

async function createUg(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${TABLES.ug} (ug1, ug2, ug3, ug4, pn, snt, sn, ug5, ug6, ug7, ug8, ug9, ug10, ug11, ug12, ug13, type, status, image)
     VALUES (:ug1, :ug2, :ug3, :ug4, :pn, :snt, :sn, :ug5, :ug6, :ug7, :ug8, :ug9, :ug10, :ug11, :ug12, :ug13, :type, :status, :image)`,
    data,
  );
  return result.insertId;
}

async function createMewp(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${TABLES.mewp} (mewp1, mewp2, mewp3, mewp4, pn, snt, sn, mewp5, mewp6, mewp7, mewp8, mewp9, mewp10, mewp11, mewp12, mewp13, mewp14, mewp15, type, status, image)
     VALUES (:mewp1, :mewp2, :mewp3, :mewp4, :pn, :snt, :sn, :mewp5, :mewp6, :mewp7, :mewp8, :mewp9, :mewp10, :mewp11, :mewp12, :mewp13, :mewp14, :mewp15, :type, :status, :image)`,
    data,
  );
  return result.insertId;
}

async function remove(subtype, id, conn = pool) {
  const table = tbl(subtype);
  const [result] = await conn.query(
    `DELETE FROM ${table} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

module.exports = {
  TABLES,
  findAll,
  findById,
  createWah,
  createUg,
  createMewp,
  remove,
};

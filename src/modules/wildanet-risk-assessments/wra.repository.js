'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const TABLE = LEGACY.WRA;
const PARENT_TABLE = LEGACY.WILDANET;

async function findParentById(parentId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, solonumber, location, client, startdate, enddate FROM ${PARENT_TABLE} WHERE id = :id LIMIT 1`,
    { id: parentId },
  );
  return rows[0] || null;
}

const ALL_COLS = `id, civils, ra1, ra2, ra3, ra4, ra5, ra6, ra7, ra8, ra9, ra10, ra11, ra12,
  ra13, ra14, ra15, ra16, ra17, ra18, ra19, ra20, ra21, ra22, ra23, ra24, ra25, ra26, ra27, ra28, ra29,
  ra30, ra31, ra32, ra33, ra34, ra35, ra36, ra37, ra38, ra39, ra40, ra41, ra42, ra43, ra44, ra45, ra46, ra47, ra48, ra49,
  ra50, ra51, ra52, ra53, ra54, ra55, ra56, ra57, ra58, ra59, ra60, ra61, ra62, ra63,
  ra64, ra65, ra66, ra67, ra68, ra69, ra70, ra71, ra72, ra73, ra74,
  status, client, image, image1, image2, image3, image4`;

async function findAll({ search, status, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (status === 'live') {
    conditions.push("status = 'In Progress'");
  } else if (status === 'completed') {
    conditions.push("status = 'RA Completed'");
  }

  if (search) {
    conditions.push('(CAST(id AS CHAR) LIKE :search OR ra3 LIKE :search)');
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${ALL_COLS} FROM ${TABLE} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${TABLE} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findByUser(userName, { search, limit, offset } = {}, conn = pool) {
  const conditions = ['ra5 = :userName'];
  const params = { userName };

  if (search) {
    conditions.push('ra3 LIKE :search');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT ${ALL_COLS} FROM ${TABLE} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
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
    `SELECT ${ALL_COLS} FROM ${TABLE} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function createPart1(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${TABLE} (ra1, ra2, ra3, ra4, ra5, ra6, ra7, ra8, ra9, ra10, ra11, ra12, civils, client, status, image)
     VALUES (:ra1, :ra2, :ra3, :ra4, :ra5, :ra6, :ra7, :ra8, :ra9, :ra10, :ra11, :ra12, :civils, :client, :status, :image)`,
    data,
  );
  return result.insertId;
}

const PART_FIELDS = {
  2: ['ra13', 'ra14', 'ra15', 'ra16', 'ra17', 'ra18', 'ra19', 'ra20', 'ra21', 'ra22', 'ra23', 'ra24', 'ra25', 'ra26', 'ra27', 'ra28', 'ra29', 'image1'],
  3: ['ra30', 'ra31', 'ra32', 'ra33', 'ra34', 'ra35', 'ra36', 'ra37', 'ra38', 'ra39', 'ra40', 'ra41', 'ra42', 'ra43', 'ra44', 'ra45', 'ra46', 'ra47', 'ra48', 'ra49', 'image2'],
  4: ['ra50', 'ra51', 'ra52', 'ra53', 'ra54', 'ra55', 'ra56', 'ra57', 'ra58', 'ra59', 'ra60', 'ra61', 'ra62', 'ra63', 'image3'],
  5: ['ra64', 'ra65', 'ra66', 'ra67', 'ra68', 'ra69', 'ra70', 'ra71', 'ra72', 'ra73', 'ra74', 'status', 'image4'],
};

async function updatePart(id, partNum, data, conn = pool) {
  const allowed = PART_FIELDS[partNum];
  if (!allowed) throw new Error(`Invalid part number: ${partNum}`);

  const sets = [];
  const params = { id };
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = :${key}`);
      params[key] = data[key];
    }
  }
  if (!sets.length) return false;

  const [result] = await conn.query(
    `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function update(id, fields, conn = pool) {
  const allowed = [
    'ra1', 'ra2', 'ra3', 'ra4', 'ra5', 'ra6', 'ra7', 'ra8', 'ra9', 'ra10', 'ra11', 'ra12',
    'ra13', 'ra14', 'ra15', 'ra16', 'ra17', 'ra18', 'ra19', 'ra20', 'ra21', 'ra22',
    'ra23', 'ra24', 'ra25', 'ra26', 'ra27', 'ra28', 'ra29',
    'ra30', 'ra31', 'ra32', 'ra33', 'ra34', 'ra35', 'ra36', 'ra37', 'ra38', 'ra39',
    'ra40', 'ra41', 'ra42', 'ra43', 'ra44', 'ra45', 'ra46', 'ra47', 'ra48', 'ra49',
    'ra50', 'ra51', 'ra52', 'ra53', 'ra54', 'ra55', 'ra56', 'ra57', 'ra58', 'ra59',
    'ra60', 'ra61', 'ra62', 'ra63',
    'ra64', 'ra65', 'ra66', 'ra67', 'ra68', 'ra69', 'ra70', 'ra71', 'ra72', 'ra73', 'ra74',
    'status', 'client', 'image', 'image1', 'image2', 'image3', 'image4',
  ];
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
  findParentById,
  findAll,
  findByUser,
  findById,
  createPart1,
  updatePart,
  update,
  remove,
  PART_FIELDS,
};

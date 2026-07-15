'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const SOURCES = {
  civils: { insp: LEGACY.INSP, parent: LEGACY.CIVILS, prefix: 'insp' },
  wildanet: { insp: LEGACY.WINSP, parent: LEGACY.WILDANET, prefix: 'winsp' },
};

function tbl(source) {
  const s = SOURCES[source];
  if (!s) throw new Error(`Invalid source: ${source}`);
  return s;
}

// ── Parent job lookup ────────────────────────────────────────────

async function findParentById(source, parentId, conn = pool) {
  const { parent } = tbl(source);
  const [rows] = await conn.query(
    `SELECT id, solonumber, location, client, assignedto FROM ${parent} WHERE id = :id LIMIT 1`,
    { id: parentId },
  );
  return rows[0] || null;
}

// ── Inspection CRUD ──────────────────────────────────────────────

const ALL_COLS = `id, in1, in2, in3, in4, in5, in6, in7, in8, status, civilsid,
  image, by1, ti1, in9, in10, in11, in12, in13, in14, in15, in16, in17, in18,
  in19, in20, in21, in22, in23, image1, pt2r, by2, ti2, in24, in25, in26, in27,
  in28, in29, image2, pt3r, by3, ti3, in30, in31, in32, in33, in34, in35, in36,
  image3, pt4r, by4, ti4, in37, in38, in39, in40, in41, in42, image4, pt5r,
  by5, ti5, in43, in44, in45, in46, in47, in48, in49, in50, in51, in52, in53,
  in54, in55, in56, image5, pt6r, by6, ti6, in57, in58, in59, in60, in61,
  image6, pt7r, by7, ti7, in62, in63, image7`;

async function findAll(source, { search, status, limit, offset } = {}, conn = pool) {
  const { insp } = tbl(source);
  const conditions = [];
  const params = {};

  if (status === 'live') {
    conditions.push("status NOT IN ('Completed')");
  } else if (status === 'completed') {
    conditions.push("status = 'Completed'");
  }

  if (search) {
    conditions.push('in6 LIKE :search');
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${ALL_COLS} FROM ${insp} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${insp} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findByUser(source, userName, { search, limit, offset } = {}, conn = pool) {
  const { insp } = tbl(source);
  const conditions = ['in3 = :userName'];
  const params = { userName };

  if (search) {
    conditions.push('in6 LIKE :search');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT ${ALL_COLS} FROM ${insp} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${insp} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(source, id, conn = pool) {
  const { insp } = tbl(source);
  const [rows] = await conn.query(
    `SELECT ${ALL_COLS} FROM ${insp} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function createPart1(source, data, conn = pool) {
  const { insp } = tbl(source);
  const [result] = await conn.query(
    `INSERT INTO ${insp} (in1, in2, in3, in4, in5, in6, in7, in8, status, civilsid, image)
     VALUES (:in1, :in2, :in3, :in4, :in5, :in6, :in7, :in8, :status, :civilsid, :image)`,
    data,
  );
  return result.insertId;
}

const PART_FIELDS = {
  2: ['by1', 'ti1', 'in9', 'in10', 'in11', 'in12', 'in13', 'in14', 'in15', 'in16', 'in17', 'in18', 'in19', 'in20', 'in21', 'in22', 'in23', 'image1', 'pt2r'],
  3: ['by2', 'ti2', 'in24', 'in25', 'in26', 'in27', 'in28', 'in29', 'image2', 'pt3r'],
  4: ['by3', 'ti3', 'in30', 'in31', 'in32', 'in33', 'in34', 'in35', 'in36', 'image3', 'pt4r'],
  5: ['by4', 'ti4', 'in37', 'in38', 'in39', 'in40', 'in41', 'in42', 'image4', 'pt5r'],
  6: ['by5', 'ti5', 'in43', 'in44', 'in45', 'in46', 'in47', 'in48', 'in49', 'in50', 'in51', 'in52', 'in53', 'in54', 'in55', 'in56', 'image5', 'pt6r'],
  7: ['by6', 'ti6', 'in57', 'in58', 'in59', 'in60', 'in61', 'image6', 'pt7r'],
  8: ['by7', 'ti7', 'in62', 'in63', 'image7', 'status'],
};

async function updatePart(source, id, partNum, data, conn = pool) {
  const { insp } = tbl(source);
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
    `UPDATE ${insp} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function update(source, id, fields, conn = pool) {
  const { insp } = tbl(source);
  const allowed = [
    'in1', 'in2', 'in3', 'in4', 'in5', 'in6', 'in7', 'in8', 'status', 'civilsid',
    'image', 'by1', 'ti1', 'in9', 'in10', 'in11', 'in12', 'in13', 'in14', 'in15',
    'in16', 'in17', 'in18', 'in19', 'in20', 'in21', 'in22', 'in23', 'image1', 'pt2r',
    'by2', 'ti2', 'in24', 'in25', 'in26', 'in27', 'in28', 'in29', 'image2', 'pt3r',
    'by3', 'ti3', 'in30', 'in31', 'in32', 'in33', 'in34', 'in35', 'in36', 'image3', 'pt4r',
    'by4', 'ti4', 'in37', 'in38', 'in39', 'in40', 'in41', 'in42', 'image4', 'pt5r',
    'by5', 'ti5', 'in43', 'in44', 'in45', 'in46', 'in47', 'in48', 'in49', 'in50',
    'in51', 'in52', 'in53', 'in54', 'in55', 'in56', 'image5', 'pt6r',
    'by6', 'ti6', 'in57', 'in58', 'in59', 'in60', 'in61', 'image6', 'pt7r',
    'by7', 'ti7', 'in62', 'in63', 'image7',
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
    `UPDATE ${insp} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(source, id, conn = pool) {
  const { insp } = tbl(source);
  const [result] = await conn.query(
    `DELETE FROM ${insp} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

module.exports = {
  SOURCES,
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

'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

// vic78–vic86 do not exist in the schema
const VIC_COLS = `id, vic1, vic2, vic3, vic4, vic5, vic6, vic7, vic8, vic9, vic10,
  vic11, vic12, vic13, vic14, vic15, vic16, vic17, vic18, vic19, vic20, vic21,
  vic22, vic23, vic24, vic25, vic26, vic27, vic28, vic29, vic30, vic31, vic32,
  vic33, vic34, vic35, vic36, status, vrid, vehid, type, image,
  vic37, vic38, vic39, vic40, vic41, vic42, vic43, vic44, vic45, vic46, vic47,
  vic48, vic49, vic50, vic51, vic52, vic53, vic54, vic55, vic56, vic57, vic58,
  vic59, vic60, vic61, vic62, vic63, vic64, vic65, vic66, vic67, vic68, vic69,
  vic70, vic71, vic72, vic73, vic74, vic75, vic76, vic77, image1,
  vic87, vic88, vic89, vic90, vic91, vic92, vic93, vic94, vic95, vic96, vic97,
  vic98, vic99, vic100, image2,
  vic101, vic102, vic103, vic104, vic105, vic106, vic107, vic108, vic109, image3`;

const VIR_COLS = `id, vir1, vir2, vir3, vir4, vir5, vir6, vir7, vir8, vir9, vir10,
  vrid, vehid, type, status, image`;

// ── User lookup (for signature path) ────────────────────────

async function findUserName1(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT name1 FROM ${LEGACY.LOGIN_USERS} WHERE user_id = :id LIMIT 1`,
    { id: userId },
  );
  return rows[0]?.name1 || '';
}

// ── VR lookup ───────────────────────────────────────────────

async function findVrById(vrId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, reg FROM ${LEGACY.VR} WHERE id = :id LIMIT 1`,
    { id: vrId },
  );
  return rows[0] || null;
}

// ── VIC CRUD ────────────────────────────────────────────────

async function findAll({ search, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};
  if (search) {
    conditions.push('vic2 LIKE :search');
    params.search = `${search}%`;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await conn.query(
    `SELECT ${VIC_COLS} FROM ${LEGACY.VIC} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.VIC} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findByUser(userName, { search, limit, offset } = {}, conn = pool) {
  const conditions = ['vic1 = :userName'];
  const params = { userName };
  if (search) {
    conditions.push('vic2 LIKE :search');
    params.search = `${search}%`;
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const [rows] = await conn.query(
    `SELECT ${VIC_COLS} FROM ${LEGACY.VIC} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.VIC} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${VIC_COLS} FROM ${LEGACY.VIC} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function createPart1(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.VIC}
     (vic1, vic2, vic3, vic4, vic5, vic6, vic7, vic8, vic9, vic10,
      vic11, vic12, vic13, vic14, vic15, vic16, vic17, vic18, vic19, vic20,
      vic21, vic22, vic23, vic24, vic25, vic26, vic27, vic28, vic29, vic30,
      vic31, vic32, vic33, vic34, vic35, vic36, status, vrid, vehid, type, image)
     VALUES
     (:vic1, :vic2, :vic3, :vic4, :vic5, :vic6, :vic7, :vic8, :vic9, :vic10,
      :vic11, :vic12, :vic13, :vic14, :vic15, :vic16, :vic17, :vic18, :vic19, :vic20,
      :vic21, :vic22, :vic23, :vic24, :vic25, :vic26, :vic27, :vic28, :vic29, :vic30,
      :vic31, :vic32, :vic33, :vic34, :vic35, :vic36, :status, :vrid, :vehid, :type, :image)`,
    data,
  );
  return result.insertId;
}

const PART_FIELDS = {
  2: [
    'vic37', 'vic38', 'vic39', 'vic40', 'vic41', 'vic42', 'vic43', 'vic44', 'vic45',
    'vic46', 'vic47', 'vic48', 'vic49', 'vic50', 'vic51', 'vic52', 'vic53', 'vic54',
    'vic55', 'vic56', 'vic57', 'vic58', 'vic59', 'vic60', 'vic61', 'vic62',
    'vic63', 'vic64', 'vic65', 'vic66', 'vic67', 'vic68', 'vic69', 'vic70',
    'vic71', 'vic72', 'vic73', 'vic74', 'vic75', 'vic76', 'vic77', 'image1',
  ],
  3: [
    'vic87', 'vic88', 'vic89', 'vic90', 'vic91', 'vic92', 'vic93', 'vic94', 'vic95',
    'vic96', 'vic97', 'vic98', 'vic99', 'vic100', 'image2',
  ],
  4: [
    'vic101', 'vic102', 'vic103', 'vic104', 'vic105', 'vic106', 'vic107', 'vic108',
    'vic109', 'image3', 'status',
  ],
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
    `UPDATE ${LEGACY.VIC} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function update(id, fields, conn = pool) {
  const allowed = [
    'vic1', 'vic2', 'vic3', 'vic4', 'vic5', 'vic6', 'vic7', 'vic8', 'vic9', 'vic10',
    'vic11', 'vic12', 'vic13', 'vic14', 'vic15', 'vic16', 'vic17', 'vic18', 'vic19', 'vic20',
    'vic21', 'vic22', 'vic23', 'vic24', 'vic25', 'vic26', 'vic27', 'vic28', 'vic29', 'vic30',
    'vic31', 'vic32', 'vic33', 'vic34', 'vic35', 'vic36', 'status', 'type',
    'vic37', 'vic38', 'vic39', 'vic40', 'vic41', 'vic42', 'vic43', 'vic44', 'vic45',
    'vic46', 'vic47', 'vic48', 'vic49', 'vic50', 'vic51', 'vic52', 'vic53', 'vic54',
    'vic55', 'vic56', 'vic57', 'vic58', 'vic59', 'vic60', 'vic61', 'vic62',
    'vic63', 'vic64', 'vic65', 'vic66', 'vic67', 'vic68', 'vic69', 'vic70',
    'vic71', 'vic72', 'vic73', 'vic74', 'vic75', 'vic76', 'vic77',
    'vic87', 'vic88', 'vic89', 'vic90', 'vic91', 'vic92', 'vic93', 'vic94', 'vic95',
    'vic96', 'vic97', 'vic98', 'vic99', 'vic100',
    'vic101', 'vic102', 'vic103', 'vic104', 'vic105', 'vic106', 'vic107', 'vic108', 'vic109',
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
    `UPDATE ${LEGACY.VIC} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.VIC} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

// ── VIR CRUD ────────────────────────────────────────────────

async function findRepairsByVicId(vicId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${VIR_COLS} FROM ${LEGACY.VIR} WHERE vrid = :vrid ORDER BY id DESC`,
    { vrid: vicId },
  );
  return rows;
}

async function findRepairById(repairId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${VIR_COLS} FROM ${LEGACY.VIR} WHERE id = :id LIMIT 1`,
    { id: repairId },
  );
  return rows[0] || null;
}

async function createRepair(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.VIR}
     (vir1, vir2, vir3, vir4, vir5, vir6, vir7, vir8, vir9, vir10,
      vrid, vehid, type, status, image)
     VALUES
     (:vir1, :vir2, :vir3, :vir4, :vir5, :vir6, :vir7, :vir8, :vir9, :vir10,
      :vrid, :vehid, :type, :status, :image)`,
    data,
  );
  return result.insertId;
}

async function removeRepair(repairId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.VIR} WHERE id = :id`,
    { id: repairId },
  );
  return result.affectedRows > 0;
}

module.exports = {
  findUserName1,
  findVrById,
  findAll,
  findByUser,
  findById,
  createPart1,
  updatePart,
  update,
  remove,
  findRepairsByVicId,
  findRepairById,
  createRepair,
  removeRepair,
  PART_FIELDS,
};

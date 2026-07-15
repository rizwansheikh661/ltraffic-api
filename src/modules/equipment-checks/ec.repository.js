'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const EC_COLS = `id, operativesname, description, ident, arrival_datetime,
  brakes, steering, seatbelt, mirrors, tyres, wheelsecurity,
  rotatingbeacon, horn, warninglights, coolant, seat, access, fuel,
  cond, safe, report, image`;

// ── Employee queries ───────────────────────────────────────────

async function create(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.EQUIPMENT_CHECK}
       (operativesname, description, ident, arrival_datetime,
        brakes, steering, seatbelt, mirrors, tyres, wheelsecurity,
        rotatingbeacon, horn, warninglights, coolant, seat, access, fuel,
        cond, safe, report, image)
     VALUES
       (:operativesname, :description, :ident, :arrival_datetime,
        :brakes, :steering, :seatbelt, :mirrors, :tyres, :wheelsecurity,
        :rotatingbeacon, :horn, :warninglights, :coolant, :seat, :access, :fuel,
        :cond, :safe, :report, :image)`,
    data,
  );
  return result.insertId;
}

async function findByOperative(operativesname, { limit, offset, search } = {}, conn = pool) {
  const conditions = ['operativesname = :operativesname'];
  const params = { operativesname };

  if (search) {
    conditions.push('arrival_datetime LIKE :search');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT ${EC_COLS} FROM ${LEGACY.EQUIPMENT_CHECK} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.EQUIPMENT_CHECK} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

// ── Admin queries ──────────────────────────────────────────────

async function findAll({ search, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('operativesname LIKE :search');
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${EC_COLS} FROM ${LEGACY.EQUIPMENT_CHECK} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.EQUIPMENT_CHECK} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${EC_COLS} FROM ${LEGACY.EQUIPMENT_CHECK} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function update(id, fields, conn = pool) {
  const allowed = [
    'operativesname', 'description', 'ident',
    'brakes', 'steering', 'seatbelt', 'mirrors', 'tyres', 'wheelsecurity',
    'rotatingbeacon', 'horn', 'warninglights', 'coolant', 'seat', 'access', 'fuel',
    'cond', 'safe', 'report', 'image',
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
    `UPDATE ${LEGACY.EQUIPMENT_CHECK} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.EQUIPMENT_CHECK} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

// ── Document queries (upload_presite) ─────────────────────────

async function findDocuments(checkId, { search, limit, offset } = {}, conn = pool) {
  const conditions = ['name = :checkId'];
  const params = { checkId: String(checkId) };

  if (search) {
    conditions.push('(submittedby LIKE :search OR arrival_datetime LIKE :search)');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT id, name, arrival_datetime, file_name, submittedby, doctype, docdesc
     FROM ${LEGACY.UPLOAD_PRESITE} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.UPLOAD_PRESITE} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findDocumentById(docId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, name, arrival_datetime, file_name, submittedby, doctype, docdesc
     FROM ${LEGACY.UPLOAD_PRESITE} WHERE id = :docId LIMIT 1`,
    { docId },
  );
  return rows[0] || null;
}

async function insertDocument({ checkId, submittedby, fileName, docdesc }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.UPLOAD_PRESITE}
       (name, arrival_datetime, submittedby, file_name, doctype, docdesc)
     VALUES (:checkId, NOW(), :submittedby, :fileName, 'Site Image', :docdesc)`,
    { checkId: String(checkId), submittedby, fileName, docdesc },
  );
  return result.insertId;
}

async function removeDocument(docId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.UPLOAD_PRESITE} WHERE id = :docId`,
    { docId },
  );
  return result.affectedRows > 0;
}

module.exports = {
  create,
  findByOperative,
  findAll,
  findById,
  update,
  remove,
  findDocuments,
  findDocumentById,
  insertDocument,
  removeDocument,
};

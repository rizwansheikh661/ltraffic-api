'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const ER_COLS = 'id, item, description, ident, allocatedto, date, cond, expiry, notes';

async function findAll({ search, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('(item LIKE :search OR ident LIKE :search)');
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${ER_COLS} FROM ${LEGACY.ER} ${where} ORDER BY ident ASC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.ER} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${ER_COLS} FROM ${LEGACY.ER} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function create(fields, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.ER}
       (item, description, ident, allocatedto, date, cond, expiry, notes)
     VALUES (:item, :description, :ident, :allocatedto, :date, :cond, :expiry, :notes)`,
    {
      item: fields.item,
      description: fields.description || '',
      ident: fields.ident,
      allocatedto: fields.allocatedto,
      date: fields.date,
      cond: fields.cond,
      expiry: fields.expiry || '',
      notes: fields.notes || '',
    },
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const allowed = ['item', 'description', 'ident', 'allocatedto', 'date', 'cond', 'expiry', 'notes'];
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
    `UPDATE ${LEGACY.ER} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.ER} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

// --- Document (upload_er) operations ---

async function findDocuments({ erId, search, limit, offset } = {}, conn = pool) {
  const conditions = ['name = :erId'];
  const params = { erId: String(erId) };

  if (search) {
    conditions.push('(submittedby LIKE :search OR arrival_datetime LIKE :search)');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT id, name, arrival_datetime, file_name, submittedby, doctype, docdesc
     FROM ${LEGACY.UPLOAD_ER} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.UPLOAD_ER} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findDocumentById(docId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, name, arrival_datetime, file_name, submittedby, doctype, docdesc
     FROM ${LEGACY.UPLOAD_ER} WHERE id = :docId LIMIT 1`,
    { docId },
  );
  return rows[0] || null;
}

async function insertDocument({ erId, submittedby, fileName, doctype, docdesc }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.UPLOAD_ER}
       (name, arrival_datetime, submittedby, file_name, doctype, docdesc)
     VALUES (:erId, NOW(), :submittedby, :fileName, :doctype, :docdesc)`,
    { erId: String(erId), submittedby, fileName, doctype, docdesc },
  );
  return result.insertId;
}

async function removeDocument(docId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.UPLOAD_ER} WHERE id = :docId`,
    { docId },
  );
  return result.affectedRows > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  findDocuments,
  findDocumentById,
  insertDocument,
  removeDocument,
};

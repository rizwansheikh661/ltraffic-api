'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const VR_COLS = 'id, reg, description, allocatedto, date, cond, mexpiry, texpiry, sexpiry, notes';

async function findAll({ search, archived, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (archived) {
    conditions.push("cond = 'No'");
  } else {
    conditions.push("cond = 'Yes'");
  }

  if (search) {
    conditions.push('(reg LIKE :search OR allocatedto LIKE :search)');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT ${VR_COLS} FROM ${LEGACY.VR} ${where} ORDER BY reg ASC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.VR} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${VR_COLS} FROM ${LEGACY.VR} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function create(fields, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.VR}
       (reg, description, allocatedto, date, cond, mexpiry, texpiry, sexpiry, notes)
     VALUES (:reg, :description, :allocatedto, :date, :cond, :mexpiry, :texpiry, :sexpiry, :notes)`,
    {
      reg: fields.reg,
      description: fields.description || '',
      allocatedto: fields.allocatedto,
      date: fields.date || '',
      cond: fields.cond,
      mexpiry: fields.mexpiry || '',
      texpiry: fields.texpiry || '',
      sexpiry: fields.sexpiry || '',
      notes: fields.notes || '',
    },
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const allowed = ['reg', 'description', 'allocatedto', 'date', 'cond', 'mexpiry', 'texpiry', 'sexpiry', 'notes'];
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
    `UPDATE ${LEGACY.VR} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.VR} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

// --- Document (upload_vr) operations ---

async function findDocuments({ vrId, search, limit, offset } = {}, conn = pool) {
  const conditions = ['name = :vrId'];
  const params = { vrId: String(vrId) };

  if (search) {
    conditions.push('(submittedby LIKE :search OR arrival_datetime LIKE :search)');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT id, name, arrival_datetime, file_name, submittedby, doctype, docdesc
     FROM ${LEGACY.UPLOAD_VR} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.UPLOAD_VR} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findDocumentById(docId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, name, arrival_datetime, file_name, submittedby, doctype, docdesc
     FROM ${LEGACY.UPLOAD_VR} WHERE id = :docId LIMIT 1`,
    { docId },
  );
  return rows[0] || null;
}

async function insertDocument({ vrId, submittedby, fileName, doctype, docdesc }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.UPLOAD_VR}
       (name, arrival_datetime, submittedby, file_name, doctype, docdesc)
     VALUES (:vrId, NOW(), :submittedby, :fileName, :doctype, :docdesc)`,
    { vrId: String(vrId), submittedby, fileName, doctype, docdesc },
  );
  return result.insertId;
}

async function removeDocument(docId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.UPLOAD_VR} WHERE id = :docId`,
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

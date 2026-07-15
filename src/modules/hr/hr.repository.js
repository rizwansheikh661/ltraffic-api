'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

// ── Employee list/view ─────────────────────────────────────────

async function findAll({ search, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('(h.firstname LIKE :search OR h.surname LIKE :search)');
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.HR} h ${where} ORDER BY h.employeeid ASC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.HR} h ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.HR} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

// ── Admin write operations ─────────────────────────────────────

async function update(id, fields, conn = pool) {
  const allowed = [
    'firstname', 'middlename', 'surname', 'dob', 'address', 'telephone', 'email',
    'nationality', 'contactname1', 'contacttelephone1', 'relation1',
    'contactname2', 'contacttelephone2', 'relation2',
    'employeeid', 'jobtitle', 'location', 'linemanager',
    'startdate', 'enddate', 'cis', 'ninumber', 'salary',
    'ltrafficemail', 'ltrafficphone', 'photoimage',
    'confirm', 'signature', 'arrival_datetime', 'notes',
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
    `UPDATE ${LEGACY.HR} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.HR} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

// ── Document queries ───────────────────────────────────────────

async function findDocuments(employeeId, { search, searchDate, limit, offset } = {}, conn = pool) {
  const conditions = ['d.name = :employeeId'];
  const params = { employeeId: String(employeeId) };

  if (search) {
    conditions.push('d.submittedby LIKE :search');
    params.search = `${search}%`;
  }
  if (searchDate) {
    conditions.push('d.arrival_datetime LIKE :searchDate');
    params.searchDate = `${searchDate}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.UPLOAD_HR} d ${where} ORDER BY d.id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.UPLOAD_HR} d ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function insertDocument({ employeeId, submittedby, doctype, docdesc, fileName }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.UPLOAD_HR} (name, arrival_datetime, submittedby, doctype, docdesc, file_name)
     VALUES (:employeeId, NOW(), :submittedby, :doctype, :docdesc, :fileName)`,
    { employeeId: String(employeeId), submittedby, doctype, docdesc, fileName },
  );
  return result.insertId;
}

async function removeDocument(docId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.UPLOAD_HR} WHERE id = :docId`,
    { docId },
  );
  return result.affectedRows > 0;
}

module.exports = {
  findAll,
  findById,
  update,
  remove,
  findDocuments,
  insertDocument,
  removeDocument,
};

'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const TABLE = LEGACY.CIVILS;
const DOC_TABLE = LEGACY.UPLOAD_DATA;

const COLS = 'id, jobstatus, assignedto, client, authority, community, solonumber, location, postcode, permitstatus, startdate, enddate, notes';

const INACTIVE_STATUSES = ['Completed', 'Cancelled', 'Closed', 'Invoiced', 'Awaiting Invoicing'];

// ── Jobs ─────────────────────────────────────────────────────

async function findActive({ search, searchAssignedto, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  conditions.push(`jobstatus NOT IN (${INACTIVE_STATUSES.map((_, i) => `:s${i}`).join(', ')})`);
  INACTIVE_STATUSES.forEach((s, i) => { params[`s${i}`] = s; });

  if (search) {
    conditions.push('solonumber LIKE :search');
    params.search = `${search}%`;
  }
  if (searchAssignedto) {
    conditions.push('assignedto LIKE :searchAssignedto');
    params.searchAssignedto = `${searchAssignedto}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT ${COLS} FROM ${TABLE} ${where} ORDER BY startdate DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${TABLE} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findAll({ search, searchAssignedto, searchJobstatus, searchPermitstatus, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('solonumber LIKE :search');
    params.search = `${search}%`;
  }
  if (searchAssignedto) {
    conditions.push('assignedto LIKE :searchAssignedto');
    params.searchAssignedto = `${searchAssignedto}%`;
  }
  if (searchJobstatus) {
    conditions.push('jobstatus LIKE :searchJobstatus');
    params.searchJobstatus = `${searchJobstatus}%`;
  }
  if (searchPermitstatus) {
    conditions.push('permitstatus LIKE :searchPermitstatus');
    params.searchPermitstatus = `${searchPermitstatus}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${COLS} FROM ${TABLE} ${where} ORDER BY startdate DESC LIMIT :limit OFFSET :offset`,
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
    `SELECT ${COLS} FROM ${TABLE} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function create(fields, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${TABLE}
       (jobstatus, assignedto, client, authority, community, solonumber, location, postcode, permitstatus, startdate, enddate, notes)
     VALUES (:jobstatus, :assignedto, :client, :authority, :community, :solonumber, :location, :postcode, :permitstatus, :startdate, :enddate, :notes)`,
    {
      jobstatus: fields.jobstatus,
      assignedto: fields.assignedto,
      client: fields.client,
      authority: fields.authority,
      community: fields.community,
      solonumber: fields.solonumber,
      location: fields.location,
      postcode: fields.postcode,
      permitstatus: fields.permitstatus,
      startdate: fields.startdate || '',
      enddate: fields.enddate || '',
      notes: fields.notes || '',
    },
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const allowed = [
    'jobstatus', 'assignedto', 'client', 'authority', 'community',
    'solonumber', 'location', 'postcode', 'permitstatus',
    'startdate', 'enddate', 'notes',
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

// ── Documents (upload_data) ──────────────────────────────────

async function findDocuments({ jobId, search, limit, offset } = {}, conn = pool) {
  const conditions = ['name = :jobId'];
  const params = { jobId: String(jobId) };

  if (search) {
    conditions.push('(submittedby LIKE :search OR arrival_datetime LIKE :search)');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT id, name, arrival_datetime, file_name, submittedby, doctype, docdesc
     FROM ${DOC_TABLE} ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${DOC_TABLE} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function insertDocument({ jobId, arrivalDatetime, submittedby, fileName, doctype, docdesc }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${DOC_TABLE}
       (name, arrival_datetime, submittedby, file_name, doctype, docdesc)
     VALUES (:jobId, :arrivalDatetime, :submittedby, :fileName, :doctype, :docdesc)`,
    { jobId: String(jobId), arrivalDatetime, submittedby, fileName, doctype, docdesc },
  );
  return result.insertId;
}

async function removeDocument(docId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${DOC_TABLE} WHERE id = :docId`,
    { docId },
  );
  return result.affectedRows > 0;
}

module.exports = {
  findActive,
  findAll,
  findById,
  create,
  update,
  remove,
  findDocuments,
  insertDocument,
  removeDocument,
};

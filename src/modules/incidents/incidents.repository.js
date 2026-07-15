'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

// ── Employee queries ───────────────────────────────────────────

async function create(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.HEALTHSAFETY}
       (operativesname, arrival_datetime, type, location, reportedby, report,
        involved, anyoneinjured, whowasinjured, injuryreport,
        reportit, advise, laterdate, companydetails,
        witness, witnessname, witnessaddress, witnesscontact, otherwitness,
        notes, status, image)
     VALUES
       (:operativesname, NOW(), :type, :location, :reportedby, :report,
        :involved, :anyoneinjured, :whowasinjured, :injuryreport,
        :reportit, :advise, :laterdate, :companydetails,
        :witness, :witnessname, :witnessaddress, :witnesscontact, :otherwitness,
        :notes, :status, :image)`,
    data,
  );
  return result.insertId;
}

async function findByOperative(name, { limit, offset } = {}, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.HEALTHSAFETY}
     WHERE operativesname = :name ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    { name, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.HEALTHSAFETY} WHERE operativesname = :name`,
    { name },
  );
  return { rows, total: countRows[0].total };
}

// ── Admin queries ──────────────────────────────────────────────

async function adminCreate(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.HEALTHSAFETY}
       (operativesname, arrival_datetime, type, location, reportedby, report,
        notes, status, image)
     VALUES
       (:operativesname, :arrival_datetime, :type, :location, :reportedby, :report,
        :notes, :status, :image)`,
    data,
  );
  return result.insertId;
}

async function findAll({ search, searchDate, status, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (status === 'open') {
    conditions.push("h.status = 'Open'");
  } else if (status === 'closed') {
    conditions.push("h.status = 'Closed'");
  }

  if (search) {
    conditions.push('h.operativesname LIKE :search');
    params.search = `%${search}%`;
  }
  if (searchDate) {
    conditions.push('h.arrival_datetime LIKE :searchDate');
    params.searchDate = `${searchDate}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.HEALTHSAFETY} h ${where} ORDER BY h.id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.HEALTHSAFETY} h ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.HEALTHSAFETY} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function update(id, fields, conn = pool) {
  const allowed = [
    'operativesname', 'arrival_datetime', 'type', 'location', 'reportedby', 'report',
    'involved', 'anyoneinjured', 'whowasinjured', 'injuryreport',
    'reportit', 'advise', 'laterdate', 'companydetails',
    'witness', 'witnessname', 'witnessaddress', 'witnesscontact', 'otherwitness',
    'notes', 'status', 'image',
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
    `UPDATE ${LEGACY.HEALTHSAFETY} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function updateStatus(id, status, notes, conn = pool) {
  const sets = ['status = :status'];
  const params = { id, status };
  if (notes !== undefined) {
    sets.push('notes = :notes');
    params.notes = notes;
  }
  const [result] = await conn.query(
    `UPDATE ${LEGACY.HEALTHSAFETY} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.HEALTHSAFETY} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

// ── Document queries ───────────────────────────────────────────

async function findDocuments(incidentId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.UPLOAD_HS} WHERE name = :incidentId ORDER BY id DESC`,
    { incidentId: String(incidentId) },
  );
  return rows;
}

async function insertDocument({ incidentId, submittedby, fileName }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.UPLOAD_HS} (name, arrival_datetime, submittedby, file_name)
     VALUES (:incidentId, NOW(), :submittedby, :fileName)`,
    { incidentId: String(incidentId), submittedby, fileName },
  );
  return result.insertId;
}

async function removeDocument(docId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.UPLOAD_HS} WHERE id = :docId`,
    { docId },
  );
  return result.affectedRows > 0;
}

module.exports = {
  create,
  findByOperative,
  adminCreate,
  findAll,
  findById,
  update,
  updateStatus,
  remove,
  findDocuments,
  insertDocument,
  removeDocument,
};

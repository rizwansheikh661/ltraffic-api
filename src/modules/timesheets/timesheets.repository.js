'use strict';

const { pool } = require('../../config/db');
const { LEGACY, NEW } = require('../../constants/tables');

// ── Employee queries ───────────────────────────────────────────

async function create(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.TIMESHEET}
       (week, ltrafficid, name,
        date1, hours1, location1, activity1, contract1,
        date2, hours2, location2, activity2, contract2,
        date3, hours3, location3, activity3, contract3,
        date4, hours4, location4, activity4, contract4,
        date5, hours5, location5, activity5, contract5,
        date6, hours6, location6, activity6, contract6,
        date7, hours7, location7, activity7, contract7,
        comments, status)
     VALUES
       (:week, :ltrafficid, :name,
        :date1, :hours1, :location1, :activity1, :contract1,
        :date2, :hours2, :location2, :activity2, :contract2,
        :date3, :hours3, :location3, :activity3, :contract3,
        :date4, :hours4, :location4, :activity4, :contract4,
        :date5, :hours5, :location5, :activity5, :contract5,
        :date6, :hours6, :location6, :activity6, :contract6,
        :date7, :hours7, :location7, :activity7, :contract7,
        :comments, :status)`,
    data,
  );
  return result.insertId;
}

async function findByUser(ltrafficid, { limit, offset, status } = {}, conn = pool) {
  const conditions = ['t.ltrafficid = :ltrafficid'];
  const params = { ltrafficid };

  if (status) {
    conditions.push('t.status = :status');
    params.status = status;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.TIMESHEET} t ${where} ORDER BY t.id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.TIMESHEET} t ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

// A Submitted sheet is the legacy database equivalent of a pending sheet.
// Drafts are included so an older draft can be converted into a submission
// without creating another record for the same week.
async function findLatestEditableByUserAndWeek(ltrafficid, week, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.TIMESHEET}
      WHERE ltrafficid = :ltrafficid
        AND week = :week
        AND status IN ('Draft', 'Submitted')
      ORDER BY id DESC
      LIMIT 1`,
    { ltrafficid, week },
  );
  return rows[0] || null;
}

async function updateSubmission(id, data, conn = pool) {
  const [result] = await conn.query(
    `UPDATE ${LEGACY.TIMESHEET}
        SET week = :week,
            ltrafficid = :ltrafficid,
            name = :name,
            date1 = :date1, hours1 = :hours1, location1 = :location1, activity1 = :activity1, contract1 = :contract1,
            date2 = :date2, hours2 = :hours2, location2 = :location2, activity2 = :activity2, contract2 = :contract2,
            date3 = :date3, hours3 = :hours3, location3 = :location3, activity3 = :activity3, contract3 = :contract3,
            date4 = :date4, hours4 = :hours4, location4 = :location4, activity4 = :activity4, contract4 = :contract4,
            date5 = :date5, hours5 = :hours5, location5 = :location5, activity5 = :activity5, contract5 = :contract5,
            date6 = :date6, hours6 = :hours6, location6 = :location6, activity6 = :activity6, contract6 = :contract6,
            date7 = :date7, hours7 = :hours7, location7 = :location7, activity7 = :activity7, contract7 = :contract7,
            comments = :comments,
            status = :status
      WHERE id = :id`,
    { ...data, id },
  );
  return result.affectedRows > 0;
}

// ── Admin queries ──────────────────────────────────────────────

async function findAll({ search, status, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (status === 'submitted') {
    conditions.push("(t.status = 'Submitted' OR t.status = 'Rejected')");
  } else if (status === 'approved') {
    conditions.push("t.status = 'Approved'");
  } else if (status === 'draft') {
    conditions.push("t.status = 'Draft'");
  }

  if (search) {
    conditions.push('t.name LIKE :search');
    params.search = `%${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.TIMESHEET} t ${where} ORDER BY t.id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.TIMESHEET} t ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.TIMESHEET} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function updateStatus(id, status, conn = pool) {
  const [result] = await conn.query(
    `UPDATE ${LEGACY.TIMESHEET} SET status = :status WHERE id = :id`,
    { id, status },
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.TIMESHEET} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

async function findOptions({ type, includeInactive = false } = {}, conn = pool) {
  const conditions = [];
  const params = {};
  if (type) {
    conditions.push('type = :type');
    params.type = type;
  }
  if (!includeInactive) conditions.push('is_active = 1');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await conn.query(
    `SELECT id, type, name, is_active, sort_order, created_at, updated_at
       FROM ${NEW.TIMESHEET_OPTIONS} ${where}
      ORDER BY type ASC, sort_order ASC, name ASC`,
    params,
  );
  return rows;
}

async function findOptionById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, type, name, is_active, sort_order, created_at, updated_at
       FROM ${NEW.TIMESHEET_OPTIONS} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function findOptionByTypeAndName(type, name, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id FROM ${NEW.TIMESHEET_OPTIONS} WHERE type = :type AND name = :name LIMIT 1`,
    { type, name },
  );
  return rows[0] || null;
}

async function createOption(fields, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${NEW.TIMESHEET_OPTIONS} (type, name, sort_order)
     VALUES (:type, :name, :sort_order)`,
    fields,
  );
  return result.insertId;
}

async function updateOption(id, fields, conn = pool) {
  const allowed = ['name', 'is_active', 'sort_order'];
  const sets = [];
  const params = { id };
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = :${key}`);
      params[key] = fields[key];
    }
  }
  const [result] = await conn.query(
    `UPDATE ${NEW.TIMESHEET_OPTIONS} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

module.exports = {
  create,
  findByUser,
  findLatestEditableByUserAndWeek,
  updateSubmission,
  findAll,
  findById,
  updateStatus,
  remove,
  findOptions,
  findOptionById,
  findOptionByTypeAndName,
  createOption,
  updateOption,
};

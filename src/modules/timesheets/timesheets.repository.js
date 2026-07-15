'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

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

module.exports = {
  create,
  findByUser,
  findAll,
  findById,
  updateStatus,
  remove,
};

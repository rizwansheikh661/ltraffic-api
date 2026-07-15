'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

// ── Employee queries ───────────────────────────────────────────

async function create(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.VEHICLE}
       (drivername, vehiclereg, mileage, arrival_datetime,
        routeplanned, roadconditions, dressedforweather, emergencyequip,
        tires, lights, windows, loads,
        washer, oil, fluid, belts,
        seatbelt, horn, mirrors, brakes,
        trailercoupling, safetyconnection, loadsecured, loadweight,
        vehiclecondition, safe, report)
     VALUES
       (:drivername, :vehiclereg, :mileage, :arrival_datetime,
        :routeplanned, :roadconditions, :dressedforweather, :emergencyequip,
        :tires, :lights, :windows, :loads,
        :washer, :oil, :fluid, :belts,
        :seatbelt, :horn, :mirrors, :brakes,
        :trailercoupling, :safetyconnection, :loadsecured, :loadweight,
        :vehiclecondition, :safe, :report)`,
    data,
  );
  return result.insertId;
}

async function findByDriver(drivername, { limit, offset, search } = {}, conn = pool) {
  const conditions = ['v.drivername = :drivername'];
  const params = { drivername };

  if (search) {
    conditions.push('v.arrival_datetime LIKE :search');
    params.search = `${search}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.VEHICLE} v ${where} ORDER BY v.id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.VEHICLE} v ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function getLastSubmissionTime(drivername, conn = pool) {
  const [rows] = await conn.query(
    `SELECT arrival_datetime FROM ${LEGACY.VEHICLE}
     WHERE drivername = :drivername ORDER BY id DESC LIMIT 1`,
    { drivername },
  );
  return rows[0]?.arrival_datetime || null;
}

// ── Admin queries ──────────────────────────────────────────────

async function findAll({ search, searchDate, status, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('v.drivername LIKE :search');
    params.search = `%${search}%`;
  }
  if (searchDate) {
    conditions.push('v.arrival_datetime LIKE :searchDate');
    params.searchDate = `${searchDate}%`;
  }

  if (status === 'action-required') {
    conditions.push(
      `(v.safe = 'Unsafe' OR v.vehiclecondition IN ('Average','Poor','Very Poor','Dangerous'))`,
    );
  } else if (status === 'closed') {
    conditions.push(`(v.safe = 'Closed' OR v.vehiclecondition = 'Closed')`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.VEHICLE} v ${where} ORDER BY v.id DESC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.VEHICLE} v ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.VEHICLE} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function update(id, fields, conn = pool) {
  const allowed = [
    'drivername', 'vehiclereg', 'mileage', 'arrival_datetime',
    'routeplanned', 'roadconditions', 'dressedforweather', 'emergencyequip',
    'tires', 'lights', 'windows', 'loads',
    'washer', 'oil', 'fluid', 'belts',
    'seatbelt', 'horn', 'mirrors', 'brakes',
    'trailercoupling', 'safetyconnection', 'loadsecured', 'loadweight',
    'vehiclecondition', 'safe', 'report', 'notes',
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
    `UPDATE ${LEGACY.VEHICLE} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.VEHICLE} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

async function adminCreate(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.VEHICLE}
       (drivername, vehiclereg, mileage, arrival_datetime,
        routeplanned, roadconditions, dressedforweather, emergencyequip,
        tires, lights, windows, loads,
        washer, oil, fluid, belts,
        seatbelt, horn, mirrors, brakes,
        trailercoupling, safetyconnection, loadsecured, loadweight,
        vehiclecondition, safe, report, notes)
     VALUES
       (:drivername, :vehiclereg, :mileage, :arrival_datetime,
        :routeplanned, :roadconditions, :dressedforweather, :emergencyequip,
        :tires, :lights, :windows, :loads,
        :washer, :oil, :fluid, :belts,
        :seatbelt, :horn, :mirrors, :brakes,
        :trailercoupling, :safetyconnection, :loadsecured, :loadweight,
        :vehiclecondition, :safe, :report, :notes)`,
    data,
  );
  return result.insertId;
}

// ── Document queries ───────────────────────────────────────────

async function findDocuments(vehicleCheckId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.UPLOAD_VEHICLE} WHERE name = :vehicleCheckId ORDER BY id DESC`,
    { vehicleCheckId: String(vehicleCheckId) },
  );
  return rows;
}

async function insertDocument({ vehicleCheckId, submittedby, fileName }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.UPLOAD_VEHICLE} (name, arrival_datetime, submittedby, file_name)
     VALUES (:vehicleCheckId, NOW(), :submittedby, :fileName)`,
    { vehicleCheckId: String(vehicleCheckId), submittedby, fileName },
  );
  return result.insertId;
}

async function removeDocument(docId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.UPLOAD_VEHICLE} WHERE id = :docId`,
    { docId },
  );
  return result.affectedRows > 0;
}

module.exports = {
  create,
  findByDriver,
  getLastSubmissionTime,
  findAll,
  findById,
  update,
  remove,
  adminCreate,
  findDocuments,
  insertDocument,
  removeDocument,
};

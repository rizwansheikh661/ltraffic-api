'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const SELECT_COLS = `id, employeeid, firstname, surname, ltrafficphone, ltrafficemail,
  jobtitle, linemanager, location, photoimage`;

async function findAll({ firstname, surname, search, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (firstname) {
    conditions.push('h.firstname LIKE :firstname');
    params.firstname = `${firstname}%`;
  }
  if (surname) {
    conditions.push('h.surname LIKE :surname');
    params.surname = `${surname}%`;
  }
  if (search) {
    conditions.push('(h.firstname LIKE :search OR h.surname LIKE :search)');
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${SELECT_COLS} FROM ${LEGACY.HR} h ${where} ORDER BY h.employeeid ASC LIMIT :limit OFFSET :offset`,
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
    `SELECT ${SELECT_COLS} FROM ${LEGACY.HR} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function findByEmployeeId(employeeid, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${SELECT_COLS} FROM ${LEGACY.HR} WHERE employeeid = :employeeid LIMIT 1`,
    { employeeid },
  );
  return rows[0] || null;
}

async function create(fields, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.HR}
       (firstname, middlename, surname, dob, address, nationality, telephone, email,
        cis, startdate, contactname1, contacttelephone1, relation1,
        contactname2, contacttelephone2, relation2, employeeid, photoimage,
        ltrafficemail, ltrafficphone, jobtitle, linemanager, location)
     VALUES
       (:firstname, '', :surname, '', '', '', '', '',
        '', '', '', '', '', '', '', '', :employeeid, '',
        :email, :phone, :jobtitle, :linemanager, :location)`,
    fields,
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const fieldToColumn = {
    employeeid: 'employeeid',
    firstname: 'firstname',
    surname: 'surname',
    phone: 'ltrafficphone',
    email: 'ltrafficemail',
    jobtitle: 'jobtitle',
    linemanager: 'linemanager',
    location: 'location',
  };
  const sets = [];
  const params = { id };

  Object.entries(fieldToColumn).forEach(([field, column]) => {
    if (fields[field] !== undefined) {
      sets.push(`${column} = :${field}`);
      params[field] = fields[field];
    }
  });
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

module.exports = {
  findAll,
  findById,
  findByEmployeeId,
  create,
  update,
  remove,
};
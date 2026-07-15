'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

async function findHrByEmployeeId(employeeid, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.HR} WHERE employeeid = :employeeid ORDER BY id DESC LIMIT 1`,
    { employeeid },
  );
  return rows[0] || null;
}

async function createHrRecord(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.HR}
       (firstname, middlename, surname, dob, address, telephone, email,
        nationality, contactname1, contacttelephone1, relation1,
        contactname2, contacttelephone2, relation2, employeeid,
        startdate, cis, ninumber, photoimage, confirm, signature,
        arrival_datetime, date_signed)
     VALUES
       (:firstname, :middlename, :surname, :dob, :address, :telephone, :email,
        :nationality, :contactname1, :contacttelephone1, :relation1,
        :contactname2, :contacttelephone2, :relation2, :employeeid,
        :startdate, :cis, :ninumber, :photoimage, :confirm, :signature,
        :arrival_datetime, :date_signed)`,
    data,
  );
  return result.insertId;
}

async function updateOnboardingStatus(userId, conn = pool) {
  await conn.query(
    `UPDATE ${LEGACY.LOGIN_USERS} SET onboarding = '1' WHERE user_id = :id`,
    { id: userId },
  );
}

async function findUserOnboardingData(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT user_id, name, name1, ltrafficid, onboarding
       FROM ${LEGACY.LOGIN_USERS}
      WHERE user_id = :id LIMIT 1`,
    { id: userId },
  );
  return rows[0] || null;
}

module.exports = {
  findHrByEmployeeId,
  createHrRecord,
  updateOnboardingStatus,
  findUserOnboardingData,
};

'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

const LIST_COLS = `user_id, user_level, restricted, username, name, email,
  timestamp, teamup, vehiclereg, ltrafficid, team, name1, onboarding`;

async function findAll({ search, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('name LIKE :search');
    params.search = `${search}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT ${LIST_COLS} FROM ${LEGACY.LOGIN_USERS} ${where} ORDER BY ltrafficid ASC LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );
  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.LOGIN_USERS} ${where}`,
    params,
  );
  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${LIST_COLS} FROM ${LEGACY.LOGIN_USERS} WHERE user_id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function findByUsername(username, conn = pool) {
  const [rows] = await conn.query(
    `SELECT user_id FROM ${LEGACY.LOGIN_USERS} WHERE username = :username LIMIT 1`,
    { username },
  );
  return rows[0] || null;
}

async function findByEmail(email, conn = pool) {
  const [rows] = await conn.query(
    `SELECT user_id FROM ${LEGACY.LOGIN_USERS} WHERE email = :email LIMIT 1`,
    { email },
  );
  return rows[0] || null;
}

async function create(fields, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.LOGIN_USERS}
       (user_level, restricted, username, name, email, password, teamup, vehiclereg, ltrafficid, team, name1, onboarding)
     VALUES (:user_level, :restricted, :username, :name, :email, :password, :teamup, :vehiclereg, :ltrafficid, :team, :name1, :onboarding)`,
    {
      user_level: fields.user_level,
      restricted: fields.restricted ?? 0,
      username: fields.username,
      name: fields.name,
      email: fields.email || '',
      password: fields.password,
      teamup: fields.teamup || '',
      vehiclereg: fields.vehiclereg || '',
      ltrafficid: fields.ltrafficid || '',
      team: fields.team || '',
      name1: fields.name1 || '',
      onboarding: fields.onboarding || '',
    },
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const allowed = [
    'user_level', 'restricted', 'name', 'email',
    'teamup', 'vehiclereg', 'ltrafficid', 'team', 'name1', 'onboarding',
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
    `UPDATE ${LEGACY.LOGIN_USERS} SET ${sets.join(', ')} WHERE user_id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.LOGIN_USERS} WHERE user_id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

module.exports = {
  findAll,
  findById,
  findByUsername,
  findByEmail,
  create,
  update,
  remove,
};

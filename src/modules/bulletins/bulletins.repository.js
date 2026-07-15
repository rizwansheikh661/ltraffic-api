'use strict';

const { pool } = require('../../config/db');
const { LEGACY } = require('../../constants/tables');

// ── Queries ────────────────────────────────────────────────────

async function findAll({ search, searchRef, status, limit, offset } = {}, conn = pool) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('b.title LIKE :search');
    params.search = `%${search}%`;
  }
  if (searchRef) {
    conditions.push('b.ref LIKE :searchRef');
    params.searchRef = `${searchRef}%`;
  }
  if (status === 'active') {
    conditions.push('b.`new` = :statusVal');
    params.statusVal = '1';
  } else if (status === 'inactive') {
    conditions.push('b.`new` = :statusVal');
    params.statusVal = '0';
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `SELECT b.*,
       (SELECT GROUP_CONCAT(lu.name ORDER BY lu.name SEPARATOR ', ')
        FROM ${LEGACY.BULLETIN_READ} br
        JOIN ${LEGACY.LOGIN_USERS} lu ON lu.user_id = br.user_id
        WHERE br.bulletin = b.id) AS read_confirm
     FROM ${LEGACY.BULLETIN_NEW} b ${where}
     ORDER BY b.id DESC
     LIMIT :limit OFFSET :offset`,
    { ...params, limit, offset },
  );

  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${LEGACY.BULLETIN_NEW} b ${where}`,
    params,
  );

  return { rows, total: countRows[0].total };
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.BULLETIN_NEW} WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
}

async function create({ title, ref, description, image, download, new: isNew }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO ${LEGACY.BULLETIN_NEW}
       (title, ref, description, image, download, \`new\`, arrival_datetime, readby)
     VALUES (:title, :ref, :description, :image, :download, :isNew, NOW(), '')`,
    { title, ref, description, image: image || '', download: download || '', isNew: isNew ?? '1' },
  );
  return result.insertId;
}

async function update(id, fields, conn = pool) {
  const allowed = ['title', 'ref', 'description', 'image', 'download', 'new'];
  const sets = [];
  const params = { id };

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`\`${key}\` = :${key}`);
      params[key] = fields[key];
    }
  }
  if (!sets.length) return false;

  const [result] = await conn.query(
    `UPDATE ${LEGACY.BULLETIN_NEW} SET ${sets.join(', ')} WHERE id = :id`,
    params,
  );
  return result.affectedRows > 0;
}

async function remove(id, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM ${LEGACY.BULLETIN_NEW} WHERE id = :id`,
    { id },
  );
  return result.affectedRows > 0;
}

async function getReaders(bulletinId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT lu.user_id, lu.name, lu.email
     FROM ${LEGACY.BULLETIN_READ} br
     JOIN ${LEGACY.LOGIN_USERS} lu ON lu.user_id = br.user_id
     WHERE br.bulletin = :bulletinId`,
    { bulletinId },
  );
  return rows;
}

// ── Employee-side queries ──────────────────────────────────────

async function findActiveBulletins(conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM ${LEGACY.BULLETIN_NEW} WHERE \`new\` = '1' ORDER BY arrival_datetime DESC`,
  );
  return rows;
}

async function isReadByUser(bulletinId, userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id FROM ${LEGACY.BULLETIN_READ}
     WHERE bulletin = :bulletinId AND user_id = :userId LIMIT 1`,
    { bulletinId: String(bulletinId), userId: String(userId) },
  );
  return rows.length > 0;
}

async function markAsRead(bulletinId, userId, conn = pool) {
  await conn.query(
    `INSERT INTO ${LEGACY.BULLETIN_READ} (bulletin, user_id) VALUES (:bulletinId, :userId)`,
    { bulletinId: String(bulletinId), userId: String(userId) },
  );
}

async function insertConfirmation(ref, operative, confirm = 'confirm', conn = pool) {
  await conn.query(
    `INSERT INTO ${LEGACY.BULLETIN_CONFIRM} (ref, operative, confirm) VALUES (:ref, :operative, :confirm)`,
    { ref, operative, confirm },
  );
}

async function getUnreadBulletinIds(userId, conn = pool) {
  const [allBulletins] = await conn.query(
    `SELECT id FROM ${LEGACY.BULLETIN_NEW} WHERE \`new\` = '1'`,
  );
  const [readRows] = await conn.query(
    `SELECT bulletin FROM ${LEGACY.BULLETIN_READ} WHERE user_id = :userId`,
    { userId: String(userId) },
  );
  const readIds = new Set(readRows.map((r) => String(r.bulletin)));
  return allBulletins.filter((b) => !readIds.has(String(b.id))).map((b) => b.id);
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  getReaders,
  findActiveBulletins,
  isReadByUser,
  markAsRead,
  insertConfirmation,
  getUnreadBulletinIds,
};

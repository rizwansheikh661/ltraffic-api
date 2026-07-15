'use strict';

const repo = require('./bulletins.repository');
const { formatBulletin, formatBulletinForEmployee } = require('./bulletins.dto');
const ApiError = require('../../common/apiError');

// ── Admin ──────────────────────────────────────────────────────

async function getAll(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatBulletin), total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Bulletin not found');
  return formatBulletin(row);
}

async function getReaders(id) {
  const bulletin = await repo.findById(id);
  if (!bulletin) throw ApiError.notFound('Bulletin not found');
  return repo.getReaders(id);
}

async function create(fields) {
  const id = await repo.create(fields);
  const row = await repo.findById(id);
  return formatBulletin(row);
}

async function update(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Bulletin not found');
  await repo.update(id, fields);
  const row = await repo.findById(id);
  return formatBulletin(row);
}

async function remove(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Bulletin not found');
}

// ── Employee ───────────────────────────────────────────────────

async function getPending(userId) {
  const unreadIds = await repo.getUnreadBulletinIds(userId);
  if (!unreadIds.length) return [];

  const activeBulletins = await repo.findActiveBulletins();
  const pending = activeBulletins.filter((b) => unreadIds.includes(b.id));
  return pending.map((b) => formatBulletinForEmployee(b, false));
}

async function getEmployeeList(userId, query) {
  const { rows, total } = await repo.findAll(query);

  const enriched = await Promise.all(
    rows.map(async (b) => {
      const isRead = await repo.isReadByUser(b.id, userId);
      return formatBulletinForEmployee(b, isRead);
    }),
  );
  return { data: enriched, total };
}

async function getEmployeeById(id, userId) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Bulletin not found');
  const isRead = await repo.isReadByUser(id, userId);
  return formatBulletinForEmployee(row, isRead);
}

async function acknowledge(id, user) {
  const bulletin = await repo.findById(id);
  if (!bulletin) throw ApiError.notFound('Bulletin not found');

  const alreadyRead = await repo.isReadByUser(id, user.id);
  if (!alreadyRead) {
    await repo.markAsRead(id, user.id);
  }
  await repo.insertConfirmation(bulletin.ref, user.name, 'confirm');

  return { acknowledged: true };
}

module.exports = {
  getAll,
  getById,
  getReaders,
  create,
  update,
  remove,
  getPending,
  getEmployeeList,
  getEmployeeById,
  acknowledge,
};

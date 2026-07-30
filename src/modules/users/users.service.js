'use strict';

const md5 = require('md5');

const repo = require('./users.repository');
const authRepo = require('../auth/auth.repository');
const { formatUser, formatUserSummary } = require('./users.dto');
const { hashBcrypt } = require('../../utils/legacyHash.helper');
const { withTransaction } = require('../../common/db');
const ApiError = require('../../common/apiError');
const levelsCache = require('../auth/levels.cache');

function serialiseLevel(levelId) {
  const value = String(levelId);
  return `a:1:{i:0;s:${value.length}:"${value}";}`;
}

function normaliseLevelInput(fields) {
  const next = { ...fields };
  if (next.level_id !== undefined) {
    next.user_level = serialiseLevel(next.level_id);
    delete next.level_id;
  }
  return next;
}

async function getAll(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatUserSummary), total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('User not found');
  return formatUser(row);
}

async function createUser(fields) {
  const normalised = normaliseLevelInput(fields);
  const existingUsername = await repo.findByUsername(normalised.username);
  if (existingUsername) throw ApiError.conflict('Username already exists');

  if (normalised.email) {
    const existingEmail = await repo.findByEmail(normalised.email);
    if (existingEmail) throw ApiError.conflict('Email already exists');
  }

  const plainPassword = normalised.password;
  const md5Hash = md5(String(plainPassword));
  const bcryptHash = await hashBcrypt(plainPassword);

  const userId = await withTransaction(async (conn) => {
    const id = await repo.create({ ...normalised, password: md5Hash }, conn);
    await authRepo.upsertCredentials(id, bcryptHash, md5Hash, conn);
    return id;
  });

  const row = await repo.findById(userId);
  return formatUser(row);
}

async function updateUser(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('User not found');

  const { password, ...otherFieldsRaw } = normaliseLevelInput(fields);
  const otherFields = otherFieldsRaw;
  if (otherFields.username && otherFields.username !== existing.username) {
    const duplicate = await repo.findByUsername(otherFields.username);
    if (duplicate) throw ApiError.conflict('Username already exists');
  }

  if (password) {
    const md5Hash = md5(String(password));
    const bcryptHash = await hashBcrypt(password);

    await withTransaction(async (conn) => {
      if (Object.keys(otherFields).length) {
        await repo.update(id, otherFields, conn);
      }
      await authRepo.updateUserPasswordMd5(id, md5Hash, conn);
      await authRepo.upsertCredentials(id, bcryptHash, md5Hash, conn);
      await authRepo.revokeAllRefreshTokensForUser(id, conn);
    });
  } else if (Object.keys(otherFields).length) {
    await repo.update(id, otherFields);
    if (Number(otherFields.restricted) === 1) {
      await authRepo.revokeAllRefreshTokensForUser(id);
    }
  }

  const row = await repo.findById(id);
  return formatUser(row);
}

function getLevels() {
  return levelsCache.list();
}

async function removeUser(id) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('User not found');

  await withTransaction(async (conn) => {
    await authRepo.revokeAllRefreshTokensForUser(id, conn);
    await authRepo.deleteCredentials(id, conn);
    await repo.remove(id, conn);
  });
}

module.exports = {
  getAll,
  getById,
  createUser,
  updateUser,
  removeUser,
  getLevels,
};

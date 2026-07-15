'use strict';

const md5 = require('md5');

const repo = require('./users.repository');
const authRepo = require('../auth/auth.repository');
const { formatUser, formatUserSummary } = require('./users.dto');
const { hashBcrypt } = require('../../utils/legacyHash.helper');
const { withTransaction } = require('../../common/db');
const ApiError = require('../../common/apiError');

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
  const existingUsername = await repo.findByUsername(fields.username);
  if (existingUsername) throw ApiError.conflict('Username already exists');

  if (fields.email) {
    const existingEmail = await repo.findByEmail(fields.email);
    if (existingEmail) throw ApiError.conflict('Email already exists');
  }

  const plainPassword = fields.password;
  const md5Hash = md5(String(plainPassword));
  const bcryptHash = await hashBcrypt(plainPassword);

  const userId = await withTransaction(async (conn) => {
    const id = await repo.create({ ...fields, password: md5Hash }, conn);
    await authRepo.upsertCredentials(id, bcryptHash, md5Hash, conn);
    return id;
  });

  const row = await repo.findById(userId);
  return formatUser(row);
}

async function updateUser(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('User not found');

  const { password, ...otherFields } = fields;

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
  }

  const row = await repo.findById(id);
  return formatUser(row);
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
};

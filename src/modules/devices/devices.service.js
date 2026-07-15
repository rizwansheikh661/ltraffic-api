'use strict';

const repo = require('./devices.repository');

async function register({ userId, token, platform, appVersion }) {
  await repo.upsertDeviceToken({ userId, token, platform, appVersion });
  return { registered: true };
}

async function unregister({ userId, token }) {
  const revoked = await repo.revokeDeviceToken({ userId, token });
  return { revoked };
}

async function list(userId) {
  return repo.listActiveTokensForUser(userId);
}

module.exports = { register, unregister, list };

'use strict';

/**
 * Shape an authenticated user for JSON responses. Never leaks the password
 * column or any internal cache state.
 */

const { unserialize } = require('../../utils/phpSerialize.helper');
const levelsCache = require('./levels.cache');
const { ADMIN_LEVELS, appRoleFor } = require('../../constants/roles');

function resolveLevels(userLevelRaw) {
  const parsed = unserialize(userLevelRaw);
  const ids = [];
  if (Array.isArray(parsed)) {
    for (const v of parsed) ids.push(Number(v));
  } else if (parsed && typeof parsed === 'object') {
    for (const v of Object.values(parsed)) ids.push(Number(v));
  } else if (parsed != null) {
    const n = Number(parsed);
    if (Number.isFinite(n)) ids.push(n);
  }
  return ids.filter((n) => Number.isInteger(n) && n > 0);
}

function userTypeFromLevelIds(ids) {
  const set = new Set(ids.map(Number));
  for (const admin of ADMIN_LEVELS) if (set.has(admin)) return 'admin';
  return 'employee';
}

function publicUser(row) {
  const ids = resolveLevels(row.user_level);
  const names = levelsCache.idsToNames(ids);
  return {
    id: Number(row.user_id),
    username: row.username,
    name: row.name || row.name1 || row.username,
    email: row.email,
    ltrafficid: row.ltrafficid || null,
    team: row.team || null,
    levelIds: ids,
    roles: names,
    userType: userTypeFromLevelIds(ids),
    role: ids.length > 0 ? appRoleFor(ids[0]) : null,
    onboarding: row.onboarding || '0',
  };
}

module.exports = { publicUser, resolveLevels, userTypeFromLevelIds };

'use strict';

const { unserialize } = require('../../utils/phpSerialize.helper');
const levelsCache = require('../auth/levels.cache');

function parseLevel(userLevelRaw) {
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

function formatUser(row) {
  if (!row) return null;
  const levelIds = parseLevel(row.user_level);
  const levelNames = levelsCache.idsToNames(levelIds);
  return {
    id: row.user_id,
    username: row.username,
    name: row.name ? row.name.trim() : '',
    email: row.email || null,
    user_level: row.user_level,
    level_id: levelIds[0] || null,
    level_name: levelNames[0] || null,
    restricted: row.restricted,
    ltrafficid: row.ltrafficid || null,
    team: row.team || null,
    teamup: row.teamup || null,
    vehiclereg: row.vehiclereg || null,
    name1: row.name1 || null,
    onboarding: row.onboarding || null,
    timestamp: row.timestamp || null,
  };
}

function formatUserSummary(row) {
  if (!row) return null;
  const levelIds = parseLevel(row.user_level);
  const levelNames = levelsCache.idsToNames(levelIds);
  return {
    id: row.user_id,
    ltrafficid: row.ltrafficid || null,
    name: row.name ? row.name.trim() : '',
    username: row.username,
    level_name: levelNames[0] || null,
    email: row.email || null,
    vehiclereg: row.vehiclereg || null,
    onboarding: row.onboarding || null,
  };
}

module.exports = { formatUser, formatUserSummary };

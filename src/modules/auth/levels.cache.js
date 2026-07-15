'use strict';

const { pool } = require('../../config/db');
const logger = require('../../config/logger');
const { LEGACY } = require('../../constants/tables');

/**
 * Boot-time cache of the `login_levels` table.
 * PHP `check.class.php` resolves comma-separated level NAMES (e.g. "Admin, Admin1")
 * to IDs at request time — the mobile RBAC layer does the same, but once,
 * at boot, so hot paths don't hit the DB.
 *
 * The cache is refreshable at runtime (`refresh()`) in case an admin edits
 * levels via the PHP UI while the Node process is running.
 */

let byId = new Map();
let byName = new Map();
let loadedAt = null;

async function load() {
  const [rows] = await pool.query(
    `SELECT id, level_name, level_disabled, redirect FROM ${LEGACY.LOGIN_LEVELS} ORDER BY id`,
  );
  const nextById = new Map();
  const nextByName = new Map();
  for (const r of rows) {
    const entry = {
      id: Number(r.id),
      name: String(r.level_name),
      disabled: Number(r.level_disabled) === 1,
      redirect: r.redirect || null,
    };
    nextById.set(entry.id, entry);
    nextByName.set(entry.name.toLowerCase(), entry);
  }
  byId = nextById;
  byName = nextByName;
  loadedAt = new Date();
  logger.info(`[levels] cached ${byId.size} rows from login_levels`);
  return byId.size;
}

function getById(id) {
  return byId.get(Number(id)) || null;
}

function getByName(name) {
  if (!name) return null;
  return byName.get(String(name).toLowerCase()) || null;
}

function idsToNames(ids) {
  return (ids || [])
    .map((id) => byId.get(Number(id)))
    .filter(Boolean)
    .map((e) => e.name);
}

function namesToIds(names) {
  return (names || [])
    .map((n) => byName.get(String(n).toLowerCase()))
    .filter(Boolean)
    .map((e) => e.id);
}

function status() {
  return { size: byId.size, loadedAt };
}

module.exports = { load, refresh: load, getById, getByName, idsToNames, namesToIds, status };

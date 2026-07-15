'use strict';

const mysql = require('mysql2/promise');
const env = require('./env');
const logger = require('./logger');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_MAX,
  connectTimeout: env.DB_CONNECT_TIMEOUT_MS,
  queueLimit: 0,
  dateStrings: true,
  charset: 'utf8mb4_general_ci',
  timezone: 'Z',
  supportBigNumbers: true,
  bigNumberStrings: false,
  namedPlaceholders: true,
});

pool.on('connection', () => {
  logger.debug('[db] new pool connection established');
});

async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
    return true;
  } finally {
    conn.release();
  }
}

async function shutdown() {
  logger.info('[db] closing pool');
  await pool.end();
}

module.exports = { pool, ping, shutdown };

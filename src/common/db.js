'use strict';

const { pool } = require('../config/db');

/**
 * Run `fn(conn)` inside a transaction. Commits on resolve, rolls back on throw.
 * The connection is exclusive to the callback — every query inside must use `conn.query()`,
 * not the shared pool, or the transaction guarantee is lost.
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // ignore rollback failure — original error is more important
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };

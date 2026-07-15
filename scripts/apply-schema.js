'use strict';

/**
 * scripts/apply-schema.js
 * Applies every .sql file in scripts/schema/ in filename order.
 * Idempotent — each file uses CREATE TABLE IF NOT EXISTS.
 *
 * Usage:
 *   npm run schema:apply
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const mysql = require('mysql2/promise');

async function main() {
  const dir = path.resolve(__dirname, 'schema');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[schema] no .sql files found in', dir);
    return;
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      // eslint-disable-next-line no-console
      console.log(`[schema] applying ${file} ...`);
      await conn.query(sql);
    }
    // eslint-disable-next-line no-console
    console.log(`[schema] done — ${files.length} file(s) applied`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[schema] failed:', err.message);
  process.exit(1);
});

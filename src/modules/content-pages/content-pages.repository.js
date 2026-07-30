'use strict';

const { pool } = require('../../config/db');
const { NEW } = require('../../constants/tables');

async function findAll(conn = pool) {
  const [rows] = await conn.query(
    `SELECT slug, title, content, updated_by, updated_at
       FROM ${NEW.CONTENT_PAGES}
      ORDER BY FIELD(slug, 'about-us', 'privacy-policy', 'terms-and-conditions')`,
  );
  return rows;
}

async function findBySlug(slug, conn = pool) {
  const [rows] = await conn.query(
    `SELECT slug, title, content, updated_by, updated_at
       FROM ${NEW.CONTENT_PAGES}
      WHERE slug = :slug LIMIT 1`,
    { slug },
  );
  return rows[0] || null;
}

async function upsert({ slug, title, content, updatedBy }, conn = pool) {
  await conn.query(
    `INSERT INTO ${NEW.CONTENT_PAGES} (slug, title, content, updated_by)
     VALUES (:slug, :title, :content, :updatedBy)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), content = VALUES(content), updated_by = VALUES(updated_by)`,
    { slug, title, content, updatedBy },
  );
  return findBySlug(slug, conn);
}

module.exports = { findAll, findBySlug, upsert };

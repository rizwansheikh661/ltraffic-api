'use strict';

const ApiError = require('../../common/apiError');
const repo = require('./content-pages.repository');

async function list() {
  return repo.findAll();
}

async function getBySlug(slug) {
  const page = await repo.findBySlug(slug);
  if (!page) throw ApiError.notFound('Content page not found');
  return page;
}

async function update(slug, fields, updatedBy) {
  return repo.upsert({ slug, ...fields, updatedBy });
}

module.exports = { list, getBySlug, update };

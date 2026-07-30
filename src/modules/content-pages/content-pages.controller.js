'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const service = require('./content-pages.service');

const list = asyncHandler(async (_req, res) => ok(res, await service.list()));
const getBySlug = asyncHandler(async (req, res) => ok(res, await service.getBySlug(req.params.slug)));
const update = asyncHandler(async (req, res) => ok(
  res,
  await service.update(req.params.slug, req.body, req.user.id),
));

module.exports = { list, getBySlug, update };

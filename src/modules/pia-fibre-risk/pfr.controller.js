'use strict';

const asyncHandler = require('../../common/asyncHandler');
const pagination = require('../../common/pagination');
const { ok, created, noContent } = require('../../common/response');
const { addImageUrls: addImageUrlsGeneric, buildImagePath } = require('../../utils/file.helper');
const service = require('./pfr.service');

const IMAGE_COLS = ['image'];

function addImageUrls(row) { return addImageUrlsGeneric(row, IMAGE_COLS); }

// ── Employee ──────────────────────────────────────────────────

const wahList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.list('wah', { search: req.query.search, limit, offset });
  return ok(res, rows.map(addImageUrls), pagination.meta({ page, limit }, total));
});

const wahCreate = asyncHandler(async (req, res) => {
  const imagePath = buildImagePath('wah', req.files);
  const row = await service.createWah(req.user, req.body, imagePath);
  return created(res, addImageUrls(row));
});

const ugList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.list('ug', { search: req.query.search, limit, offset });
  return ok(res, rows.map(addImageUrls), pagination.meta({ page, limit }, total));
});

const ugCreate = asyncHandler(async (req, res) => {
  const imagePath = buildImagePath('ug', req.files);
  const row = await service.createUg(req.user, req.body, imagePath);
  return created(res, addImageUrls(row));
});

const mewpList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.list('mewp', { search: req.query.search, limit, offset });
  return ok(res, rows.map(addImageUrls), pagination.meta({ page, limit }, total));
});

const mewpCreate = asyncHandler(async (req, res) => {
  const imagePath = buildImagePath('mewp', req.files);
  const row = await service.createMewp(req.user, req.body, imagePath);
  return created(res, addImageUrls(row));
});

// ── Admin ─────────────────────────────────────────────────────

const wahDelete = asyncHandler(async (req, res) => {
  await service.removeRecord('wah', Number(req.params.id));
  return noContent(res);
});

const ugDelete = asyncHandler(async (req, res) => {
  await service.removeRecord('ug', Number(req.params.id));
  return noContent(res);
});

const mewpDelete = asyncHandler(async (req, res) => {
  await service.removeRecord('mewp', Number(req.params.id));
  return noContent(res);
});

module.exports = {
  wahList,
  wahCreate,
  ugList,
  ugCreate,
  mewpList,
  mewpCreate,
  wahDelete,
  ugDelete,
  mewpDelete,
};

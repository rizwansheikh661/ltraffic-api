'use strict';

const asyncHandler = require('../../common/asyncHandler');
const pagination = require('../../common/pagination');
const { ok, created, noContent } = require('../../common/response');
const { addImageUrls: addImageUrlsGeneric, buildImagePath } = require('../../utils/file.helper');
const service = require('./si.service');
const { PART_SCHEMAS } = require('./si.validators');

const SI_IMAGE_COLS = ['image', 'image1', 'image2', 'image3', 'image4', 'image5', 'image6', 'image7'];

function addImageUrls(row) { return addImageUrlsGeneric(row, SI_IMAGE_COLS); }

function resolveSource(req) {
  return req.query.source || 'civils';
}

function buildSiImagePath(source, partNum, files) {
  const { SOURCES } = require('./si.repository');
  const subpath = `${SOURCES[source].prefix}${partNum}`;
  return buildImagePath(subpath, files);
}

// ── Employee ──────────────────────────────────────────────────

const employeeCreate = asyncHandler(async (req, res) => {
  const source = resolveSource(req);
  const imagePath = buildSiImagePath(source, 1, req.files);
  const row = await service.createPart1(source, req.user, req.body, imagePath);
  return created(res, addImageUrls(row));
});

const employeeSubmitPart = asyncHandler(async (req, res) => {
  const source = resolveSource(req);
  const partNum = Number(req.params.partNum);
  const schema = PART_SCHEMAS[partNum];
  if (!schema) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid part number' } });
  }
  const parsed = schema.parse(req.body);
  const imagePath = buildSiImagePath(source, partNum, req.files);
  const row = await service.submitPart(source, req.user, Number(req.params.id), partNum, parsed, imagePath);
  return ok(res, addImageUrls(row));
});

const employeeList = asyncHandler(async (req, res) => {
  const source = resolveSource(req);
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.getOwn(source, req.user.name, { search: req.query.search, limit, offset });
  return ok(res, rows.map(addImageUrls), pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const source = resolveSource(req);
  const row = await service.getOwnById(source, req.user.name, Number(req.params.id));
  return ok(res, addImageUrls(row));
});

// ── Admin ─────────────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const source = resolveSource(req);
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.getAll(source, { search: req.query.search, status: req.query.status, limit, offset });
  return ok(res, rows.map(addImageUrls), pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const source = resolveSource(req);
  const row = await service.getById(source, Number(req.params.id));
  return ok(res, addImageUrls(row));
});

const adminUpdate = asyncHandler(async (req, res) => {
  const source = resolveSource(req);
  const row = await service.updateInspection(source, Number(req.params.id), req.body);
  return ok(res, addImageUrls(row));
});

const adminRemove = asyncHandler(async (req, res) => {
  const source = resolveSource(req);
  await service.removeInspection(source, Number(req.params.id));
  return noContent(res);
});

module.exports = {
  employeeCreate,
  employeeSubmitPart,
  employeeList,
  employeeGetById,
  adminList,
  adminGetById,
  adminUpdate,
  adminRemove,
};

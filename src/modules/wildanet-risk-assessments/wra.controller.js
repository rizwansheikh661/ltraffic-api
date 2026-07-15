'use strict';

const asyncHandler = require('../../common/asyncHandler');
const pagination = require('../../common/pagination');
const { ok, created, noContent } = require('../../common/response');
const { addImageUrls: addImageUrlsGeneric, buildImagePath } = require('../../utils/file.helper');
const service = require('./wra.service');
const { PART_SCHEMAS } = require('./wra.validators');

const WRA_IMAGE_COLS = ['image', 'image1', 'image2', 'image3', 'image4'];

function addImageUrls(row) { return addImageUrlsGeneric(row, WRA_IMAGE_COLS); }

const UPLOAD_SUBPATHS = { 1: 'wra', 2: 'wra1', 3: 'wra2', 4: 'wra3', 5: 'wra4' };

// ── Employee ──────────────────────────────────────────────────

const employeeCreate = asyncHandler(async (req, res) => {
  const imagePath = buildImagePath(UPLOAD_SUBPATHS[1], req.files);
  const row = await service.createPart1(req.user, req.body, imagePath);
  return created(res, addImageUrls(row));
});

const employeeSubmitPart = asyncHandler(async (req, res) => {
  const partNum = Number(req.params.partNum);
  const schema = PART_SCHEMAS[partNum];
  if (!schema) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid part number' } });
  }
  const parsed = schema.parse(req.body);
  const imagePath = buildImagePath(UPLOAD_SUBPATHS[partNum], req.files);
  const row = await service.submitPart(req.user, Number(req.params.id), partNum, parsed, imagePath);
  return ok(res, addImageUrls(row));
});

const employeeList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.getOwn(req.user.name, { search: req.query.search, limit, offset });
  return ok(res, rows.map(addImageUrls), pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const row = await service.getOwnById(req.user.name, Number(req.params.id));
  return ok(res, addImageUrls(row));
});

// ── Admin ─────────────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.getAll({ search: req.query.search, status: req.query.status, limit, offset });
  return ok(res, rows.map(addImageUrls), pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const row = await service.getById(Number(req.params.id));
  return ok(res, addImageUrls(row));
});

const adminUpdate = asyncHandler(async (req, res) => {
  const row = await service.updateRecord(Number(req.params.id), req.body);
  return ok(res, addImageUrls(row));
});

const adminRemove = asyncHandler(async (req, res) => {
  await service.removeRecord(Number(req.params.id));
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

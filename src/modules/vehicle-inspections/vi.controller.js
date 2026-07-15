'use strict';

const asyncHandler = require('../../common/asyncHandler');
const pagination = require('../../common/pagination');
const { ok, created, noContent } = require('../../common/response');
const { addImageUrls: addImageUrlsGeneric, buildImagePath } = require('../../utils/file.helper');
const service = require('./vi.service');
const { PART_SCHEMAS, VirCreateSchema } = require('./vi.validators');

const VIC_IMAGE_COLS = ['image', 'image1', 'image2', 'image3'];
const VIR_IMAGE_COLS = ['image'];

function addVicImageUrls(row) { return addImageUrlsGeneric(row, VIC_IMAGE_COLS); }
function addVirImageUrls(row) { return addImageUrlsGeneric(row, VIR_IMAGE_COLS); }

// ── Employee — VIC ──────────────────────────────────────────

const employeeCreate = asyncHandler(async (req, res) => {
  const imagePath = buildImagePath('vic1', req.files);
  const row = await service.createPart1(req.user, req.body, imagePath);
  return created(res, addVicImageUrls(row));
});

const employeeSubmitPart = asyncHandler(async (req, res) => {
  const partNum = Number(req.params.partNum);
  const schema = PART_SCHEMAS[partNum];
  if (!schema) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid part number' } });
  }
  const parsed = schema.parse(req.body);
  const imagePath = buildImagePath(`vic${partNum}`, req.files);
  const row = await service.submitPart(req.user, Number(req.params.id), partNum, parsed, imagePath);
  return ok(res, addVicImageUrls(row));
});

const employeeList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.getOwn(req.user.name, { search: req.query.search, limit, offset });
  return ok(res, rows.map(addVicImageUrls), pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const row = await service.getOwnById(req.user.name, Number(req.params.id));
  return ok(res, addVicImageUrls(row));
});

// ── Employee — VIR ──────────────────────────────────────────

const employeeAddRepair = asyncHandler(async (req, res) => {
  const parsed = VirCreateSchema.parse(req.body);
  const imagePath = buildImagePath('vir', req.files);
  const row = await service.createRepair(req.user, Number(req.params.id), parsed, imagePath);
  return created(res, addVirImageUrls(row));
});

// ── Admin — VIC ─────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { rows, total } = await service.getAll({ search: req.query.search, limit, offset });
  return ok(res, rows.map(addVicImageUrls), pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const row = await service.getById(Number(req.params.id));
  return ok(res, addVicImageUrls(row));
});

const adminUpdate = asyncHandler(async (req, res) => {
  const row = await service.updateInspection(Number(req.params.id), req.body);
  return ok(res, addVicImageUrls(row));
});

const adminRemove = asyncHandler(async (req, res) => {
  await service.removeInspection(Number(req.params.id));
  return noContent(res);
});

// ── Admin — VIR ─────────────────────────────────────────────

const adminListRepairs = asyncHandler(async (req, res) => {
  const rows = await service.getRepairs(Number(req.params.id));
  return ok(res, rows.map(addVirImageUrls));
});

const adminRemoveRepair = asyncHandler(async (req, res) => {
  await service.removeRepair(Number(req.params.id), Number(req.params.repairId));
  return noContent(res);
});

module.exports = {
  employeeCreate,
  employeeSubmitPart,
  employeeList,
  employeeGetById,
  employeeAddRepair,
  adminList,
  adminGetById,
  adminUpdate,
  adminRemove,
  adminListRepairs,
  adminRemoveRepair,
};

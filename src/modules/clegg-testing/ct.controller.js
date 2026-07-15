'use strict';

const asyncHandler = require('../../common/asyncHandler');
const ApiError = require('../../common/apiError');
const { ok, created, noContent } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./ct.service');
const { buildImagePath } = require('../../utils/file.helper');

const UPLOAD_SUBPATH = 'clegg';

// ── Employee ─────────────────────────────────────────────────

const employeeList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { data, total } = await service.listRecords({ search, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, data);
});

const employeeCreate = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw ApiError.badRequest('At least one image is required');
  const imagePath = buildImagePath(UPLOAD_SUBPATH, req.files);
  const fields = { ...req.body, ct4: req.user.name };
  const data = await service.createRecord(fields, imagePath);
  return created(res, data);
});

// ── Admin ────────────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { data, total } = await service.listRecords({ search, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, data);
});

const adminUpdate = asyncHandler(async (req, res) => {
  const data = await service.updateRecord(req.params.id, req.body);
  return ok(res, data);
});

const adminDelete = asyncHandler(async (req, res) => {
  await service.removeRecord(req.params.id);
  return noContent(res);
});

module.exports = {
  employeeList,
  employeeGetById,
  employeeCreate,
  adminList,
  adminGetById,
  adminUpdate,
  adminDelete,
};

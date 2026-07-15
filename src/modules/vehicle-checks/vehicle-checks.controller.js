'use strict';

const asyncHandler = require('../../common/asyncHandler');
const ApiError = require('../../common/apiError');
const { ok, created, noContent } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./vehicle-checks.service');
const { relativePath } = require('../../middlewares/upload.middleware');

const UPLOAD_SUBPATH = 'vehicleupload';

// ── Employee ──────────────────────────────────────────────────

const employeeCreate = asyncHandler(async (req, res) => {
  const data = await service.createCheck(req.user.name, req.body);
  return created(res, data);
});

const employeeList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { data, total } = await service.getMyChecks(req.user.name, { limit, offset, search });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const data = await service.getMyCheckById(req.user.name, req.params.id);
  return ok(res, data);
});

// ── Admin ─────────────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search, searchDate, status } = req.query;
  const { data, total } = await service.getAll({ search, searchDate, status, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, data);
});

const adminCreate = asyncHandler(async (req, res) => {
  const data = await service.adminCreate(req.body);
  return created(res, data);
});

const adminUpdate = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  return ok(res, data);
});

const adminDelete = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return noContent(res);
});

// ── Documents ─────────────────────────────────────────────────

const adminGetDocuments = asyncHandler(async (req, res) => {
  const data = await service.getDocuments(req.params.id);
  return ok(res, data);
});

const adminUploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const fileName = relativePath(UPLOAD_SUBPATH, req.file.filename);
  const data = await service.uploadDocument(req.params.id, req.user.name, fileName);
  return created(res, data);
});

const adminDeleteDocument = asyncHandler(async (req, res) => {
  await service.removeDocument(req.params.id, req.params.docId);
  return noContent(res);
});

module.exports = {
  employeeCreate,
  employeeList,
  employeeGetById,
  adminList,
  adminGetById,
  adminCreate,
  adminUpdate,
  adminDelete,
  adminGetDocuments,
  adminUploadDocument,
  adminDeleteDocument,
};

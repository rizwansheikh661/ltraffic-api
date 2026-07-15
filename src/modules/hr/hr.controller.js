'use strict';

const asyncHandler = require('../../common/asyncHandler');
const ApiError = require('../../common/apiError');
const { ok, noContent, created } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./hr.service');
const { relativePath } = require('../../middlewares/upload.middleware');

const UPLOAD_SUBPATH = 'hrfiles';

// ── List / View ────────────────────────────────────────────────

const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { data, total } = await service.getAll({ search, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const getById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, data);
});

// ── Edit / Delete ──────────────────────────────────────────────

const update = asyncHandler(async (req, res) => {
  const data = await service.updateEmployee(req.params.id, req.body);
  return ok(res, data);
});

const remove = asyncHandler(async (req, res) => {
  await service.removeEmployee(req.params.id);
  return noContent(res);
});

// ── Documents ──────────────────────────────────────────────────

const listDocuments = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search, searchDate } = req.query;
  const { data, total } = await service.getDocuments(req.params.id, { search, searchDate, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const fileName = relativePath(UPLOAD_SUBPATH, req.file.filename);
  const data = await service.uploadDocument(
    req.params.id,
    req.user.name,
    req.body.doctype,
    req.body.docdesc,
    fileName,
  );
  return created(res, data);
});

const deleteDocument = asyncHandler(async (req, res) => {
  await service.removeDocument(req.params.id, req.params.docId);
  return noContent(res);
});

module.exports = {
  list,
  getById,
  update,
  remove,
  listDocuments,
  uploadDocument,
  deleteDocument,
};

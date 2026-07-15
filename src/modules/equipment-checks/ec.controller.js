'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok, noContent, created } = require('../../common/response');
const pagination = require('../../common/pagination');
const ApiError = require('../../common/apiError');
const { relativePath } = require('../../middlewares/upload.middleware');
const { fileUrl } = require('../../utils/url.helper');
const { addImageUrls: addImageUrlsGeneric, buildImagePath } = require('../../utils/file.helper');
const service = require('./ec.service');

const UPLOAD_SUBPATH = 'equipmentcheck';
const DOC_UPLOAD_SUBPATH = 'presite';
const EC_IMAGE_COLS = ['image'];

function addImageUrls(row) { return addImageUrlsGeneric(row, EC_IMAGE_COLS); }

// ── Employee handlers ─────────────────────────────────────────

const employeeSubmit = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('At least one image is required');
  }
  const imagePath = buildImagePath(UPLOAD_SUBPATH, req.files);
  const data = await service.submitCheck(req.user.name, req.body, imagePath);
  return created(res, addImageUrls(data));
});

const employeeList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { rows, total } = await service.getOwnChecks(req.user.name, { search, limit, offset });
  const data = rows.map(addImageUrls);
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const data = await service.getOwnCheckById(req.user.name, req.params.id);
  return ok(res, addImageUrls(data));
});

// ── Admin handlers ────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { rows, total } = await service.getAll({ search, limit, offset });
  const data = rows.map(addImageUrls);
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, addImageUrls(data));
});

const adminUpdate = asyncHandler(async (req, res) => {
  const data = await service.updateCheck(req.params.id, req.body);
  return ok(res, addImageUrls(data));
});

const adminRemove = asyncHandler(async (req, res) => {
  await service.removeCheck(req.params.id);
  return noContent(res);
});

const adminListDocuments = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { rows, total } = await service.getDocuments(req.params.id, { search, limit, offset });
  const data = rows.map((row) => ({
    ...row,
    file_url: row.file_name ? fileUrl(row.file_name) : null,
  }));
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const adminUploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const fileName = relativePath(DOC_UPLOAD_SUBPATH, req.file.filename);
  const { docdesc } = req.body;
  const data = await service.uploadDocument(req.params.id, req.user.name, fileName, docdesc);
  return created(res, data);
});

const adminRemoveDocument = asyncHandler(async (req, res) => {
  await service.removeDocument(req.params.id, req.params.docId);
  return noContent(res);
});

module.exports = {
  employeeSubmit,
  employeeList,
  employeeGetById,
  adminList,
  adminGetById,
  adminUpdate,
  adminRemove,
  adminListDocuments,
  adminUploadDocument,
  adminRemoveDocument,
  UPLOAD_SUBPATH,
  DOC_UPLOAD_SUBPATH,
};

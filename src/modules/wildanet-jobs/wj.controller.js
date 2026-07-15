'use strict';

const asyncHandler = require('../../common/asyncHandler');
const ApiError = require('../../common/apiError');
const { ok, created, noContent } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./wj.service');
const { relativePath } = require('../../middlewares/upload.middleware');
const { buildImagePath } = require('../../utils/file.helper');

const JOB_PACK_SUBPATH = 'jobpacks';
const DOC_SUBPATH = 'wildanet';

// ── Employee ─────────────────────────────────────────────────

const employeeList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search, assignedto } = req.query;
  const { data, total } = await service.getActiveJobs({ search, searchAssignedto: assignedto, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const data = await service.getJobById(req.params.id);
  return ok(res, data);
});

const employeeGetDocuments = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { data, total } = await service.getDocuments(req.params.id, { search, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

// ── Admin ────────────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search, assignedto, jobstatus, permitstatus } = req.query;
  const { data, total } = await service.getAllJobs({
    search,
    searchAssignedto: assignedto,
    searchJobstatus: jobstatus,
    searchPermitstatus: permitstatus,
    limit,
    offset,
  });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const data = await service.getJobById(req.params.id);
  return ok(res, data);
});

const adminCreate = asyncHandler(async (req, res) => {
  const imagePath = buildImagePath(JOB_PACK_SUBPATH, req.files);
  const data = await service.createJob(req.body, imagePath);
  return created(res, data);
});

const adminUpdate = asyncHandler(async (req, res) => {
  const data = await service.updateJob(req.params.id, req.body);
  return ok(res, data);
});

const adminDelete = asyncHandler(async (req, res) => {
  await service.removeJob(req.params.id);
  return noContent(res);
});

const adminGetDocuments = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { data, total } = await service.getDocuments(req.params.id, { search, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const adminUploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const fileName = relativePath(DOC_SUBPATH, req.file.filename);
  const data = await service.uploadDocument(
    req.params.id,
    req.user.name,
    fileName,
    req.body.doctype,
    req.body.docdesc,
  );
  return created(res, data);
});

const adminDeleteDocument = asyncHandler(async (req, res) => {
  await service.removeDocument(req.params.id, req.params.docId);
  return noContent(res);
});

module.exports = {
  employeeList,
  employeeGetById,
  employeeGetDocuments,
  adminList,
  adminGetById,
  adminCreate,
  adminUpdate,
  adminDelete,
  adminGetDocuments,
  adminUploadDocument,
  adminDeleteDocument,
};

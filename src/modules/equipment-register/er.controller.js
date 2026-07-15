'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok, noContent, created } = require('../../common/response');
const pagination = require('../../common/pagination');
const ApiError = require('../../common/apiError');
const { relativePath } = require('../../middlewares/upload.middleware');
const { fileUrl } = require('../../utils/url.helper');
const service = require('./er.service');

const UPLOAD_SUBPATH = 'erfiles';

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

const create = asyncHandler(async (req, res) => {
  const data = await service.createEntry(req.body);
  return created(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await service.updateEntry(req.params.id, req.body);
  return ok(res, data);
});

const remove = asyncHandler(async (req, res) => {
  await service.removeEntry(req.params.id);
  return noContent(res);
});

const listDocuments = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { rows, total } = await service.getDocuments({ erId: req.params.id, search, limit, offset });
  const data = rows.map((row) => ({
    ...row,
    file_url: row.file_name ? fileUrl(row.file_name) : null,
  }));
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const fileName = relativePath(UPLOAD_SUBPATH, req.file.filename);
  const { doctype, docdesc } = req.body;
  const data = await service.uploadDocument(req.params.id, req.user.name, fileName, doctype, docdesc);
  return created(res, data);
});

const removeDocument = asyncHandler(async (req, res) => {
  await service.removeDocument(req.params.id, req.params.docId);
  return noContent(res);
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  listDocuments,
  uploadDocument,
  removeDocument,
  UPLOAD_SUBPATH,
};

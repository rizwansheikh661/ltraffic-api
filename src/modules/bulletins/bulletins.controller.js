'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./bulletins.service');

// ── Admin ──────────────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { search, searchRef, status } = req.query;
  const { data, total } = await service.getAll({ search, searchRef, status, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const adminGetById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ok(res, data);
});

const adminGetReaders = asyncHandler(async (req, res) => {
  const data = await service.getReaders(req.params.id);
  return ok(res, data);
});

const adminCreate = asyncHandler(async (req, res) => {
  const fields = { ...req.body };
  if (req.files?.image?.[0]) fields.image = req.files.image[0].filename;
  if (req.files?.download?.[0]) fields.download = req.files.download[0].filename;
  const data = await service.create(fields);
  return created(res, data);
});

const adminUpdate = asyncHandler(async (req, res) => {
  const fields = { ...req.body };
  if (req.files?.image?.[0]) fields.image = req.files.image[0].filename;
  if (req.files?.download?.[0]) fields.download = req.files.download[0].filename;
  const data = await service.update(req.params.id, fields);
  return ok(res, data);
});

const adminDelete = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return noContent(res);
});

// ── Employee ───────────────────────────────────────────────────

const employeePending = asyncHandler(async (req, res) => {
  const data = await service.getPending(req.user.id);
  return ok(res, data);
});

const employeeList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination.parse(req.query);
  const { data, total } = await service.getEmployeeList(req.user.id, { limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const employeeGetById = asyncHandler(async (req, res) => {
  const data = await service.getEmployeeById(req.params.id, req.user.id);
  return ok(res, data);
});

const employeeAcknowledge = asyncHandler(async (req, res) => {
  const data = await service.acknowledge(req.params.id, req.user);
  return ok(res, data);
});

module.exports = {
  adminList,
  adminGetById,
  adminGetReaders,
  adminCreate,
  adminUpdate,
  adminDelete,
  employeePending,
  employeeList,
  employeeGetById,
  employeeAcknowledge,
};

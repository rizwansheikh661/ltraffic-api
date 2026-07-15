'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./documents.service');

const list = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { page, limit, offset } = pagination.parse(req.query);
  const { search } = req.query;
  const { data, total } = await service.getAll(type, { search, limit, offset });
  return ok(res, data, pagination.meta({ page, limit }, total));
});

const getById = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const data = await service.getById(type, id);
  return ok(res, data);
});

const adminCreate = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const data = await service.create(type, req.body);
  return created(res, data);
});

const adminUpdate = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const data = await service.update(type, id, req.body);
  return ok(res, data);
});

const adminDelete = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  await service.remove(type, id);
  return noContent(res);
});

module.exports = {
  list,
  getById,
  adminCreate,
  adminUpdate,
  adminDelete,
};

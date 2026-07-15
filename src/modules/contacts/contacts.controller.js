'use strict';

const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const pagination = require('../../common/pagination');
const service = require('./contacts.service');

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

module.exports = {
  list,
  getById,
};

'use strict';

const { z } = require('zod');

const DOC_TYPES = ['policies', 'method-statements', 'processes', 'coshh'];

const TypeParamSchema = z.object({
  type: z.enum(DOC_TYPES),
});

const TypeIdParamSchema = z.object({
  type: z.enum(DOC_TYPES),
  id: z.coerce.number().int().positive(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  search: z.string().optional(),
});

const CreateSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  title: z.string().min(1, 'Title is required'),
  version: z.string().min(1, 'Version is required'),
});

const UpdateSchema = z.object({
  reference: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
});

module.exports = {
  DOC_TYPES,
  TypeParamSchema,
  TypeIdParamSchema,
  ListQuerySchema,
  CreateSchema,
  UpdateSchema,
};

'use strict';

const { z } = require('zod');

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  searchRef: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const CreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  ref: z.string().min(1, 'Reference is required').max(255),
  description: z.string().min(1, 'Description is required'),
  new: z.union([z.literal('0'), z.literal('1')]).default('1'),
});

const UpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  ref: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  new: z.union([z.literal('0'), z.literal('1')]).optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = { ListQuerySchema, CreateSchema, UpdateSchema, IdParamSchema };

'use strict';

const { z } = require('zod');

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['submitted', 'approved', 'draft', 'all']).optional(),
});

const EmployeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected']).optional(),
});

const DaySchema = z.object({
  date: z.string().default(''),
  hours: z.string().default('0'),
  location: z.string().default(''),
  activity: z.string().default(''),
  contract: z.string().default(''),
});

const CreateSchema = z.object({
  week: z.string().min(1, 'Week commencing is required'),
  days: z.array(DaySchema).min(1).max(7),
  comments: z.string().default(''),
});

const AdminCreateSchema = z.object({
  name: z.string().min(1, 'Operative name is required'),
  ltrafficid: z.string().optional(),
  week: z.string().min(1, 'Week commencing is required'),
  days: z.array(DaySchema).min(1).max(7),
  comments: z.string().default(''),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  ListQuerySchema,
  EmployeeListQuerySchema,
  CreateSchema,
  AdminCreateSchema,
  IdParamSchema,
};

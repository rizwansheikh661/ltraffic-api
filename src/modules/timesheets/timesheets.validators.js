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
  date: z.string().trim().min(1, 'A submission date is required'),
  hours: z.string().default('0'),
  location: z.string().default(''),
  activity: z.string().default(''),
  contract: z.string().default(''),
});

const daysSchema = z.array(DaySchema).min(1).max(7).superRefine((days, ctx) => {
  const seen = new Set();
  days.forEach((day, index) => {
    if (seen.has(day.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'date'],
        message: 'Each selected date may only appear once',
      });
    }
    seen.add(day.date);
  });
});

const CreateSchema = z.object({
  week: z.string().min(1, 'Week commencing is required'),
  days: daysSchema,
  comments: z.string().default(''),
});

const AdminCreateSchema = z.object({
  name: z.string().min(1, 'Operative name is required'),
  ltrafficid: z.string().optional(),
  week: z.string().min(1, 'Week commencing is required'),
  days: daysSchema,
  comments: z.string().default(''),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const OptionTypeSchema = z.enum(['activity', 'contract']);
const OptionListQuerySchema = z.object({
  type: OptionTypeSchema.optional(),
  includeInactive: z.coerce.boolean().default(false),
});
const OptionIdParamSchema = z.object({
  optionId: z.coerce.number().int().positive(),
});
const CreateOptionSchema = z.object({
  type: OptionTypeSchema,
  name: z.string().trim().min(1).max(255),
  sort_order: z.coerce.number().int().min(0).max(100000).default(0),
});
const UpdateOptionSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  is_active: z.coerce.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(100000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required');

module.exports = {
  ListQuerySchema,
  EmployeeListQuerySchema,
  CreateSchema,
  AdminCreateSchema,
  IdParamSchema,
  OptionListQuerySchema,
  OptionIdParamSchema,
  CreateOptionSchema,
  UpdateOptionSchema,
};

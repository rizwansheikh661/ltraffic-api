'use strict';

const { z } = require('zod');

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  // `firstname` and `surname` preserve the two separate legacy PHP filters.
  // `search` remains available for clients already using the unified API.
  firstname: z.string().trim().min(1).max(100).optional(),
  surname: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const ContactFields = {
  employeeid: z.string().trim().min(1).max(100),
  firstname: z.string().trim().min(1).max(100),
  surname: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  jobtitle: z.string().trim().max(255).optional(),
  linemanager: z.string().trim().max(255).optional(),
  location: z.string().trim().max(255).optional(),
  photo_url: z.string().trim().url().max(2048).optional(),
};

const CreateSchema = z.object(ContactFields);

const UpdateSchema = z.object(
  Object.fromEntries(Object.entries(ContactFields).map(([key, schema]) => [key, schema.optional()])),
).refine((fields) => Object.keys(fields).length > 0, {
  message: 'Provide at least one contact field',
});

module.exports = {
  ListQuerySchema,
  IdParamSchema,
  CreateSchema,
  UpdateSchema,
};

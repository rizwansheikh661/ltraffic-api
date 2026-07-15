'use strict';

const { z } = require('zod');

const CABINET_AREAS = [
  'Germoe, Penzance', 'Helston', 'Leedstown', 'Marazion',
  'Penzance', 'St Buryan', 'St Ives',
];

const SURFACE_TYPES = ['Footway', 'Carriageway'];

const TEST_RESULTS = ['Pass', 'Fail'];

const RETEST_RESULTS = ['N/a', 'Pass', 'Fail'];

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const CreateSchema = z.object({
  ct1: z.string().optional().default(''),
  ct2: z.string().min(1),
  ct5: z.enum(CABINET_AREAS),
  ct6: z.enum(SURFACE_TYPES),
  ct7: z.string().min(1),
  ct8: z.string().min(1),
  ct9: z.string().min(1),
  ct10: z.enum(TEST_RESULTS),
  ct11: z.string().optional().default(''),
  ct12: z.union([z.enum(RETEST_RESULTS), z.literal('')]).optional().default(''),
  ct13: z.string().optional().default(''),
});

const UpdateSchema = z.object({
  ct1: z.string().optional(),
  ct2: z.string().min(1).optional(),
  ct3: z.string().optional(),
  ct4: z.string().optional(),
  ct5: z.string().optional(),
  ct6: z.string().optional(),
  ct7: z.string().optional(),
  ct8: z.string().optional(),
  ct9: z.string().optional(),
  ct10: z.string().optional(),
  ct11: z.string().optional(),
  ct12: z.string().optional(),
  ct13: z.string().optional(),
  image: z.string().optional(),
});

module.exports = {
  ListQuerySchema,
  IdParamSchema,
  CreateSchema,
  UpdateSchema,
  CABINET_AREAS,
  SURFACE_TYPES,
  TEST_RESULTS,
  RETEST_RESULTS,
};

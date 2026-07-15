'use strict';

const { z } = require('zod');

const SOURCES = ['civils', 'wildanet'];
const YES_NO_NA = ['Yes', 'No', 'N/a'];
const PART_RESULT = ['Pass', 'Fail', 'Follow Up Required', 'N/a'];
const INSP_RESULT = ['Pass', 'Follow Up Required', 'Fail'];
const STATUSES = ['In Progress', 'Inspection Awaiting Review', 'Pass', 'Completed', 'Failed', 'Follow up Required'];

const SourceQuerySchema = z.object({
  source: z.enum(SOURCES),
});

const ListQuerySchema = z.object({
  source: z.enum(SOURCES),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['live', 'completed']).optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const PartParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  partNum: z.coerce.number().int().min(2).max(8),
});

const Part1Schema = z.object({
  civilsId: z.coerce.number().int().positive(),
  in7: z.string().optional().default(''),
  in8: z.string().optional().default(''),
});

const ynn = z.enum(YES_NO_NA).optional().default('N/a');

const Part2Schema = z.object({
  in9: ynn, in10: ynn, in11: ynn, in12: ynn, in13: ynn, in14: ynn, in15: ynn,
  in16: ynn, in17: ynn, in18: ynn, in19: ynn, in20: ynn, in21: ynn, in22: ynn,
  in23: z.string().optional().default(''),
  pt2r: z.enum(PART_RESULT).optional().default('Pass'),
});

const Part3Schema = z.object({
  in24: ynn, in25: ynn, in26: ynn, in27: ynn, in28: ynn,
  in29: z.string().optional().default(''),
  pt3r: z.enum(PART_RESULT).optional().default('Pass'),
});

const Part4Schema = z.object({
  in30: ynn, in31: ynn, in32: ynn, in33: ynn, in34: ynn, in35: ynn,
  in36: z.string().optional().default(''),
  pt4r: z.enum(PART_RESULT).optional().default('Pass'),
});

const Part5Schema = z.object({
  in37: ynn, in38: ynn, in39: ynn, in40: ynn, in41: ynn,
  in42: z.string().optional().default(''),
  pt5r: z.enum(PART_RESULT).optional().default('Pass'),
});

const Part6Schema = z.object({
  in43: ynn, in44: ynn, in45: ynn, in46: ynn, in47: ynn, in48: ynn, in49: ynn,
  in50: ynn, in51: ynn, in52: ynn, in53: ynn, in54: ynn, in55: ynn,
  in56: z.string().optional().default(''),
  pt6r: z.enum(PART_RESULT).optional().default('Pass'),
});

const Part7Schema = z.object({
  in57: ynn, in58: ynn, in59: ynn, in60: ynn,
  in61: z.string().optional().default(''),
  pt7r: z.enum(PART_RESULT).optional().default('Pass'),
});

const Part8Schema = z.object({
  in62: z.enum(INSP_RESULT).optional().default('Pass'),
  in63: z.string().optional().default(''),
});

const PART_SCHEMAS = { 2: Part2Schema, 3: Part3Schema, 4: Part4Schema, 5: Part5Schema, 6: Part6Schema, 7: Part7Schema, 8: Part8Schema };

const AdminUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  in1: z.string().optional(), in2: z.string().optional(), in3: z.string().optional(),
  in5: z.string().optional(), in6: z.string().optional(), in7: z.string().optional(),
  in8: z.string().optional(), in62: z.string().optional(), in63: z.string().optional(),
}).passthrough();

module.exports = {
  SOURCES,
  SourceQuerySchema,
  ListQuerySchema,
  IdParamSchema,
  PartParamSchema,
  Part1Schema,
  PART_SCHEMAS,
  AdminUpdateSchema,
};

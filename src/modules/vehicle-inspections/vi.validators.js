'use strict';

const { z } = require('zod');

const PASS_FAIL = ['Pass', 'Fail'];
const PASS_FAIL_NA = ['Pass', 'Fail', 'N/a'];
const YES_NO = ['Yes', 'No'];
const STATUSES = ['In Progress', 'Completed'];

const pf = z.enum(PASS_FAIL).optional().default('Pass');
const pfna = z.enum(PASS_FAIL_NA).optional().default('Pass');

const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const PartParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  partNum: z.coerce.number().int().min(2).max(4),
});

const RepairParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  repairId: z.coerce.number().int().positive(),
});

const Part1Schema = z.object({
  vrId: z.coerce.number().int().positive(),
  vic3: z.string().optional().default(''),
  vic5: pf, vic6: pf, vic7: pf, vic8: pf, vic9: pf, vic10: pf,
  vic11: pf, vic12: pf, vic13: pf, vic14: pf, vic15: pf,
  vic16: pfna, vic17: pf, vic18: pfna, vic19: pf, vic20: pf, vic21: pf,
  vic22: pf, vic23: pf, vic24: pf, vic25: pfna, vic26: pfna,
  vic27: pf, vic28: pf, vic29: pfna, vic30: pf, vic31: pf, vic32: pf,
  vic33: pfna, vic34: pfna,
  vic35: z.string().optional().default(''),
  vic36: z.string().optional().default(''),
});

const Part2Schema = z.object({
  vic39: pf, vic40: pfna, vic41: pfna, vic42: pfna, vic43: pfna,
  vic44: pf, vic45: pfna, vic46: pf, vic47: pfna,
  vic48: pf, vic49: pf, vic50: pf,
  vic51: pf, vic52: pf, vic53: pf, vic54: pfna,
  vic55: pf, vic56: pf, vic57: pf, vic58: pf, vic59: pf, vic60: pf, vic61: pf, vic62: pf,
  vic63: pf, vic64: z.string().optional().default(''),
  vic65: pf, vic66: z.string().optional().default(''),
  vic67: pfna, vic68: z.string().optional().default(''),
  vic69: pf, vic70: z.string().optional().default(''),
  vic71: pf, vic72: z.string().optional().default(''),
  vic73: pfna, vic74: z.string().optional().default(''),
  vic75: z.string().optional().default(''),
  vic76: z.string().optional().default(''),
  vic77: z.string().optional().default(''),
});

const Part3Schema = z.object({
  vic89: pf, vic90: pf, vic91: pf, vic92: pf, vic93: pf, vic94: pf,
  vic95: pfna,
  vic96: pf, vic97: pf, vic98: pf,
  vic99: z.string().optional().default(''),
  vic100: z.string().optional().default(''),
});

const Part4Schema = z.object({
  vic103: z.enum(YES_NO).optional().default('Yes'),
  vic104: z.enum(YES_NO).optional().default('Yes'),
  vic105: z.string().optional().default(''),
  vic106: z.enum(YES_NO).optional().default('Yes'),
  vic107: z.string().optional().default(''),
  vic108: z.string().optional().default(''),
});

const PART_SCHEMAS = { 2: Part2Schema, 3: Part3Schema, 4: Part4Schema };

const VirCreateSchema = z.object({
  vir2: z.string().optional().default(''),
  vir3: z.string().optional().default(''),
  vir4: z.string().optional().default(''),
  vir5: z.enum(YES_NO).optional().default('Yes'),
  vir6: z.string().optional().default(''),
  vir7: z.enum(PASS_FAIL).optional().default('Pass'),
  vir8: z.string().optional().default(''),
});

const AdminUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  vic1: z.string().optional(), vic2: z.string().optional(), vic3: z.string().optional(),
  vic4: z.string().optional(), vic35: z.string().optional(), vic36: z.string().optional(),
  vic76: z.string().optional(), vic77: z.string().optional(),
  vic99: z.string().optional(), vic100: z.string().optional(),
  vic103: z.string().optional(), vic104: z.string().optional(),
  vic105: z.string().optional(), vic106: z.string().optional(),
  vic107: z.string().optional(), vic108: z.string().optional(),
}).passthrough();

module.exports = {
  STATUSES,
  ListQuerySchema,
  IdParamSchema,
  PartParamSchema,
  RepairParamSchema,
  Part1Schema,
  PART_SCHEMAS,
  VirCreateSchema,
  AdminUpdateSchema,
};

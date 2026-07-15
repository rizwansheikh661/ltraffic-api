'use strict';

const { z } = require('zod');

const SCOPE_OF_WORKS = [
  'Fibre Ducting Installation',
  'Remedial Works',
  'Reinstatement Works',
  'Rod & Rope Installation',
  'Street Furniture Installation',
  'Traffic Management',
];

const SITE_SUPERVISORS = [
  'Dave Avery - Tel: 07708 046 382',
  'Dean Cairns - Tel: 07488 362 194',
  'Peter Cairns - Tel: 07368 183 656',
  'Martin Mudge - Tel: 077967 184 799',
];

const SITE_LEADS = [
  'CT1 - Lead: Marian Bonis - Cosmin Nistor, Gheorghe Cornean',
  'CT2 - Lead: Marian-Giorgel Pop - Ioan Nap, Andrei Erdie',
];

const VISITOR_EMPLOYERS = ['N/a', 'Wildanet', 'Highways'];

const YES_NO = ['Yes', 'No'];
const YES_NO_NA = ['Yes', 'No', 'N/a'];
const STATUSES = ['In Progress', 'RA Completed'];

const ListQuerySchema = z.object({
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
  partNum: z.coerce.number().int().min(2).max(5),
});

const Part1Schema = z.object({
  wildanetId: z.coerce.number().int().positive(),
  ra1: z.string().optional().default('Wildanet Project'),
  ra8: z.enum(SCOPE_OF_WORKS),
  ra9: z.enum(YES_NO),
  ra10: z.enum(YES_NO),
  ra11: z.enum(YES_NO),
  ra12: z.string().optional().default(''),
});

const yn = z.enum(YES_NO);
const ynna = z.enum(YES_NO_NA);
const optStr = z.string().optional().default('');
const optEmployer = z.enum(VISITOR_EMPLOYERS).optional().default('N/a');

const Part2Schema = z.object({
  ra14: z.enum(SITE_SUPERVISORS),
  ra15: z.enum(SITE_LEADS),
  ra16: optStr,
  ra17: optStr,
  ra18: optStr,
  ra19: optStr,
  ra20: optStr,
  ra21: optStr,
  ra22: optStr,
  ra23: optStr,
  ra24: optEmployer,
  ra25: optStr,
  ra26: optEmployer,
  ra27: optStr,
  ra28: optEmployer,
  ra29: optStr,
});

const Part3Schema = z.object({
  ra31: ynna, ra32: ynna, ra33: ynna, ra34: ynna, ra35: ynna,
  ra36: ynna, ra37: ynna, ra38: ynna, ra39: ynna, ra40: ynna,
  ra41: ynna, ra42: ynna, ra43: ynna, ra44: ynna, ra45: ynna,
  ra46: ynna, ra47: ynna, ra48: ynna,
  ra49: optStr,
});

const Part4Schema = z.object({
  ra52: ynna, ra53: ynna, ra54: ynna, ra55: ynna, ra56: ynna,
  ra57: ynna, ra58: ynna, ra59: ynna, ra60: ynna, ra61: ynna,
  ra62: optStr,
});

const Part5Schema = z.object({
  ra66: yn, ra67: yn, ra68: yn,
  ra69: ynna, ra70: ynna, ra71: ynna, ra72: ynna,
  ra73: optStr,
});

const PART_SCHEMAS = { 2: Part2Schema, 3: Part3Schema, 4: Part4Schema, 5: Part5Schema };

const AdminUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  ra1: z.string().optional(), ra2: z.string().optional(), ra3: z.string().optional(),
  ra4: z.string().optional(), ra5: z.string().optional(), ra6: z.string().optional(),
  ra7: z.string().optional(), ra8: z.string().optional(), ra9: z.string().optional(),
  ra10: z.string().optional(), ra11: z.string().optional(), ra12: z.string().optional(),
  ra13: z.string().optional(), ra14: z.string().optional(), ra15: z.string().optional(),
  ra16: z.string().optional(), ra17: z.string().optional(), ra18: z.string().optional(),
  ra19: z.string().optional(), ra20: z.string().optional(), ra21: z.string().optional(),
  ra22: z.string().optional(), ra23: z.string().optional(), ra24: z.string().optional(),
  ra25: z.string().optional(), ra26: z.string().optional(), ra27: z.string().optional(),
  ra28: z.string().optional(), ra29: z.string().optional(),
  ra30: z.string().optional(), ra31: z.string().optional(), ra32: z.string().optional(),
  ra33: z.string().optional(), ra34: z.string().optional(), ra35: z.string().optional(),
  ra36: z.string().optional(), ra37: z.string().optional(), ra38: z.string().optional(),
  ra39: z.string().optional(), ra40: z.string().optional(), ra41: z.string().optional(),
  ra42: z.string().optional(), ra43: z.string().optional(), ra44: z.string().optional(),
  ra45: z.string().optional(), ra46: z.string().optional(), ra47: z.string().optional(),
  ra48: z.string().optional(), ra49: z.string().optional(),
  ra50: z.string().optional(), ra51: z.string().optional(), ra52: z.string().optional(),
  ra53: z.string().optional(), ra54: z.string().optional(), ra55: z.string().optional(),
  ra56: z.string().optional(), ra57: z.string().optional(), ra58: z.string().optional(),
  ra59: z.string().optional(), ra60: z.string().optional(), ra61: z.string().optional(),
  ra62: z.string().optional(), ra63: z.string().optional(),
  ra64: z.string().optional(), ra65: z.string().optional(), ra66: z.string().optional(),
  ra67: z.string().optional(), ra68: z.string().optional(), ra69: z.string().optional(),
  ra70: z.string().optional(), ra71: z.string().optional(), ra72: z.string().optional(),
  ra73: z.string().optional(), ra74: z.string().optional(),
  client: z.string().optional(),
  image: z.string().optional(), image1: z.string().optional(),
  image2: z.string().optional(), image3: z.string().optional(), image4: z.string().optional(),
}).passthrough();

module.exports = {
  ListQuerySchema,
  IdParamSchema,
  PartParamSchema,
  Part1Schema,
  PART_SCHEMAS,
  AdminUpdateSchema,
  SCOPE_OF_WORKS,
  SITE_SUPERVISORS,
  SITE_LEADS,
  VISITOR_EMPLOYERS,
  STATUSES,
};

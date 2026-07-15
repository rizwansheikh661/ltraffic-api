'use strict';

const { z } = require('zod');

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const USER_LEVELS = [
  'a:1:{i:0;s:1:"1";}',
  'a:1:{i:0;s:1:"2";}',
  'a:1:{i:0;s:1:"3";}',
  'a:1:{i:0;s:1:"4";}',
  'a:1:{i:0;s:1:"5";}',
  'a:1:{i:0;s:1:"6";}',
  'a:1:{i:0;s:1:"7";}',
  'a:1:{i:0;s:1:"8";}',
  'a:1:{i:0;s:1:"9";}',
];

const TEAMS = [
  'Director',
  'Traffic Signals Installation',
  'Traffic Signals Civils',
  'Traffic Signal Maintenance',
  'Utilities Civils',
  'Office Staff',
  'Customer',
];

const CreateSchema = z.object({
  user_level: z.enum(USER_LEVELS),
  restricted: z.coerce.number().int().min(0).max(1).default(0),
  username: z.string().min(1, 'Username is required'),
  name: z.string().min(1, 'Employee name is required'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  teamup: z.string().optional(),
  vehiclereg: z.string().optional(),
  ltrafficid: z.string().optional(),
  team: z.enum(TEAMS).optional(),
  name1: z.string().optional(),
  onboarding: z.string().optional(),
});

const UpdateSchema = z.object({
  user_level: z.enum(USER_LEVELS).optional(),
  restricted: z.coerce.number().int().min(0).max(1).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  teamup: z.string().optional(),
  vehiclereg: z.string().optional(),
  ltrafficid: z.string().optional(),
  team: z.enum(TEAMS).optional(),
  name1: z.string().optional(),
  onboarding: z.string().optional(),
});

module.exports = {
  ListQuerySchema,
  IdParamSchema,
  CreateSchema,
  UpdateSchema,
  USER_LEVELS,
  TEAMS,
};

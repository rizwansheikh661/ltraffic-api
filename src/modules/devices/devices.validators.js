'use strict';

const { z } = require('zod');

const RegisterSchema = z.object({
  token: z.string().trim().min(10).max(512),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().trim().max(32).optional(),
});

const UnregisterSchema = z.object({
  token: z.string().trim().min(10).max(512),
});

module.exports = { RegisterSchema, UnregisterSchema };

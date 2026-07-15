'use strict';

const { z } = require('zod');

const password = z.string().min(1).max(200); // upper bound guards against DoS via huge bcrypt inputs
const newPassword = z.string().min(8).max(72); // bcrypt truncates at 72 bytes

const LoginSchema = z.object({
  identifier: z.string().trim().max(255).optional(),
  username: z.string().trim().max(255).optional(),
  email: z.string().trim().max(255).optional(),
  password,
  deviceId: z.string().trim().max(128).optional(),
}).transform((v) => ({
  identifier: (v.identifier || v.username || v.email || '').trim(),
  password: v.password,
  deviceId: v.deviceId || null,
})).refine((v) => v.identifier.length > 0, {
  message: 'identifier is required (username or email)',
  path: ['identifier'],
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1).max(256),
});

const LogoutSchema = z.object({
  refreshToken: z.string().min(1).max(256),
});

const ChangePasswordSchema = z.object({
  currentPassword: password,
  newPassword,
});

const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

const ResetPasswordSchema = z.object({
  key: z.string().trim().length(32),
  newPassword,
});

module.exports = {
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
};

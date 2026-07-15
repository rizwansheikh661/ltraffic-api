'use strict';

const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const bool = (defaultValue = false) =>
  z
    .union([z.string(), z.boolean()])
    .transform((v) => {
      if (typeof v === 'boolean') return v;
      const s = String(v).trim().toLowerCase();
      return ['1', 'true', 'yes', 'on'].includes(s);
    })
    .default(defaultValue);

const csv = () =>
  z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  API_PREFIX: z.string().default('/api/v1'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('60d'),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(10),

  CORS_ORIGINS: csv(),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),

  // Shared with PHP web — MUST point at the PHP `employeesarea` document root in prod.
  // Dev fallback: ./dev-files/ for local testing without Apache/IIS.
  UPLOADS_ROOT: z.string().default('./dev-files'),
  // Public URL Apache/IIS serves UPLOADS_ROOT from. Falls back to PUBLIC_BASE_URL in dev.
  FILES_BASE_URL: z.string().default(''),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().default(25),

  FCM_ENABLED: bool(false),
  FCM_SERVICE_ACCOUNT_PATH: z.string().default(''),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),
  LOG_MAX_FILES: z.string().default('14d'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('[env] invalid configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = Object.freeze(parsed.data);

module.exports = env;

'use strict';

const path = require('path');
const fs = require('fs');
const winston = require('winston');
require('winston-daily-rotate-file');
const env = require('./env');

const logDir = path.resolve(process.cwd(), env.LOG_DIR);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// SEC-08 — redact PII and credential-adjacent fields. Case-insensitive match on the key name.
const SENSITIVE = new Set([
  'password', 'currentpassword', 'newpassword',
  'token', 'accesstoken', 'refreshtoken', 'access_token', 'refresh_token',
  'authorization', 'bearer', 'cookie', 'set-cookie',
  'secret', 'apikey', 'api_key',
  'email', 'identifier',
  'md5_snapshot', 'bcrypt_hash',
  'key', // login_confirm reset key
]);

const redact = winston.format((info) => {
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach((k) => {
      const key = k.toLowerCase();
      if (SENSITIVE.has(key)) {
        obj[k] = '***';
      } else if (typeof obj[k] === 'object') {
        walk(obj[k]);
      }
    });
    return obj;
  };
  walk(info);
  return info;
});

const jsonFormat = winston.format.combine(
  redact(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const prettyFormat = winston.format.combine(
  redact(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, requestId, ...rest } = info;
    const req = requestId ? ` [${requestId}]` : '';
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    return `${timestamp} ${level}${req} ${message}${meta}`;
  }),
);

const transports = [
  new winston.transports.DailyRotateFile({
    dirname: logDir,
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: env.LOG_MAX_FILES,
    format: jsonFormat,
    level: env.LOG_LEVEL,
  }),
  new winston.transports.DailyRotateFile({
    dirname: logDir,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: env.LOG_MAX_FILES,
    format: jsonFormat,
    level: 'error',
  }),
];

if (env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: prettyFormat,
      level: env.LOG_LEVEL,
    }),
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'ltraffic-api' },
  transports,
  exitOnError: false,
});

module.exports = logger;

'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const md5 = require('md5');
const env = require('../config/env');

const MD5_RE = /^[a-f0-9]{32}$/i;
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

function detectFormat(hash) {
  if (typeof hash !== 'string') return 'unknown';
  if (BCRYPT_RE.test(hash)) return 'bcrypt';
  if (MD5_RE.test(hash)) return 'md5';
  return 'unknown';
}

function verifyMd5(plain, hash) {
  // SEC-10 — constant-time compare. Both sides are hex; force to lowercase Buffer of equal length.
  const a = Buffer.from(md5(String(plain)), 'utf8');
  const b = Buffer.from(String(hash).toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function verifyBcrypt(plain, hash) {
  return bcrypt.compare(String(plain), String(hash));
}

async function hashBcrypt(plain) {
  return bcrypt.hash(String(plain), env.BCRYPT_COST);
}

module.exports = {
  detectFormat,
  verifyMd5,
  verifyBcrypt,
  hashBcrypt,
  MD5_RE,
  BCRYPT_RE,
};

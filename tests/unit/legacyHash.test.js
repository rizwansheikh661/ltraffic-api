'use strict';

const md5 = require('md5');
const bcrypt = require('bcryptjs');
const {
  detectFormat,
  verifyMd5,
  verifyBcrypt,
  hashBcrypt,
  MD5_RE,
  BCRYPT_RE,
} = require('../../src/utils/legacyHash.helper');

describe('legacyHash.helper', () => {
  describe('detectFormat', () => {
    test('recognises bcrypt', () => {
      expect(detectFormat('$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123')).toBe('bcrypt');
      expect(detectFormat('$2b$10$xxxxxxxxxxxxxxxxxxxxxx')).toBe('bcrypt');
      expect(detectFormat('$2y$12$xxxxxxxxxxxxxxxxxxxxxx')).toBe('bcrypt');
    });
    test('recognises md5', () => {
      expect(detectFormat(md5('anything'))).toBe('md5');
      expect(detectFormat('a'.repeat(32))).toBe('md5');
    });
    test('rejects unknown formats', () => {
      expect(detectFormat('plaintext')).toBe('unknown');
      expect(detectFormat('')).toBe('unknown');
      expect(detectFormat(null)).toBe('unknown');
      expect(detectFormat(undefined)).toBe('unknown');
      expect(detectFormat(12345)).toBe('unknown');
    });
  });

  describe('verifyMd5 (SEC-10 constant-time)', () => {
    test('accepts matching plaintext', () => {
      expect(verifyMd5('Test1234!', md5('Test1234!'))).toBe(true);
    });
    test('is case-insensitive on hash side', () => {
      expect(verifyMd5('Test1234!', md5('Test1234!').toUpperCase())).toBe(true);
    });
    test('rejects wrong plaintext', () => {
      expect(verifyMd5('wrong', md5('Test1234!'))).toBe(false);
    });
    test('rejects wrong-length hash without throwing', () => {
      expect(verifyMd5('anything', 'tooshort')).toBe(false);
    });
  });

  describe('verifyBcrypt / hashBcrypt', () => {
    test('hash then verify round-trips', async () => {
      const h = await hashBcrypt('Test1234!');
      expect(BCRYPT_RE.test(h)).toBe(true);
      expect(await verifyBcrypt('Test1234!', h)).toBe(true);
    });
    test('verify rejects wrong password', async () => {
      const h = await hashBcrypt('Test1234!');
      expect(await verifyBcrypt('WrongPw', h)).toBe(false);
    });
    test('verify against a dummy hash does not throw and returns false', async () => {
      // used by SEC-04 unknown-user timing burn
      const dummy = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.tCkFqOZBUXWue0Thq9StjUM0uabc';
      expect(await verifyBcrypt('anything', dummy)).toBe(false);
    });
  });

  test('regex constants match expected shapes', () => {
    expect(MD5_RE.test(md5('x'))).toBe(true);
    expect(BCRYPT_RE.test('$2a$10$abcdefghijklmnopqrstuv')).toBe(true);
    expect(MD5_RE.test('nope')).toBe(false);
    expect(BCRYPT_RE.test('$1$abc')).toBe(false);
  });
});

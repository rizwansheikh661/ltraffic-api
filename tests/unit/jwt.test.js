'use strict';

// Isolate env before requiring code that reads it.
process.env.JWT_SECRET = 'test-secret-for-unit-tests-only';
process.env.JWT_ACCESS_EXPIRES = '15m';

const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');

// levels.cache is touched by signAccessToken → mock it.
jest.mock('../../src/modules/auth/levels.cache', () => ({
  idsToNames: (ids) => (ids || []).map((id) => (id === 1 ? 'Admin' : `Level${id}`)),
}));

const { _internal } = require('../../src/modules/auth/auth.service');

describe('signAccessToken (SEC-03 issuer + HS256)', () => {
  const user = {
    user_id: 42,
    username: 'admin',
    email: 'a@b.co',
    user_level: 'a:1:{i:0;s:1:"1";}',
    ltrafficid: 'LT-1',
    name: 'Alice',
  };

  test('produces a token that verifies with HS256 + issuer pin', () => {
    const token = _internal.signAccessToken(user);
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'ltraffic-api',
    });
    expect(decoded.sub).toBe('42');
    expect(decoded.iss).toBe('ltraffic-api');
    expect(decoded.username).toBe('admin');
    expect(decoded.userType).toBe('admin');
    expect(decoded.roles).toContain('Admin');
    expect(decoded.levelIds).toEqual([1]);
    expect(decoded.jti).toBeDefined();
  });

  test('rejects verification with a different issuer', () => {
    const token = _internal.signAccessToken(user);
    expect(() => jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'other-service',
    })).toThrow();
  });

  test('rejects verification with a different algorithm', () => {
    const token = _internal.signAccessToken(user);
    // An HS256 token cannot be verified as RS256.
    expect(() => jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['RS256'],
      issuer: 'ltraffic-api',
    })).toThrow();
  });

  test('SEC-03 — alg=none tokens are rejected under the pin', () => {
    const bogus = jwt.sign({ sub: '1', iss: 'ltraffic-api' }, 'anything', { algorithm: 'none' });
    expect(() => jwt.verify(bogus, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'ltraffic-api',
    })).toThrow();
  });
});

describe('sha256 / newOpaqueToken', () => {
  test('sha256 is deterministic and hex', () => {
    const a = _internal.sha256('abc');
    const b = _internal.sha256('abc');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
  test('newOpaqueToken is 64 hex chars and unique', () => {
    const t1 = _internal.newOpaqueToken();
    const t2 = _internal.newOpaqueToken();
    expect(t1).toMatch(/^[a-f0-9]{64}$/);
    expect(t2).toMatch(/^[a-f0-9]{64}$/);
    expect(t1).not.toBe(t2);
  });
});

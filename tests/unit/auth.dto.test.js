'use strict';

// Mock the levels cache so we do not require a live DB for pure DTO tests.
jest.mock('../../src/modules/auth/levels.cache', () => ({
  idsToNames: (ids) => (ids || []).map((id) => (id === 1 ? 'Admin' : `Level${id}`)),
}));

const { resolveLevels, userTypeFromLevelIds, publicUser } = require('../../src/modules/auth/auth.dto');

describe('auth.dto', () => {
  describe('resolveLevels', () => {
    test('parses PHP-serialised single-id array a:1:{i:0;s:1:"1";}', () => {
      expect(resolveLevels('a:1:{i:0;s:1:"1";}')).toEqual([1]);
    });
    test('parses two-id array a:2:{i:0;s:1:"1";i:1;s:1:"4";}', () => {
      expect(resolveLevels('a:2:{i:0;s:1:"1";i:1;s:1:"4";}')).toEqual([1, 4]);
    });
    test('parses a bare serialised integer i:2;', () => {
      expect(resolveLevels('i:2;')).toEqual([2]);
    });
    test('drops non-positive / non-integer entries', () => {
      expect(resolveLevels('a:2:{i:0;s:1:"0";i:1;s:2:"-1";}')).toEqual([]);
    });
    test('returns [] for null/empty', () => {
      expect(resolveLevels(null)).toEqual([]);
      expect(resolveLevels('')).toEqual([]);
    });
  });

  describe('userTypeFromLevelIds', () => {
    test('flags admin when 1 is present', () => {
      expect(userTypeFromLevelIds([1, 3])).toBe('admin');
    });
    test('flags admin for other admin-level ids', () => {
      expect(userTypeFromLevelIds([4])).toBe('admin'); // Admin1
      expect(userTypeFromLevelIds([7])).toBe('admin'); // Admin2
      expect(userTypeFromLevelIds([8])).toBe('admin'); // Essex Supervisor
    });
    test('employee otherwise', () => {
      expect(userTypeFromLevelIds([2])).toBe('employee');
      expect(userTypeFromLevelIds([3])).toBe('employee');
      expect(userTypeFromLevelIds([])).toBe('employee');
    });
  });

  describe('publicUser', () => {
    test('shape excludes password, includes derived roles/userType', () => {
      const row = {
        user_id: '42',
        user_level: 'a:1:{i:0;s:1:"1";}',
        username: 'admin',
        name: 'Alice',
        name1: 'Alice A.',
        email: 'a@b.co',
        ltrafficid: 'LT-1',
        team: 'ops',
        password: 'MUST_NOT_LEAK',
      };
      const out = publicUser(row);
      expect(out).toEqual({
        id: 42,
        username: 'admin',
        name: 'Alice',
        email: 'a@b.co',
        ltrafficid: 'LT-1',
        team: 'ops',
        levelIds: [1],
        roles: ['Admin'],
        userType: 'admin',
      });
      expect(out.password).toBeUndefined();
    });
    test('falls back to name1 then username when name is missing', () => {
      expect(publicUser({ user_id: 1, user_level: 'i:2;', username: 'u', name1: 'From name1' }).name).toBe('From name1');
      expect(publicUser({ user_id: 1, user_level: 'i:2;', username: 'u' }).name).toBe('u');
    });
    test('null ltrafficid / team when missing', () => {
      const out = publicUser({ user_id: 1, user_level: 'i:2;', username: 'u' });
      expect(out.ltrafficid).toBeNull();
      expect(out.team).toBeNull();
    });
  });
});

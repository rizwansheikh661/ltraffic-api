'use strict';

/**
 * Integration tests — hit the real Express app against the real MySQL DB.
 * Uses a dedicated test user (see beforeAll) so no production rows are touched.
 * Cleanup runs in afterAll even on failure.
 *
 * Rate limits are relaxed via env before requiring the app.
 */

process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || '10000';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '100000';
// Shrink the rate-limit window so per-account limiter (SEC-05, max 5 per window)
// does not accumulate across tests that all log in as the same test user.
process.env.AUTH_RATE_LIMIT_WINDOW_MS = process.env.AUTH_RATE_LIMIT_WINDOW_MS || '250';
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '250';

require('dotenv').config();

const request = require('supertest');
const md5 = require('md5');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');
const env = require('../../src/config/env');
const db = require('../../src/config/db');
const levelsCache = require('../../src/modules/auth/levels.cache');

const TEST_USERNAME = `itest_${Date.now()}`;
const TEST_EMAIL = `${TEST_USERNAME}@ltraffic.test`;
const TEST_PASSWORD = 'ItestPw123!';
const TEST_LEVEL = 'a:1:{i:0;s:1:"1";}'; // admin

let testUserId = null;

beforeAll(async () => {
  await levelsCache.load();

  // create dedicated test user
  const [ins] = await db.pool.query(
    `INSERT INTO login_users (user_level, username, name, email, password)
     VALUES (:lvl, :u, :n, :e, :p)`,
    { lvl: TEST_LEVEL, u: TEST_USERNAME, n: 'Integration Test', e: TEST_EMAIL, p: md5(TEST_PASSWORD) },
  );
  testUserId = ins.insertId;
});

afterAll(async () => {
  if (testUserId) {
    await db.pool.query('DELETE FROM lt_refresh_tokens WHERE user_id = :id', { id: testUserId });
    await db.pool.query('DELETE FROM lt_user_credentials WHERE user_id = :id', { id: testUserId });
    await db.pool.query('DELETE FROM login_timestamps WHERE user_id = :id', { id: testUserId });
    await db.pool.query('DELETE FROM login_confirm WHERE email = :e', { e: TEST_EMAIL });
    await db.pool.query('DELETE FROM login_users WHERE user_id = :id', { id: testUserId });
  }
  await db.shutdown();
});

const P = env.API_PREFIX;

describe('Auth flow — integration', () => {
  let accessToken = null;
  let refreshToken = null;

  test('POST /auth/login (email) → 200 with tokens + public user', async () => {
    const r = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.accessToken).toBeDefined();
    expect(r.body.data.refreshToken).toBeDefined();
    expect(r.body.data.user).toEqual(expect.objectContaining({
      id: testUserId,
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      userType: 'admin',
    }));
    accessToken = r.body.data.accessToken;
    refreshToken = r.body.data.refreshToken;
  });

  test('POST /auth/login (username) → 200 (PERF-02 first-lookup path)', async () => {
    const r = await request(app)
      .post(`${P}/auth/login`)
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });
    expect(r.status).toBe(200);
  });

  test('POST /auth/login with wrong password → 401', async () => {
    const r = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: 'WrongPw999' });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  test('SEC-04 — unknown user & wrong password have similar latency', async () => {
    const t0 = Date.now();
    const r1 = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: 'no-such-user-9876@ltraffic.test', password: 'anything99' });
    const dtUnknown = Date.now() - t0;
    expect(r1.status).toBe(401);

    const t1 = Date.now();
    const r2 = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: 'WrongPw999' });
    const dtWrong = Date.now() - t1;
    expect(r2.status).toBe(401);

    // Allow generous slack for CI variance — signal we want: both paths are
    // bcrypt-bounded, not "unknown returns instantly" vs "wrong runs bcrypt".
    expect(Math.abs(dtUnknown - dtWrong)).toBeLessThan(400);
  });

  test('POST /auth/login with malformed body → 422', async () => {
    const r = await request(app).post(`${P}/auth/login`).send({});
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('GET /auth/me with valid bearer → 200', async () => {
    const r = await request(app)
      .get(`${P}/auth/me`)
      .set('authorization', `Bearer ${accessToken}`);
    expect(r.status).toBe(200);
    expect(r.body.data.username).toBe(TEST_USERNAME);
  });

  test('SEC-02 — query-string token must NOT authenticate', async () => {
    const r = await request(app).get(`${P}/auth/me?access_token=${encodeURIComponent(accessToken)}`);
    expect(r.status).toBe(401);
  });

  test('SEC-03 — alg=none tokens are rejected', async () => {
    const bogus = jwt.sign({ sub: '1', level: 1 }, 'anything', { algorithm: 'none' });
    const r = await request(app)
      .get(`${P}/auth/me`)
      .set('authorization', `Bearer ${bogus}`);
    expect(r.status).toBe(401);
  });

  test('SEC-03 — token with wrong issuer is rejected', async () => {
    const bogus = jwt.sign({ sub: '1', level: 1 }, env.JWT_SECRET, {
      algorithm: 'HS256', issuer: 'other-issuer',
    });
    const r = await request(app)
      .get(`${P}/auth/me`)
      .set('authorization', `Bearer ${bogus}`);
    expect(r.status).toBe(401);
  });

  test('POST /auth/refresh rotates the refresh token', async () => {
    const r = await request(app)
      .post(`${P}/auth/refresh`)
      .send({ refreshToken });
    expect(r.status).toBe(200);
    expect(r.body.data.refreshToken).toBeDefined();
    expect(r.body.data.refreshToken).not.toBe(refreshToken);

    // replay attempt with the old token
    const r2 = await request(app)
      .post(`${P}/auth/refresh`)
      .send({ refreshToken });
    expect(r2.status).toBe(401);

    refreshToken = r.body.data.refreshToken;
  });

  test('POST /auth/logout revokes the current refresh token', async () => {
    const r = await request(app)
      .post(`${P}/auth/logout`)
      .send({ refreshToken });
    expect(r.status).toBe(200);
    expect(r.body.data.revoked).toBe(true);

    // logout again is a no-op (revoked=false)
    const r2 = await request(app)
      .post(`${P}/auth/logout`)
      .send({ refreshToken });
    expect(r2.body.data.revoked).toBe(false);
  });
});

describe('Change / forgot / reset — integration', () => {
  test('change-password requires auth', async () => {
    const r = await request(app)
      .post(`${P}/auth/change-password`)
      .send({ currentPassword: 'x', newPassword: 'Newpass12!' });
    expect(r.status).toBe(401);
  });

  test('change-password writes MD5 back and revokes tokens', async () => {
    const login = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const at = login.body.data.accessToken;
    const rt = login.body.data.refreshToken;

    const r = await request(app)
      .post(`${P}/auth/change-password`)
      .set('authorization', `Bearer ${at}`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'ChangedPw99!' });
    expect(r.status).toBe(200);

    const [[row]] = await db.pool.query(
      'SELECT password FROM login_users WHERE user_id = :id', { id: testUserId },
    );
    expect(row.password).toBe(md5('ChangedPw99!'));

    // existing refresh token must be revoked
    const rr = await request(app).post(`${P}/auth/refresh`).send({ refreshToken: rt });
    expect(rr.status).toBe(401);

    // restore for other tests
    const relog = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: 'ChangedPw99!' });
    await request(app)
      .post(`${P}/auth/change-password`)
      .set('authorization', `Bearer ${relog.body.data.accessToken}`)
      .send({ currentPassword: 'ChangedPw99!', newPassword: TEST_PASSWORD });
  });

  test('PHP-01 — forgot-password deletes prior row before insert', async () => {
    await db.pool.query('DELETE FROM login_confirm WHERE email = :e', { e: TEST_EMAIL });
    await request(app).post(`${P}/auth/forgot-password`).send({ email: TEST_EMAIL });
    const [[c1]] = await db.pool.query(
      'SELECT COUNT(*) AS n FROM login_confirm WHERE email = :e AND type = :t',
      { e: TEST_EMAIL, t: 'forgot_pw' },
    );
    expect(c1.n).toBe(1);
    await request(app).post(`${P}/auth/forgot-password`).send({ email: TEST_EMAIL });
    const [[c2]] = await db.pool.query(
      'SELECT COUNT(*) AS n FROM login_confirm WHERE email = :e AND type = :t',
      { e: TEST_EMAIL, t: 'forgot_pw' },
    );
    expect(c2.n).toBe(1);
  });

  test('forgot-password returns 202 for unknown email (no user enumeration)', async () => {
    const r = await request(app)
      .post(`${P}/auth/forgot-password`)
      .send({ email: 'nobody-9999@ltraffic.test' });
    expect(r.status).toBe(202);
    expect(r.body.data.requested).toBe(true);
  });

  test('PHP-02 — reset-password sets password, clears 2FA state, and revokes tokens', async () => {
    // seed a fresh key
    await db.pool.query('DELETE FROM login_confirm WHERE email = :e', { e: TEST_EMAIL });
    await request(app).post(`${P}/auth/forgot-password`).send({ email: TEST_EMAIL });
    const [[keyRow]] = await db.pool.query(
      'SELECT `key` AS k FROM login_confirm WHERE email = :e AND type = :t LIMIT 1',
      { e: TEST_EMAIL, t: 'forgot_pw' },
    );
    expect(keyRow.k).toBeDefined();

    // stage stale 2FA state to prove it's cleared
    await db.pool.query(
      "UPDATE login_users SET tmp_auth_token = 'STALE', sms_time = 1234 WHERE user_id = :id",
      { id: testUserId },
    );

    const r = await request(app)
      .post(`${P}/auth/reset-password`)
      .send({ key: keyRow.k, newPassword: TEST_PASSWORD });
    expect(r.status).toBe(200);
    expect(r.body.data.reset).toBe(true);

    const [[u]] = await db.pool.query(
      'SELECT password, tmp_auth_token, sms_time FROM login_users WHERE user_id = :id',
      { id: testUserId },
    );
    expect(u.password).toBe(md5(TEST_PASSWORD));
    expect(u.tmp_auth_token).toBeNull();
    expect(u.sms_time).toBeNull();

    // reset-key cannot be replayed
    const r2 = await request(app)
      .post(`${P}/auth/reset-password`)
      .send({ key: keyRow.k, newPassword: TEST_PASSWORD });
    expect(r2.status).toBe(400);
  });

  test('reset-password with a bogus key → 400', async () => {
    const r = await request(app)
      .post(`${P}/auth/reset-password`)
      .send({ key: 'z'.repeat(32), newPassword: 'AnotherPw!9' });
    expect(r.status).toBe(400);
  });
});

describe('Devices — integration', () => {
  let bearer = null;
  const androidToken = `it-fcm-token-${Date.now()}`;

  beforeAll(async () => {
    const r = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    bearer = r.body.data.accessToken;
  });

  afterAll(async () => {
    await db.pool.query('DELETE FROM lt_device_tokens WHERE user_id = :id', { id: testUserId })
      .catch(() => {}); // table name might differ; ignore
  });

  test('register → list → unregister round trip', async () => {
    const reg = await request(app)
      .post(`${P}/devices/register`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ token: androidToken, platform: 'android', appVersion: '1.0.0' });
    expect(reg.status).toBe(200);
    expect(reg.body.data.registered).toBe(true);

    const list = await request(app)
      .get(`${P}/devices`)
      .set('authorization', `Bearer ${bearer}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.some((d) => d.token === androidToken)).toBe(true);

    const un = await request(app)
      .post(`${P}/devices/unregister`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ token: androidToken });
    expect(un.status).toBe(200);
    expect(un.body.data.revoked).toBe(true);
  });

  test('devices endpoints require auth', async () => {
    expect((await request(app).get(`${P}/devices`)).status).toBe(401);
    expect((await request(app).post(`${P}/devices/register`).send({})).status).toBe(401);
    expect((await request(app).post(`${P}/devices/unregister`).send({})).status).toBe(401);
  });
});

describe('Swagger surface', () => {
  test('openapi.json has expected paths + schemas', async () => {
    const r = await request(app).get(`${P}/openapi.json`);
    expect(r.status).toBe(200);
    const paths = Object.keys(r.body.paths);
    expect(paths.length).toBeGreaterThanOrEqual(10);
    const schemas = Object.keys(r.body.components.schemas);
    for (const s of ['LoginResponse', 'RefreshResponse', 'LogoutResponse',
      'ChangePasswordResponse', 'ForgotPasswordResponse', 'ResetPasswordResponse',
      'DeviceRegisterRequest', 'DeviceListResponse', 'ErrorEnvelope']) {
      expect(schemas).toContain(s);
    }
  });
});

'use strict';

/**
 * Cross-system PHP <-> Node compatibility tests.
 *
 * We don't actually spawn PHP here — the parity contract is entirely at the
 * database layer:
 *   1. `login_users.password` is the canonical MD5 that PHP reads/writes.
 *   2. `lt_user_credentials` is a Node-side bcrypt sidecar that MUST self-heal
 *      whenever `md5_snapshot` diverges from live `login_users.password`.
 *
 * So we simulate PHP by writing MD5 directly to `login_users.password` and
 * asserting that:
 *   - Node reads what PHP writes (login works).
 *   - Node writes what PHP expects (login_users.password stays MD5).
 *   - When "PHP" changes the SoT behind Node's back, Node self-heals its cache.
 */

process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || '10000';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '100000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = process.env.AUTH_RATE_LIMIT_WINDOW_MS || '250';
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '250';

require('dotenv').config();

const request = require('supertest');
const md5 = require('md5');

const app = require('../../src/app');
const env = require('../../src/config/env');
const db = require('../../src/config/db');
const levelsCache = require('../../src/modules/auth/levels.cache');

const P = env.API_PREFIX;

const TEST_USERNAME = `parity_${Date.now()}`;
const TEST_EMAIL = `${TEST_USERNAME}@ltraffic.test`;
const PHP_PASSWORD = 'PhpWrote123!';
const NODE_PASSWORD = 'NodeWrote99!';

let userId = null;

beforeAll(async () => {
  await levelsCache.load();
  // Simulate a user created via PHP: MD5 password, no sidecar row.
  const [ins] = await db.pool.query(
    `INSERT INTO login_users (user_level, username, name, email, password)
     VALUES ('a:1:{i:0;s:1:"1";}', :u, :n, :e, :p)`,
    { u: TEST_USERNAME, n: 'PHP Parity', e: TEST_EMAIL, p: md5(PHP_PASSWORD) },
  );
  userId = ins.insertId;
});

afterAll(async () => {
  if (userId) {
    await db.pool.query('DELETE FROM lt_refresh_tokens WHERE user_id = :id', { id: userId });
    await db.pool.query('DELETE FROM lt_user_credentials WHERE user_id = :id', { id: userId });
    await db.pool.query('DELETE FROM login_timestamps WHERE user_id = :id', { id: userId });
    await db.pool.query('DELETE FROM login_confirm WHERE email = :e', { e: TEST_EMAIL });
    await db.pool.query('DELETE FROM login_users WHERE user_id = :id', { id: userId });
  }
  await db.shutdown();
});

describe('PHP -> Node compat', () => {
  test('Node logs in a user whose password was written by PHP (MD5 only, no sidecar)', async () => {
    const before = await db.pool.query(
      'SELECT COUNT(*) AS n FROM lt_user_credentials WHERE user_id = :id', { id: userId },
    );
    expect(before[0][0].n).toBe(0); // no sidecar yet

    const r = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: PHP_PASSWORD });
    expect(r.status).toBe(200);
  });

  test('after Node login, sidecar cache is rebuilt with md5_snapshot === live SoT', async () => {
    const [[sc]] = await db.pool.query(
      'SELECT md5_snapshot, bcrypt_hash FROM lt_user_credentials WHERE user_id = :id', { id: userId },
    );
    expect(sc).toBeDefined();
    expect(sc.md5_snapshot).toBe(md5(PHP_PASSWORD));
    expect(sc.bcrypt_hash).toMatch(/^\$2[aby]\$/);
  });
});

describe('Node -> PHP compat', () => {
  test('after Node change-password, login_users.password is the MD5 PHP expects', async () => {
    const login = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: PHP_PASSWORD });
    const at = login.body.data.accessToken;

    const chg = await request(app)
      .post(`${P}/auth/change-password`)
      .set('authorization', `Bearer ${at}`)
      .send({ currentPassword: PHP_PASSWORD, newPassword: NODE_PASSWORD });
    expect(chg.status).toBe(200);

    const [[row]] = await db.pool.query(
      'SELECT password FROM login_users WHERE user_id = :id', { id: userId },
    );
    // Canonical MD5 — this is exactly what PHP would compute for the new password.
    expect(row.password).toBe(md5(NODE_PASSWORD));

    // Sidecar snapshot is kept in sync.
    const [[sc]] = await db.pool.query(
      'SELECT md5_snapshot FROM lt_user_credentials WHERE user_id = :id', { id: userId },
    );
    expect(sc.md5_snapshot).toBe(md5(NODE_PASSWORD));
  });
});

describe('PHP changes password behind Node — self-heal', () => {
  test('Node detects stale sidecar and re-verifies against live MD5', async () => {
    // "PHP" changes the SoT directly (mimicking a legacy PHP change-password path).
    const phpPickedPassword = 'PhpChangedAgain!7';
    await db.pool.query(
      'UPDATE login_users SET password = :p WHERE user_id = :id',
      { p: md5(phpPickedPassword), id: userId },
    );

    // Sidecar snapshot is now STALE (still points to previous MD5).
    const [[sc0]] = await db.pool.query(
      'SELECT md5_snapshot FROM lt_user_credentials WHERE user_id = :id', { id: userId },
    );
    expect(sc0.md5_snapshot).not.toBe(md5(phpPickedPassword));

    // Node login with the new (PHP-set) password must still succeed — self-heal path.
    const r = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: phpPickedPassword });
    expect(r.status).toBe(200);

    // And sidecar should now be up-to-date.
    const [[sc1]] = await db.pool.query(
      'SELECT md5_snapshot FROM lt_user_credentials WHERE user_id = :id', { id: userId },
    );
    expect(sc1.md5_snapshot).toBe(md5(phpPickedPassword));
  });

  test('the old (pre-PHP-change) password no longer works via Node', async () => {
    const r = await request(app)
      .post(`${P}/auth/login`)
      .send({ email: TEST_EMAIL, password: NODE_PASSWORD });
    expect(r.status).toBe(401);
  });
});

describe('Reset-password parity', () => {
  test('Node reset writes MD5 that PHP would read, and clears 2FA state', async () => {
    // Seed 2FA state as PHP might have staged an in-flight verification.
    await db.pool.query(
      "UPDATE login_users SET tmp_auth_token = 'STALE-XYZ', sms_time = 1000 WHERE user_id = :id",
      { id: userId },
    );

    await db.pool.query('DELETE FROM login_confirm WHERE email = :e', { e: TEST_EMAIL });
    await request(app).post(`${P}/auth/forgot-password`).send({ email: TEST_EMAIL });
    const [[keyRow]] = await db.pool.query(
      'SELECT `key` AS k FROM login_confirm WHERE email = :e AND type = :t LIMIT 1',
      { e: TEST_EMAIL, t: 'forgot_pw' },
    );

    const NEW = 'FinalReset99!';
    const r = await request(app)
      .post(`${P}/auth/reset-password`)
      .send({ key: keyRow.k, newPassword: NEW });
    expect(r.status).toBe(200);

    const [[row]] = await db.pool.query(
      'SELECT password, tmp_auth_token, sms_time FROM login_users WHERE user_id = :id',
      { id: userId },
    );
    expect(row.password).toBe(md5(NEW));
    expect(row.tmp_auth_token).toBeNull();
    expect(row.sms_time).toBeNull();
  });
});

'use strict';
// End-to-end regression covering all approved fixes.
// Fails hard on any unexpected result.

const assert = require('assert');
const BASE = 'http://localhost:3000/api/v1';

async function j(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

(async () => {
  const results = [];
  const R = (name, ok, extra = '') => results.push({ name, ok, extra });

  // ── 1. Login happy path (uses two-lookup PERF-02) ─────────────
  const login1 = await j('POST', '/auth/login', { email: 'al@ltraffic.co.uk', password: 'Test1234!' });
  R('01 login email happy', login1.status === 200 && login1.data?.success === true, `status=${login1.status} code=${login1.data?.error?.code || ''}`);
  const accessToken = login1.data?.data?.accessToken;
  const refreshToken = login1.data?.data?.refreshToken;

  // ── 2. Login by username (PERF-02 first-lookup path) ──────────
  const login2 = await j('POST', '/auth/login', { username: 'admin', password: 'Test1234!' });
  R('02 login username happy', login2.status === 200, `status=${login2.status}`);

  // ── 3. Login unknown user — SEC-04 timing equalization ────────
  const t0 = Date.now();
  const badUnknown = await j('POST', '/auth/login', { email: 'nobody-here-xyz@example.com', password: 'whatever12' });
  const dtUnknown = Date.now() - t0;
  R('03 login unknown -> 401', badUnknown.status === 401, `status=${badUnknown.status} dt=${dtUnknown}ms`);

  // ── 4. Login wrong password ───────────────────────────────────
  const t1 = Date.now();
  const badPw = await j('POST', '/auth/login', { email: 'al@ltraffic.co.uk', password: 'WrongPw12' });
  const dtWrong = Date.now() - t1;
  R('04 login wrong pw -> 401', badPw.status === 401, `status=${badPw.status} dt=${dtWrong}ms`);
  R('05 SEC-04 timing equalized', Math.abs(dtUnknown - dtWrong) < 200, `unknown=${dtUnknown}ms wrong=${dtWrong}ms delta=${Math.abs(dtUnknown - dtWrong)}ms`);

  // ── 6. GET /me with valid bearer ──────────────────────────────
  const me = await j('GET', '/auth/me', null, { authorization: `Bearer ${accessToken}` });
  R('06 GET /me happy', me.status === 200 && me.data?.data?.username === 'admin', `status=${me.status}`);

  // ── 7. SEC-02: query-string token must NOT work ───────────────
  const meQs = await fetch(`${BASE}/auth/me?access_token=${encodeURIComponent(accessToken)}`);
  R('07 SEC-02 querystring token rejected', meQs.status === 401, `status=${meQs.status}`);

  // ── 8. SEC-03: wrong-algorithm token must fail ────────────────
  const jwt = require('jsonwebtoken');
  const bogus = jwt.sign({ sub: '1', level: 1 }, 'anything', { algorithm: 'none' });
  const meBogus = await j('GET', '/auth/me', null, { authorization: `Bearer ${bogus}` });
  R('08 SEC-03 alg=none rejected', meBogus.status === 401, `status=${meBogus.status}`);

  // ── 9. Refresh rotation ───────────────────────────────────────
  const ref1 = await j('POST', '/auth/refresh', { refreshToken });
  R('09 refresh happy', ref1.status === 200 && ref1.data?.data?.refreshToken, `status=${ref1.status}`);
  const newRefresh = ref1.data?.data?.refreshToken;
  const oldReplay = await j('POST', '/auth/refresh', { refreshToken });
  R('10 refresh replay rejected', oldReplay.status === 401, `status=${oldReplay.status}`);

  // ── 11. Logout ────────────────────────────────────────────────
  const logout = await j('POST', '/auth/logout', { refreshToken: newRefresh });
  R('11 logout revoked=true', logout.status === 200 && logout.data?.data?.revoked === true, JSON.stringify(logout.data));

  // ── 12. Forgot-password + PHP-01 delete-before-insert ─────────
  // First request writes 1 row; second should DELETE and re-insert (net 1 row still).
  const mysql = require('mysql2/promise');
  require('dotenv').config();
  const c = await mysql.createConnection({ host: process.env.DB_HOST, port: +process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  await c.query("DELETE FROM login_confirm WHERE email='al@ltraffic.co.uk' AND type='forgot_pw'");
  await j('POST', '/auth/forgot-password', { email: 'al@ltraffic.co.uk' });
  const [after1] = await c.query("SELECT COUNT(*) AS n FROM login_confirm WHERE email='al@ltraffic.co.uk' AND type='forgot_pw'");
  await j('POST', '/auth/forgot-password', { email: 'al@ltraffic.co.uk' });
  const [after2] = await c.query("SELECT COUNT(*) AS n FROM login_confirm WHERE email='al@ltraffic.co.uk' AND type='forgot_pw'");
  R('12 PHP-01 delete-before-insert', after1[0].n === 1 && after2[0].n === 1, `after1=${after1[0].n} after2=${after2[0].n}`);

  // ── 13. Reset-password with real key + PHP-02 2FA clear ──────
  const [[keyRow]] = await c.query("SELECT `key` AS k FROM login_confirm WHERE email='al@ltraffic.co.uk' AND type='forgot_pw' LIMIT 1");
  await c.query("UPDATE login_users SET tmp_auth_token='STALE', sms_time=NOW() WHERE email='al@ltraffic.co.uk'");
  const reset = await j('POST', '/auth/reset-password', { key: keyRow.k, newPassword: 'Test1234!' });
  R('13 reset happy', reset.status === 200 && reset.data?.data?.reset === true, `status=${reset.status}`);
  const [[twoFa]] = await c.query("SELECT tmp_auth_token, sms_time FROM login_users WHERE email='al@ltraffic.co.uk'");
  R('14 PHP-02 2FA state cleared', twoFa.tmp_auth_token === null && twoFa.sms_time === null, JSON.stringify(twoFa));

  // ── 15. PHP-parity: password still MD5 in login_users ────────
  const [[pw]] = await c.query("SELECT password FROM login_users WHERE email='al@ltraffic.co.uk'");
  const md5 = require('md5');
  R('15 PHP compat MD5 still canonical', pw.password === md5('Test1234!'), pw.password);

  // ── 16. Change-password full transaction ─────────────────────
  const relog = await j('POST', '/auth/login', { email: 'al@ltraffic.co.uk', password: 'Test1234!' });
  const at2 = relog.data?.data?.accessToken;
  const chg = await j('POST', '/auth/change-password', { currentPassword: 'Test1234!', newPassword: 'NewPass987!' }, { authorization: `Bearer ${at2}` });
  R('16 change-password happy', chg.status === 200, `status=${chg.status} ${JSON.stringify(chg.data)}`);
  const [[pw2]] = await c.query("SELECT password FROM login_users WHERE email='al@ltraffic.co.uk'");
  R('17 change wrote MD5 back', pw2.password === md5('NewPass987!'), pw2.password);
  // restore
  const relog2 = await j('POST', '/auth/login', { email: 'al@ltraffic.co.uk', password: 'NewPass987!' });
  const at3 = relog2.data?.data?.accessToken;
  await j('POST', '/auth/change-password', { currentPassword: 'NewPass987!', newPassword: 'Test1234!' }, { authorization: `Bearer ${at3}` });

  // ── 18. Swagger paths + component schemas ─────────────────────
  const spec = await (await fetch(`${BASE}/openapi.json`)).json();
  const paths = Object.keys(spec.paths);
  const schemas = Object.keys(spec.components.schemas);
  R('18 Swagger paths present', paths.length === 10, `count=${paths.length}`);
  R('19 Swagger Auth response schemas', ['LoginResponse','RefreshResponse','LogoutResponse','ChangePasswordResponse','ForgotPasswordResponse','ResetPasswordResponse'].every(s => schemas.includes(s)), '');
  R('20 Swagger Device schemas', ['DeviceRegisterRequest','DeviceListResponse'].every(s => schemas.includes(s)), '');

  await c.end();

  // ── report ────────────────────────────────────────────────────
  console.log('\n─── E2E REGRESSION ───');
  let pass = 0, fail = 0;
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    if (r.ok) pass++; else fail++;
    console.log(`${mark}  ${r.name}${r.extra ? '  (' + r.extra + ')' : ''}`);
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('crash:', e); process.exit(2); });

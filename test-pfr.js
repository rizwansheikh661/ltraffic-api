'use strict';

const http = require('http');
const jwt = require('jsonwebtoken');

const SECRET = 'dev-only-secret-please-replace-in-production';
const BASE = 'http://localhost:3000/api/v1';

function token(level, name = 'Test User') {
  return jwt.sign(
    { id: 99, name, email: 'test@test.com', level, userType: level <= 4 || level === 7 || level === 8 ? 'admin' : 'employee' },
    SECRET,
    { issuer: 'ltraffic-api', algorithm: 'HS256', expiresIn: '1h' },
  );
}

const ADMIN = token(1, 'Admin User');
const ADMIN1 = token(4, 'Admin1 User');
const ADMIN2 = token(7, 'Admin2 User');
const DRIVER = token(6, 'Driver User');
const ESSEX = token(8, 'Essex User');
const DRIVING_OP = token(2, 'DrivingOp User');

let passed = 0, failed = 0;
function assert(label, ok, detail) {
  if (ok) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.log(`FAIL ${label}: ${detail || ''}`); }
}

function collect(resolve) {
  return (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      let data = null;
      try { data = JSON.parse(raw); } catch {}
      resolve({ status: res.statusCode, data, raw });
    });
  };
}

function req(method, url, tkn, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { 'Authorization': `Bearer ${tkn}` } };
    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      const json = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(json);
      const r = http.request(opts, collect(resolve));
      r.on('error', reject);
      r.end(json);
    } else {
      const r = http.request(opts, collect(resolve));
      r.on('error', reject);
      r.end();
    }
  });
}

function formPost(url, tkn, fields) {
  const FormData = require('form-data');
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method: 'POST', hostname: u.hostname, port: u.port, path: u.pathname,
      headers: { ...form.getHeaders(), 'Authorization': `Bearer ${tkn}` },
    };
    const r = http.request(opts, collect(resolve));
    r.on('error', reject);
    form.pipe(r);
  });
}

async function run() {
  // === WAH Tests ===
  console.log('=== WAH (Working at Height) ===');

  let r = await req('GET', `${BASE}/employee/pia-fibre-risk/wah`, ADMIN1);
  assert('WAH list: 200', r.status === 200);
  assert('WAH list: total=67', r.data?.meta?.total === 67);
  assert('WAH list: has image_urls', r.data?.data?.[0]?.image_urls !== undefined);

  r = await req('GET', `${BASE}/employee/pia-fibre-risk/wah?search=Dean`, ADMIN1);
  assert('WAH search: 200', r.status === 200);
  assert('WAH search: results match', r.data?.meta?.total > 0);

  r = await req('GET', `${BASE}/employee/pia-fibre-risk/wah`, DRIVING_OP);
  assert('WAH Driving Op forbidden: 403', r.status === 403);

  r = await req('GET', `${BASE}/employee/pia-fibre-risk/wah`, ADMIN2);
  assert('WAH Admin2 can view: 200', r.status === 200);

  let wahCreate = await formPost(`${BASE}/employee/pia-fibre-risk/wah`, ESSEX, {
    wah2: 'Test Location Node', wah4: 'Penzance',
    pn: '123', snt: 'UGPN', sn: '456',
    wah5: 'Yes', wah6: 'LytePro+ Telecoms Industrial Triple Extension Ladder (SN:LTLADD001)',
    wah7: 'Yes', wah8: 'Yes', wah9: 'Yes', wah10: 'Safe',
    wah11: 'Yes', wah12: 'Yes', wah13: 'No', wah14: 'Node test notes',
  });
  assert('WAH create: 201', wahCreate.status === 201);
  const wahId = wahCreate.data?.data?.id;
  assert('WAH create: has id', !!wahId);
  assert('WAH create: wah1 auto-set', wahCreate.data?.data?.wah1 === 'Essex User');
  assert('WAH create: wah3 auto-set', !!wahCreate.data?.data?.wah3);
  assert('WAH create: type=Overhead Works', wahCreate.data?.data?.type === 'Overhead Works');
  assert('WAH create: status=Submitted', wahCreate.data?.data?.status === 'Submitted');

  if (wahId) {
    r = await req('DELETE', `${BASE}/admin/pia-fibre-risk/wah/${wahId}`, ADMIN);
    assert('WAH admin delete: 204', r.status === 204);
  }

  r = await req('DELETE', `${BASE}/admin/pia-fibre-risk/wah/1`, ADMIN1);
  assert('WAH Admin1 cannot delete: 403', r.status === 403);

  // === UG Tests ===
  console.log('\n=== UG (Underground Works) ===');

  r = await req('GET', `${BASE}/employee/pia-fibre-risk/ug`, ADMIN1);
  assert('UG list: 200', r.status === 200);
  assert('UG list: total=41', r.data?.meta?.total === 41);

  r = await req('GET', `${BASE}/employee/pia-fibre-risk/ug?search=Dean`, ADMIN1);
  assert('UG search: 200', r.status === 200);

  let ugCreate = await formPost(`${BASE}/employee/pia-fibre-risk/ug`, DRIVER, {
    ug2: 'Test UG Location', ug4: 'Helston',
    pn: '789', snt: 'UGSN', sn: '101',
    ug5: 'Yes', ug6: 'Yes', ug7: 'Yes', ug8: 'Yes',
    ug9: 'Yes', ug10: 'Yes', ug11: 'Yes', ug12: 'Safe', ug13: 'UG test notes',
  });
  assert('UG create: 201', ugCreate.status === 201);
  const ugId = ugCreate.data?.data?.id;
  assert('UG create: has id', !!ugId);
  assert('UG create: ug1 auto-set', ugCreate.data?.data?.ug1 === 'Driver User');
  assert('UG create: type=Underground Works', ugCreate.data?.data?.type === 'Underground Works');
  assert('UG create: status=Submitted', ugCreate.data?.data?.status === 'Submitted');

  if (ugId) {
    r = await req('DELETE', `${BASE}/admin/pia-fibre-risk/ug/${ugId}`, ADMIN);
    assert('UG admin delete: 204', r.status === 204);
  }

  // === MEWP Tests ===
  console.log('\n=== MEWP ===');

  r = await req('GET', `${BASE}/employee/pia-fibre-risk/mewp`, ADMIN1);
  assert('MEWP list: 200', r.status === 200);
  assert('MEWP list: total=39', r.data?.meta?.total === 39);

  let mewpCreate = await formPost(`${BASE}/employee/pia-fibre-risk/mewp`, ESSEX, {
    mewp2: 'Test MEWP Location', mewp4: 'Marazion',
    pn: '111', snt: 'PMSN', sn: '222',
    mewp5: 'Yes', mewp6: 'FY21 TVU - Ford Transit L2H2 130PS MEWP',
    mewp7: 'Yes', mewp8: 'Yes', mewp9: 'Yes', mewp10: 'Safe',
    mewp11: 'Yes', mewp12: 'Yes', mewp13: 'Confirm', mewp14: 'MEWP test notes',
  });
  assert('MEWP create: 201', mewpCreate.status === 201);
  const mewpId = mewpCreate.data?.data?.id;
  assert('MEWP create: has id', !!mewpId);
  assert('MEWP create: mewp1 auto-set', mewpCreate.data?.data?.mewp1 === 'Essex User');
  assert('MEWP create: type=MEWP Works', mewpCreate.data?.data?.type === 'MEWP Works');
  assert('MEWP create: status=Submitted', mewpCreate.data?.data?.status === 'Submitted');

  if (mewpId) {
    r = await req('DELETE', `${BASE}/admin/pia-fibre-risk/mewp/${mewpId}`, ADMIN);
    assert('MEWP admin delete: 204', r.status === 204);
  }

  r = await req('DELETE', `${BASE}/admin/pia-fibre-risk/mewp/1`, DRIVER);
  assert('MEWP Driver cannot delete: 403', r.status === 403);

  // === RBAC: create denied for Driving Operative ===
  console.log('\n=== RBAC ===');
  r = await req('GET', `${BASE}/employee/pia-fibre-risk/wah`, DRIVING_OP);
  assert('DrivingOp cannot list WAH: 403', r.status === 403);

  // === Regression ===
  console.log('\n=== Regression: WJ ===');
  r = await req('GET', `${BASE}/employee/wildanet-jobs`, ADMIN1);
  assert('WJ regression: 200', r.status === 200);
  assert('WJ regression: has results', r.data?.meta?.total > 0);

  console.log('\n=== Regression: WR ===');
  r = await req('GET', `${BASE}/employee/work-records`, ADMIN1);
  assert('WR regression: 200', r.status === 200);
  assert('WR regression: total=193', r.data?.meta?.total === 193);

  console.log('\n=== Regression: CT ===');
  r = await req('GET', `${BASE}/employee/clegg-testing`, ADMIN1);
  assert('CT regression: 200', r.status === 200);
  assert('CT regression: total=9', r.data?.meta?.total === 9);

  console.log('\n=== Regression: WRA ===');
  r = await req('GET', `${BASE}/admin/wildanet-risk-assessments`, ADMIN);
  assert('WRA regression: 200', r.status === 200);
  assert('WRA regression: total=380', r.data?.meta?.total === 380);

  // Swagger
  console.log('\n=== Swagger ===');
  const swaggerRes = await new Promise((resolve, reject) => {
    http.get(`${BASE}/openapi.json`, collect(resolve)).on('error', reject);
  });
  const tags = swaggerRes.data?.tags?.map(t => t.name) || [];
  assert('Swagger Admin PFR tag', tags.includes('Admin - PIA & Fibre Risk'));
  assert('Swagger Employee PFR tag', tags.includes('Employee - PIA & Fibre Risk'));

  console.log(`\n=== RESULTS ===`);
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });

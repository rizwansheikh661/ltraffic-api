'use strict';

process.env.AUTH_RATE_LIMIT_MAX = '10000';
process.env.RATE_LIMIT_MAX = '100000';

require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const request = require('supertest');
const md5 = require('md5');
const app = require('../../src/app');
const env = require('../../src/config/env');
const db = require('../../src/config/db');
const levelsCache = require('../../src/modules/auth/levels.cache');
const { formatTimesheet } = require('../../src/modules/timesheets/timesheets.dto');

const suffix = `${Date.now()}`;
const password = 'FeedbackTest123!';
const adminUsername = `feedback_admin_${suffix}`;
const admin1Username = `feedback_admin1_${suffix}`;
const contactEmployeeId = `FB${suffix}`;
const policyReference = `FB-POL-${suffix}`;
const timesheetLtrafficId = `FB-TS-${suffix}`;
const timesheetWeek = 'Week commencing 2026-08-03';
let adminId;
let admin1Id;
let policyId;

async function createUser(username, level, ltrafficid = '') {
  const [result] = await db.pool.query(
    `INSERT INTO login_users (user_level, restricted, username, name, email, password, ltrafficid)
     VALUES (:level, 0, :username, :name, :email, :password, :ltrafficid)`,
    {
      level,
      username,
      name: username,
      email: `${username}@ltraffic.test`,
      password: md5(password),
      ltrafficid,
    },
  );
  return result.insertId;
}

async function tokenFor(username) {
  const response = await request(app).post('/api/v1/auth/login').send({ username, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken;
}

describe('Mobile feedback API fixes', () => {
  let adminToken;
  let admin1Token;

  beforeAll(async () => {
    await levelsCache.load();
    adminId = await createUser(adminUsername, 'a:1:{i:0;s:1:"1";}', timesheetLtrafficId);
    admin1Id = await createUser(admin1Username, 'a:1:{i:0;s:1:"4";}');
    adminToken = await tokenFor(adminUsername);
    admin1Token = await tokenFor(admin1Username);
  });

  afterAll(async () => {
    if (policyId) await db.pool.query('DELETE FROM policies WHERE id = :id', { id: policyId });
    await db.pool.query('DELETE FROM hr WHERE employeeid = :employeeid', { employeeid: contactEmployeeId });
    await db.pool.query('DELETE FROM timesheet WHERE ltrafficid = :ltrafficid AND week = :week', { ltrafficid: timesheetLtrafficId, week: timesheetWeek });
    await Promise.all([adminId, admin1Id].filter(Boolean).map((id) => db.pool.query('DELETE FROM lt_refresh_tokens WHERE user_id = :id', { id })));
    await db.pool.query('DELETE FROM login_users WHERE user_id IN (:adminId, :admin1Id)', { adminId, admin1Id });
    await fs.rm(path.resolve(process.cwd(), env.UPLOADS_ROOT, 'downloads', 'policies', `${policyReference}.pdf`), { force: true });
    await db.shutdown();
  });

  test('My Account page GET works for authenticated admin', async () => {
    const response = await request(app).get('/api/v1/account/pages/about-us').set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
  });

  test('Contact accepts photo_url and returns first name, surname and name', async () => {
    const create = await request(app).post('/api/v1/admin/contacts').set('Authorization', `Bearer ${adminToken}`).send({
      employeeid: contactEmployeeId,
      firstname: 'Feedback',
      surname: 'Contact',
      photo_url: 'https://example.test/contact.jpg',
    });
    expect(create.status).toBe(201);
    expect(create.body.data).toEqual(expect.objectContaining({ firstname: 'Feedback', surname: 'Contact', name: 'Feedback Contact', photo_url: 'https://example.test/contact.jpg' }));
  });

  test('Admin1 uploads a 3 MB policy PDF and deletes its document', async () => {
    const create = await request(app).post('/api/v1/admin/documents/policies').set('Authorization', `Bearer ${admin1Token}`).send({ reference: policyReference, title: 'Feedback policy', version: '1.0' });
    expect(create.status).toBe(201);
    policyId = create.body.data.id;
    const upload = await request(app).post(`/api/v1/admin/documents/policies/${policyId}/file`).set('Authorization', `Bearer ${admin1Token}`).attach('file', Buffer.alloc(3 * 1024 * 1024, 1), 'policy.pdf');
    expect(upload.status).toBe(200);
    const remove = await request(app).delete(`/api/v1/admin/documents/policies/${policyId}`).set('Authorization', `Bearer ${admin1Token}`);
    expect(remove.status).toBe(204);
    policyId = null;
  });

  test('selected_days returns only submitted dates', () => {
    const result = formatTimesheet({ id: 1, week: 'Week', date1: '2026-08-03', hours1: '8', date3: '2026-08-05', hours3: '4' });
    expect(result.days).toHaveLength(7);
    expect(result.selected_days).toHaveLength(2);
    expect(result.selected_days.map((day) => day.date)).toEqual(['2026-08-03', '2026-08-05']);
  });

  test('resubmitting the same pending week updates one existing timesheet', async () => {
    const first = await request(app).post('/api/v1/employee/timesheets/submit').set('Authorization', `Bearer ${adminToken}`).send({
      week: timesheetWeek,
      days: [{ date: '2026-08-03', hours: '8', location: 'Site A', activity: 'Installation', contract: 'TfL' }],
    });
    const second = await request(app).post('/api/v1/employee/timesheets/submit').set('Authorization', `Bearer ${adminToken}`).send({
      week: timesheetWeek,
      comments: 'Hours corrected',
      days: [{ date: '2026-08-03', hours: '9', location: 'Site A', activity: 'Installation', contract: 'TfL' }],
    });
    const [rows] = await db.pool.query(
      'SELECT id, hours1, comments, status FROM timesheet WHERE ltrafficid = :ltrafficid AND week = :week',
      { ltrafficid: timesheetLtrafficId, week: timesheetWeek },
    );

    expect(first.status).toBe(201);
    expect(first.body.data.submission_action).toBe('created');
    expect(second.status).toBe(200);
    expect(second.body.data).toMatchObject({ id: first.body.data.id, submission_action: 'updated' });
    expect(rows).toEqual([expect.objectContaining({ id: first.body.data.id, hours1: '9', comments: 'Hours corrected', status: 'Submitted' })]);
  });
});

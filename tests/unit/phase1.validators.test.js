'use strict';

const { CreateSchema, CreateOptionSchema } = require('../../src/modules/timesheets/timesheets.validators');
const { StatusUpdateSchema } = require('../../src/modules/incidents/incidents.validators');
const { CreateSchema: CreateUserSchema } = require('../../src/modules/users/users.validators');
const { UpdatePageSchema } = require('../../src/modules/content-pages/content-pages.validators');
const {
  ListQuerySchema: ContactListQuerySchema,
  CreateSchema: CreateContactSchema,
  UpdateSchema: UpdateContactSchema,
} = require('../../src/modules/contacts/contacts.validators');

jest.mock('../../src/modules/bulletins/bulletins.repository', () => ({
  getUnreadBulletinIds: jest.fn(),
}));

const bulletinRepository = require('../../src/modules/bulletins/bulletins.repository');
const { requireBulletinAcknowledgement } = require('../../src/middlewares/bulletinGate.middleware');

describe('Phase 1 validation rules', () => {
  test('timesheet accepts a user-selected set of one to seven dates', () => {
    const value = CreateSchema.parse({
      week: 'Week commencing 2026-07-27',
      days: [
        { date: '2026-07-27', hours: '8', activity: 'Installation', contract: 'TfL' },
        { date: '2026-07-30', hours: '8', activity: 'Holiday', contract: 'TfL' },
      ],
    });
    expect(value.days).toHaveLength(2);
  });

  test('timesheet rejects duplicate selected dates', () => {
    const result = CreateSchema.safeParse({
      week: 'Week commencing 2026-07-27',
      days: [{ date: '2026-07-27' }, { date: '2026-07-27' }],
    });
    expect(result.success).toBe(false);
  });

  test('incident cannot be closed without investigation notes', () => {
    expect(StatusUpdateSchema.safeParse({ status: 'Closed' }).success).toBe(false);
    expect(StatusUpdateSchema.safeParse({ status: 'Closed', notes: 'Reviewed and resolved.' }).success).toBe(true);
  });

  test('admin can provide a friendly numeric user level', () => {
    expect(CreateUserSchema.safeParse({
      level_id: 3,
      username: 'newoperative',
      name: 'New Operative',
      password: 'SafePass123!',
    }).success).toBe(true);
  });

  test('timesheet options and account page content have bounded valid inputs', () => {
    expect(CreateOptionSchema.safeParse({ type: 'activity', name: 'Traffic Management' }).success).toBe(true);
    expect(UpdatePageSchema.safeParse({ title: 'Privacy Policy', content: '<p>Policy text</p>' }).success).toBe(true);
  });

  test('mandatory bulletin gate allows bulletin routes but blocks all other employee routes', async () => {
    const next = jest.fn();
    bulletinRepository.getUnreadBulletinIds.mockResolvedValue([11]);

    await requireBulletinAcknowledgement({ path: '/timesheets', user: { id: 42 } }, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      code: 'BULLETIN_ACKNOWLEDGEMENT_REQUIRED',
    }));

    next.mockClear();
    await requireBulletinAcknowledgement({ path: '/bulletins/pending', user: { id: 42 } }, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(bulletinRepository.getUnreadBulletinIds).toHaveBeenCalledTimes(1);
  });
  test('contact directory retains legacy two-field search and ten-row page size', () => {
    const query = ContactListQuerySchema.parse({ firstname: 'Dean', surname: 'Cairns' });
    expect(query).toMatchObject({ firstname: 'Dean', surname: 'Cairns', limit: 10 });
  });

  test('admin contact create requires the minimum directory identity fields', () => {
    expect(CreateContactSchema.safeParse({ employeeid: '00060', firstname: 'Jane', surname: 'Smith' }).success).toBe(true);
    expect(CreateContactSchema.safeParse({ firstname: 'Jane', surname: 'Smith' }).success).toBe(false);
    expect(UpdateContactSchema.safeParse({}).success).toBe(false);
  });
});

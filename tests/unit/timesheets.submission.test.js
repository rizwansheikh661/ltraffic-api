'use strict';

jest.mock('../../src/modules/timesheets/timesheets.repository', () => ({
  create: jest.fn(),
  findLatestEditableByUserAndWeek: jest.fn(),
  updateSubmission: jest.fn(),
  findById: jest.fn(),
}));

const repository = require('../../src/modules/timesheets/timesheets.repository');
const { submitTimesheet } = require('../../src/modules/timesheets/timesheets.service');

describe('timesheet weekly submission', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updates the existing pending submission for the same employee and week', async () => {
    const user = { ltrafficid: 'LT-100', name: 'Test Operative' };
    const body = {
      week: 'Week commencing 2026-08-03',
      comments: 'Updated hours',
      days: [{ date: '2026-08-03', hours: '8', location: 'Site A', activity: 'Installation', contract: 'TfL' }],
    };
    repository.findLatestEditableByUserAndWeek.mockResolvedValue({ id: 77, status: 'Submitted' });
    repository.updateSubmission.mockResolvedValue(true);
    repository.findById.mockResolvedValue({
      id: 77,
      ltrafficid: user.ltrafficid,
      name: user.name,
      week: body.week,
      comments: body.comments,
      status: 'Submitted',
      date1: body.days[0].date,
      hours1: body.days[0].hours,
    });

    const result = await submitTimesheet(user, body);

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.updateSubmission).toHaveBeenCalledWith(77, expect.objectContaining({
      status: 'Submitted',
      comments: 'Updated hours',
    }));
    expect(result).toMatchObject({ id: 77, status: 'Submitted', submission_action: 'updated' });
  });
});

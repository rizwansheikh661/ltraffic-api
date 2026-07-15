'use strict';

/**
 * Status enum supersets — union of admin and employee variants.
 * See docs/audit/04-node-api-diff.md §2.
 */

const TIMESHEET_STATUS = Object.freeze({
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
});

const INCIDENT_STATUS = Object.freeze({
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
});

const VEHICLE_CHECK_RESULT = Object.freeze({
  SAFE: 'Safe',
  UNSAFE: 'Unsafe',
  CLOSED: 'Closed',
});

const VEHICLE_CONDITION = Object.freeze({
  GOOD: 'Good',
  AVERAGE: 'Average',
  POOR: 'Poor',
  VERY_POOR: 'Very Poor',
  DANGEROUS: 'Dangerous',
  CLOSED: 'Closed',
});

const BULLETIN_STATUS = Object.freeze({
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
});

const DEVICE_PLATFORMS = Object.freeze(['ios', 'android']);

const NOTIFICATION_TYPES = Object.freeze({
  BULLETIN_PUBLISHED: 'BULLETIN_PUBLISHED',
  TIMESHEET_SUBMITTED: 'TIMESHEET_SUBMITTED',
  TIMESHEET_APPROVED: 'TIMESHEET_APPROVED',
  TIMESHEET_REJECTED: 'TIMESHEET_REJECTED',
  INCIDENT_CREATED: 'INCIDENT_CREATED',
  INCIDENT_CLOSED: 'INCIDENT_CLOSED',
  VEHICLE_UNSAFE: 'VEHICLE_UNSAFE',
  DOCUMENT_ADDED: 'DOCUMENT_ADDED',
});

module.exports = {
  TIMESHEET_STATUS,
  INCIDENT_STATUS,
  VEHICLE_CHECK_RESULT,
  VEHICLE_CONDITION,
  BULLETIN_STATUS,
  DEVICE_PLATFORMS,
  NOTIFICATION_TYPES,
};

'use strict';

function formatTimesheet(row) {
  if (!row) return null;
  const days = [];
  for (let i = 1; i <= 7; i += 1) {
    days.push({
      date: row[`date${i}`] || '',
      hours: row[`hours${i}`] || '0',
      location: row[`location${i}`] || '',
      activity: row[`activity${i}`] || '',
      contract: row[`contract${i}`] || '',
    });
  }
  return {
    id: row.id,
    week: row.week,
    ltrafficid: row.ltrafficid,
    name: row.name,
    comments: row.comments,
    status: row.status,
    days,
  };
}

function formatTimesheetSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    week: row.week,
    ltrafficid: row.ltrafficid,
    name: row.name,
    status: row.status,
  };
}

module.exports = { formatTimesheet, formatTimesheetSummary };

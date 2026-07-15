'use strict';

/**
 * Parse the two legacy date formats used across lt_employee:
 *   - ISO:            "2024-01-13" / "2024-01-13 08:53:31" / "2024-01-13T08:53:31Z"
 *   - UK long form:   "Wednesday 06 September 2023 (08:53:31)"
 *                     "Wednesday 06 September 2023"
 * Returns a Date or null.
 */

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

const UK_RE = /^\s*[A-Za-z]+\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s*\((\d{1,2}):(\d{1,2}):(\d{1,2})\))?\s*$/;

function parse(input) {
  if (input == null || input === '') return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;

  const raw = String(input).trim();
  if (!raw) return null;

  const uk = UK_RE.exec(raw);
  if (uk) {
    const day = Number(uk[1]);
    const month = MONTHS[uk[2].toLowerCase()];
    const year = Number(uk[3]);
    const h = Number(uk[4] || 0);
    const m = Number(uk[5] || 0);
    const s = Number(uk[6] || 0);
    if (month === undefined) return null;
    const d = new Date(Date.UTC(year, month, day, h, m, s));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const iso = new Date(raw.replace(' ', 'T'));
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function toIso(input) {
  const d = parse(input);
  return d ? d.toISOString() : null;
}

function toMysqlDatetime(input) {
  const d = parse(input);
  if (!d) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatArrivalDatetime() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${DAYS[d.getDay()]} ${dd} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()} (${hh}:${mm}:${ss})`;
}

module.exports = { parse, toIso, toMysqlDatetime, formatArrivalDatetime };

'use strict';

/** Legacy 'Yes'/'No'/'' → boolean|null. Preserves tri-state for N/A. */
function parse(input) {
  if (input === true || input === false) return input;
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (s === '' || s === 'n/a' || s === 'null') return null;
  if (['yes', 'y', '1', 'true', 'on'].includes(s)) return true;
  if (['no', 'n', '0', 'false', 'off'].includes(s)) return false;
  return null;
}

/** Boolean → 'Yes'/'No' string that PHP web still expects. Null passes through. */
function toLegacy(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '';
}

module.exports = { parse, toLegacy };

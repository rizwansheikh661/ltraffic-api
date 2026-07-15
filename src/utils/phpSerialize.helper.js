'use strict';

/**
 * Minimal PHP unserialize() port — supports the shapes actually used in lt_employee:
 *   a:1:{i:0;s:1:"1";}          → user_level arrays
 *   s:5:"hello";                → string
 *   i:42;                       → int
 *   b:1; / b:0;                 → bool
 *   N;                          → null
 *   d:3.14;                     → float
 * Not intended as a full PHP serialise/unserialise implementation.
 */

class Cursor {
  constructor(s) {
    this.s = s;
    this.i = 0;
  }

  peek() {
    return this.s[this.i];
  }

  expect(ch) {
    if (this.s[this.i] !== ch) {
      throw new Error(`phpUnserialize: expected '${ch}' at ${this.i}, got '${this.s[this.i]}'`);
    }
    this.i += 1;
  }

  readUntil(ch) {
    const start = this.i;
    const idx = this.s.indexOf(ch, start);
    if (idx < 0) throw new Error(`phpUnserialize: no '${ch}' after ${start}`);
    this.i = idx;
    return this.s.slice(start, idx);
  }
}

function parseValue(c) {
  const t = c.peek();
  c.i += 1;

  if (t === 'N') {
    c.expect(';');
    return null;
  }

  if (t === 'b') {
    c.expect(':');
    const v = c.s[c.i];
    c.i += 1;
    c.expect(';');
    return v === '1';
  }

  if (t === 'i') {
    c.expect(':');
    const n = c.readUntil(';');
    c.i += 1;
    return parseInt(n, 10);
  }

  if (t === 'd') {
    c.expect(':');
    const n = c.readUntil(';');
    c.i += 1;
    return parseFloat(n);
  }

  if (t === 's') {
    c.expect(':');
    const len = parseInt(c.readUntil(':'), 10);
    c.expect(':');
    c.expect('"');
    const str = c.s.slice(c.i, c.i + len);
    c.i += len;
    c.expect('"');
    c.expect(';');
    return str;
  }

  if (t === 'a') {
    c.expect(':');
    const count = parseInt(c.readUntil(':'), 10);
    c.expect(':');
    c.expect('{');
    const entries = [];
    let isSequential = true;
    for (let k = 0; k < count; k += 1) {
      const key = parseValue(c);
      const value = parseValue(c);
      entries.push([key, value]);
      if (key !== k) isSequential = false;
    }
    c.expect('}');
    if (isSequential) return entries.map((e) => e[1]);
    return Object.fromEntries(entries);
  }

  throw new Error(`phpUnserialize: unsupported type '${t}' at ${c.i - 1}`);
}

function unserialize(input) {
  if (input == null || input === '') return null;
  const c = new Cursor(String(input));
  return parseValue(c);
}

/** Extract first level id from a serialised `user_level` value. Tolerant of non-serialised input. */
function firstLevel(serialised) {
  try {
    const parsed = unserialize(serialised);
    if (Array.isArray(parsed) && parsed.length > 0) return Number(parsed[0]);
    if (parsed && typeof parsed === 'object') {
      const first = Object.values(parsed)[0];
      if (first != null) return Number(first);
    }
    if (typeof parsed === 'string' || typeof parsed === 'number') return Number(parsed);
  } catch (_) {
    // fall through — try raw number
  }
  const n = Number(serialised);
  return Number.isFinite(n) ? n : null;
}

module.exports = { unserialize, firstLevel };

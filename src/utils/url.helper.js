'use strict';

const env = require('../config/env');

/** Build an absolute public URL for an API path. Always uses PUBLIC_BASE_URL. */
function absoluteUrl(pathname = '') {
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}

/**
 * Build a public URL for a stored file path. The DB stores relative paths
 * matching the PHP folder layout (e.g. 'admin/hsupload/foo.jpg', 'bulletin/img.png').
 * In production these are served by Apache/IIS from FILES_BASE_URL. In dev,
 * PUBLIC_BASE_URL is used and Node serves the same folder as a static fallback.
 *
 * Absolute inputs (http/https) are returned unchanged.
 * Null/empty inputs return null.
 */
function fileUrl(relativePath) {
  if (relativePath == null || relativePath === '') return null;
  const raw = String(relativePath).trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = (env.FILES_BASE_URL || env.PUBLIC_BASE_URL).replace(/\/+$/, '');
  const clean = raw.replace(/^\/+/, '');
  const encoded = clean
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${base}/${encoded}`;
}

module.exports = { absoluteUrl, fileUrl };

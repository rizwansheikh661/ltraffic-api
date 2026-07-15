'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../common/apiError');
const ERROR_CODES = require('../constants/errorCodes');

const DEFAULT_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Build a multer instance that writes into the SHARED PHP upload folder
 * (UPLOADS_ROOT / subpath). The subpath MUST match the PHP folder name
 * (e.g. 'admin/hsupload', 'admin/employeephoto', 'bulletin') so PHP web
 * and the mobile API see identical files at identical relative paths.
 *
 * The relative path stored in the DB is `<subpath>/<filename>` — the same
 * shape the PHP web app already writes, so no DB migration is required.
 *
 * Usage (in a route file):
 *   const upload = uploadFor('admin/hsupload');
 *   router.post('/:id/photos', upload.single('file'), handler);
 */
function uploadFor(subpath, options = {}) {
  if (!subpath || typeof subpath !== 'string' || subpath.includes('..')) {
    throw new Error(`uploadFor: invalid subpath '${subpath}'`);
  }

  const dir = path.resolve(process.cwd(), env.UPLOADS_ROOT, subpath);
  ensureDir(dir);

  const allowedMime = options.allowedMime || DEFAULT_MIME;
  const maxMb = options.maxMb || env.UPLOAD_MAX_MB;

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const parentId = req.params?.id || req.user?.id || 'x';
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const stamp = Date.now();
      cb(null, `${parentId}_${stamp}_${safe}`);
    },
  });

  const fileFilter = (_req, file, cb) => {
    if (allowedMime.length === 0 || allowedMime.includes(file.mimetype)) return cb(null, true);
    return cb(new ApiError(415, ERROR_CODES.UPLOAD_INVALID_MIME, `Unsupported mime type: ${file.mimetype}`));
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxMb * 1024 * 1024 },
  });
}

/** Build the DB-stored relative path for a saved file (matches PHP convention). */
function relativePath(subpath, filename) {
  return `${subpath.replace(/^\/+|\/+$/g, '')}/${filename}`;
}

module.exports = { uploadFor, relativePath };

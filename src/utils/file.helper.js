'use strict';

const { fileUrl } = require('./url.helper');
const { relativePath } = require('../middlewares/upload.middleware');

function addImageUrls(row, imageCols) {
  if (!row) return row;
  const result = { ...row };
  for (const col of imageCols) {
    const key = `${col}_urls`;
    if (result[col]) {
      result[key] = result[col].split(', ').filter(Boolean).map((p) => fileUrl(p.trim()));
    } else {
      result[key] = [];
    }
  }
  return result;
}

function buildImagePath(subpath, files) {
  if (!files || !files.length) return '';
  return files.map((f) => relativePath(subpath, f.filename)).join(', ');
}

module.exports = { addImageUrls, buildImagePath };

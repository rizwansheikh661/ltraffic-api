'use strict';

const { fileUrl } = require('../../utils/url.helper');

function bulletinAssetUrl(value) {
  if (!value) return null;
  const path = value.startsWith('bulletin/') ? value : `bulletin/${value}`;
  return fileUrl(path);
}

function formatBulletin(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    ref: row.ref,
    description: row.description,
    image: row.image || null,
    image_url: bulletinAssetUrl(row.image),
    download: row.download || null,
    download_url: bulletinAssetUrl(row.download),
    active: row.new === '1' || row.new === 1,
    status: row.new === '1' || row.new === 1 ? 'Active' : 'Inactive',
    arrival_datetime: row.arrival_datetime,
    read_confirm: row.read_confirm || null,
  };
}

function formatBulletinForEmployee(row, isRead) {
  const b = formatBulletin(row);
  if (!b) return null;
  b.is_read = isRead;
  delete b.read_confirm;
  return b;
}

module.exports = { formatBulletin, formatBulletinForEmployee };

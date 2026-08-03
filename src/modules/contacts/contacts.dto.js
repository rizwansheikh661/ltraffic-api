'use strict';

const { fileUrl } = require('../../utils/url.helper');

function formatContact(row) {
  if (!row) return null;
  const name = `${(row.firstname || '').trim()} ${(row.surname || '').trim()}`.trim();
  let photoUrl = null;
  if (row.photoimage) {
    photoUrl = /^https?:\/\//i.test(row.photoimage)
      ? row.photoimage
      : fileUrl(`admin/${row.photoimage}`);
  }
  return {
    id: row.id,
    employeeid: row.employeeid,
    firstname: (row.firstname || '').trim(),
    surname: (row.surname || '').trim(),
    name,
    phone: row.ltrafficphone || null,
    email: row.ltrafficemail || null,
    jobtitle: row.jobtitle || null,
    linemanager: row.linemanager || null,
    location: row.location || null,
    photo_url: photoUrl,
  };
}

module.exports = { formatContact };

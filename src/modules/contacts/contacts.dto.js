'use strict';

const { fileUrl } = require('../../utils/url.helper');

function formatContact(row) {
  if (!row) return null;
  const name = `${(row.firstname || '').trim()} ${(row.surname || '').trim()}`.trim();
  return {
    id: row.id,
    employeeid: row.employeeid,
    name,
    phone: row.ltrafficphone || null,
    email: row.ltrafficemail || null,
    jobtitle: row.jobtitle || null,
    linemanager: row.linemanager || null,
    location: row.location || null,
    photo_url: row.photoimage ? fileUrl(`admin/${row.photoimage}`) : null,
  };
}

module.exports = { formatContact };

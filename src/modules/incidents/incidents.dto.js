'use strict';

const { fileUrl } = require('../../utils/url.helper');

function parseImagePaths(imageStr) {
  if (!imageStr) return [];
  return imageStr.split(',').map((s) => s.trim()).filter(Boolean);
}

function formatIncident(row) {
  if (!row) return null;
  const imagePaths = parseImagePaths(row.image);
  return {
    id: row.id,
    operativesname: row.operativesname,
    arrival_datetime: row.arrival_datetime,
    type: row.type,
    location: row.location,
    reportedby: row.reportedby,
    report: row.report,
    involved: row.involved,
    injury: {
      anyoneinjured: row.anyoneinjured,
      whowasinjured: row.whowasinjured,
      injuryreport: row.injuryreport,
    },
    reporting: {
      reportit: row.reportit,
      advise: row.advise,
      laterdate: row.laterdate,
      companydetails: row.companydetails,
    },
    witnesses: {
      witness: row.witness,
      witnessname: row.witnessname,
      witnessaddress: row.witnessaddress,
      witnesscontact: row.witnesscontact,
      otherwitness: row.otherwitness,
    },
    notes: row.notes,
    status: row.status,
    image: row.image,
    image_urls: imagePaths.map((p) => fileUrl(p)),
  };
}

function formatIncidentSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    operativesname: row.operativesname,
    arrival_datetime: row.arrival_datetime,
    type: row.type,
    location: row.location,
    status: row.status,
  };
}

function formatDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    submittedby: row.submittedby,
    arrival_datetime: row.arrival_datetime,
    file_name: row.file_name,
    file_url: row.file_name ? fileUrl(row.file_name) : null,
  };
}

module.exports = { formatIncident, formatIncidentSummary, formatDocument };

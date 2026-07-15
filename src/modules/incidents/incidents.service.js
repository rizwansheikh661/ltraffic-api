'use strict';

const repo = require('./incidents.repository');
const { formatIncident, formatIncidentSummary, formatDocument } = require('./incidents.dto');
const ApiError = require('../../common/apiError');
const { INCIDENT_STATUS } = require('../../constants/status');

// ── Employee ──────────────────────────────────────────────────

async function reportIncident(user, body, imagePath) {
  const data = {
    operativesname: user.name,
    reportedby: user.name,
    type: body.type,
    location: body.location,
    report: body.report,
    involved: body.involved,
    anyoneinjured: body.anyoneinjured,
    whowasinjured: body.whowasinjured,
    injuryreport: body.injuryreport,
    reportit: body.reportit,
    advise: body.advise,
    laterdate: body.laterdate,
    companydetails: body.companydetails,
    witness: body.witness,
    witnessname: body.witnessname,
    witnessaddress: body.witnessaddress,
    witnesscontact: body.witnesscontact,
    otherwitness: body.otherwitness,
    notes: null,
    status: INCIDENT_STATUS.OPEN,
    image: imagePath || null,
  };
  const id = await repo.create(data);
  const row = await repo.findById(id);
  return formatIncident(row);
}

async function getMyIncidents(operativesname, query) {
  const { rows, total } = await repo.findByOperative(operativesname, query);
  return { data: rows.map(formatIncidentSummary), total };
}

async function getMyIncidentById(operativesname, id) {
  const row = await repo.findById(id);
  if (!row || row.operativesname !== operativesname) {
    throw ApiError.notFound('Incident not found');
  }
  return formatIncident(row);
}

// ── Admin ─────────────────────────────────────────────────────

async function getAll(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatIncidentSummary), total };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Incident not found');
  return formatIncident(row);
}

async function adminCreate(body) {
  const data = {
    operativesname: body.operativesname,
    arrival_datetime: body.arrival_datetime,
    type: body.type,
    location: body.location,
    reportedby: body.reportedby,
    report: body.report,
    notes: body.notes || '',
    status: INCIDENT_STATUS.OPEN,
    image: null,
  };
  const id = await repo.adminCreate(data);
  const row = await repo.findById(id);
  return formatIncident(row);
}

async function updateIncident(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Incident not found');
  await repo.update(id, fields);
  const row = await repo.findById(id);
  return formatIncident(row);
}

async function changeStatus(id, status, notes) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Incident not found');
  await repo.updateStatus(id, status, notes);
  const row = await repo.findById(id);
  return formatIncident(row);
}

async function remove(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Incident not found');
}

// ── Documents ─────────────────────────────────────────────────

async function getDocuments(incidentId) {
  const check = await repo.findById(incidentId);
  if (!check) throw ApiError.notFound('Incident not found');
  const rows = await repo.findDocuments(incidentId);
  return rows.map(formatDocument);
}

async function uploadDocument(incidentId, submittedby, fileName) {
  const check = await repo.findById(incidentId);
  if (!check) throw ApiError.notFound('Incident not found');
  const docId = await repo.insertDocument({ incidentId, submittedby, fileName });
  return { id: docId };
}

async function removeDocument(incidentId, docId) {
  const check = await repo.findById(incidentId);
  if (!check) throw ApiError.notFound('Incident not found');
  const deleted = await repo.removeDocument(docId);
  if (!deleted) throw ApiError.notFound('Document not found');
}

module.exports = {
  reportIncident,
  getMyIncidents,
  getMyIncidentById,
  getAll,
  getById,
  adminCreate,
  updateIncident,
  changeStatus,
  remove,
  getDocuments,
  uploadDocument,
  removeDocument,
};

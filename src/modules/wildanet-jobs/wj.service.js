'use strict';

const repo = require('./wj.repository');
const ApiError = require('../../common/apiError');
const { formatArrivalDatetime } = require('../../utils/date.helper');
const { fileUrl } = require('../../utils/url.helper');

// ── Formatting ───────────────────────────────────────────────

function formatJob(row) {
  if (!row) return row;
  const result = { ...row };
  if (result.image) {
    result.image_urls = result.image.split(',').filter(Boolean).map((p) => fileUrl(p.trim()));
  } else {
    result.image_urls = [];
  }
  return result;
}

function formatDocument(row) {
  if (!row) return row;
  return {
    id: row.id,
    arrival_datetime: row.arrival_datetime,
    file_name: row.file_name,
    file_url: row.file_name ? fileUrl(row.file_name) : null,
    submittedby: row.submittedby,
    doctype: row.doctype,
    docdesc: row.docdesc,
  };
}

// ── Employee ─────────────────────────────────────────────────

async function getActiveJobs(query) {
  const { rows, total } = await repo.findActive(query);
  return { data: rows.map(formatJob), total };
}

async function getJobById(id) {
  const row = await repo.findById(id);
  if (!row) throw ApiError.notFound('Wildanet job not found');
  return formatJob(row);
}

async function getDocuments(jobId, query) {
  const job = await repo.findById(jobId);
  if (!job) throw ApiError.notFound('Wildanet job not found');
  const { rows, total } = await repo.findDocuments({ jobId, ...query });
  return { data: rows.map(formatDocument), total };
}

// ── Admin ────────────────────────────────────────────────────

async function getAllJobs(query) {
  const { rows, total } = await repo.findAll(query);
  return { data: rows.map(formatJob), total };
}

async function createJob(fields, imagePath) {
  const data = { ...fields, image: imagePath || '' };
  const id = await repo.create(data);
  const row = await repo.findById(id);
  return formatJob(row);
}

async function updateJob(id, fields) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Wildanet job not found');
  await repo.update(id, fields);
  const row = await repo.findById(id);
  return formatJob(row);
}

async function removeJob(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('Wildanet job not found');
}

async function uploadDocument(jobId, submittedby, fileName, doctype, docdesc) {
  const job = await repo.findById(jobId);
  if (!job) throw ApiError.notFound('Wildanet job not found');
  const arrivalDatetime = formatArrivalDatetime();
  const docId = await repo.insertDocument({ jobId, arrivalDatetime, submittedby, fileName, doctype, docdesc });
  return { id: docId };
}

async function removeDocument(jobId, docId) {
  const job = await repo.findById(jobId);
  if (!job) throw ApiError.notFound('Wildanet job not found');
  const deleted = await repo.removeDocument(docId);
  if (!deleted) throw ApiError.notFound('Document not found');
}

module.exports = {
  getActiveJobs,
  getJobById,
  getDocuments,
  getAllJobs,
  createJob,
  updateJob,
  removeJob,
  uploadDocument,
  removeDocument,
};

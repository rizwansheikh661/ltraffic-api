'use strict';

const { fileUrl } = require('../../utils/url.helper');

function formatEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeid: row.employeeid,
    firstname: row.firstname ? row.firstname.trim() : '',
    middlename: row.middlename ? row.middlename.trim() : '',
    surname: row.surname ? row.surname.trim() : '',
    dob: row.dob || null,
    address: row.address || null,
    telephone: row.telephone || null,
    email: row.email || null,
    nationality: row.nationality || null,
    cis: row.cis || null,
    ninumber: row.ninumber || null,
    startdate: row.startdate || null,
    enddate: row.enddate || null,
    employeeid: row.employeeid || null,
    jobtitle: row.jobtitle || null,
    location: row.location || null,
    linemanager: row.linemanager || null,
    salary: row.salary || null,
    ltrafficemail: row.ltrafficemail || null,
    ltrafficphone: row.ltrafficphone || null,
    photoimage: row.photoimage || null,
    photo_url: row.photoimage ? fileUrl(`admin/${row.photoimage}`) : null,
    signature: row.signature || null,
    signature_url: row.signature ? fileUrl(`admin/${row.signature}`) : null,
    confirm: row.confirm || null,
    arrival_datetime: row.arrival_datetime || null,
    date_signed: row.date_signed || null,
    notes: row.notes || null,
    contactname1: row.contactname1 || null,
    contacttelephone1: row.contacttelephone1 || null,
    relation1: row.relation1 || null,
    contactname2: row.contactname2 || null,
    contacttelephone2: row.contacttelephone2 || null,
    relation2: row.relation2 || null,
  };
}

function formatEmployeeSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeid: row.employeeid,
    firstname: row.firstname ? row.firstname.trim() : '',
    surname: row.surname ? row.surname.trim() : '',
    ltrafficphone: row.ltrafficphone || null,
    ltrafficemail: row.ltrafficemail || null,
    jobtitle: row.jobtitle || null,
    linemanager: row.linemanager || null,
    location: row.location || null,
    date_signed: row.date_signed || null,
    photo_url: row.photoimage ? fileUrl(`admin/${row.photoimage}`) : null,
  };
}

function formatDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    submittedby: row.submittedby || null,
    arrival_datetime: row.arrival_datetime || null,
    doctype: row.doctype || null,
    docdesc: row.docdesc || null,
    file_name: row.file_name || null,
    file_url: row.file_name ? fileUrl(row.file_name) : null,
  };
}

module.exports = { formatEmployee, formatEmployeeSummary, formatDocument };

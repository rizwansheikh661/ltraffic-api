'use strict';

const { formatArrivalDatetime } = require('../../utils/date.helper');
const repo = require('./onboarding.repository');

async function getStatus(userId) {
  const user = await repo.findUserOnboardingData(userId);
  if (!user) return null;
  return {
    completed: user.onboarding === '1',
    ltrafficid: user.ltrafficid || null,
    name: user.name || null,
    name1: user.name1 || null,
  };
}

async function submitOnboarding(userId, fields) {
  const user = await repo.findUserOnboardingData(userId);
  if (!user) return null;

  const name1 = user.name1 || '';
  const photoimage = `employeephoto/${name1}.jpg`;
  const signature = `employeesignature/${name1}.jpg`;

  const data = {
    firstname: fields.firstname,
    middlename: fields.middlename || '',
    surname: fields.surname,
    dob: fields.dob,
    address: fields.address,
    telephone: fields.telephone,
    email: fields.email,
    nationality: fields.nationality,
    contactname1: fields.contactname1,
    contacttelephone1: fields.contacttelephone1,
    relation1: fields.relation1,
    contactname2: fields.contactname2 || '',
    contacttelephone2: fields.contacttelephone2 || '',
    relation2: fields.relation2 || '',
    employeeid: user.ltrafficid || '',
    startdate: fields.startdate,
    cis: fields.cis || '',
    ninumber: fields.ninumber,
    photoimage,
    confirm: fields.confirm || '',
    signature,
    arrival_datetime: formatArrivalDatetime(),
    date_signed: fields.date_signed || '',
  };

  const insertId = await repo.createHrRecord(data);
  await repo.updateOnboardingStatus(userId);

  return { id: insertId, employeeid: data.employeeid };
}

async function getOwnRecord(userId) {
  const user = await repo.findUserOnboardingData(userId);
  if (!user) return null;
  const employeeid = user.ltrafficid || '';
  if (!employeeid) return null;
  return repo.findHrByEmployeeId(employeeid);
}

module.exports = { getStatus, submitOnboarding, getOwnRecord };

'use strict';

const ApiError = require('../../common/apiError');
const { formatArrivalDatetime } = require('../../utils/date.helper');
const repo = require('./pfr.repository');

async function list(subtype, opts) {
  return repo.findAll(subtype, opts);
}

async function createWah(user, body, imagePath) {
  const data = {
    wah1: user.name,
    wah2: body.wah2,
    wah3: formatArrivalDatetime(),
    wah4: body.wah4,
    pn: body.pn || '',
    snt: body.snt,
    sn: body.sn || '',
    wah5: body.wah5,
    wah6: body.wah6,
    wah7: body.wah7,
    wah8: body.wah8,
    wah9: body.wah9,
    wah10: body.wah10,
    wah11: body.wah11,
    wah12: body.wah12,
    wah13: body.wah13,
    wah14: body.wah14 || '',
    type: 'Overhead Works',
    status: 'Submitted',
    image: imagePath || '',
  };
  const id = await repo.createWah(data);
  return repo.findById('wah', id);
}

async function createUg(user, body, imagePath) {
  const data = {
    ug1: user.name,
    ug2: body.ug2,
    ug3: formatArrivalDatetime(),
    ug4: body.ug4,
    pn: body.pn || '',
    snt: body.snt,
    sn: body.sn || '',
    ug5: body.ug5,
    ug6: body.ug6,
    ug7: body.ug7,
    ug8: body.ug8,
    ug9: body.ug9,
    ug10: body.ug10,
    ug11: body.ug11,
    ug12: body.ug12,
    ug13: body.ug13 || '',
    type: 'Underground Works',
    status: 'Submitted',
    image: imagePath || '',
  };
  const id = await repo.createUg(data);
  return repo.findById('ug', id);
}

async function createMewp(user, body, imagePath) {
  const data = {
    mewp1: user.name,
    mewp2: body.mewp2,
    mewp3: formatArrivalDatetime(),
    mewp4: body.mewp4,
    pn: body.pn || '',
    snt: body.snt,
    sn: body.sn || '',
    mewp5: body.mewp5,
    mewp6: body.mewp6,
    mewp7: body.mewp7,
    mewp8: body.mewp8,
    mewp9: body.mewp9,
    mewp10: body.mewp10,
    mewp11: body.mewp11,
    mewp12: body.mewp12,
    mewp13: body.mewp13,
    mewp14: body.mewp14 || '',
    mewp15: '',
    type: 'MEWP Works',
    status: 'Submitted',
    image: imagePath || '',
  };
  const id = await repo.createMewp(data);
  return repo.findById('mewp', id);
}

async function removeRecord(subtype, id) {
  const existing = await repo.findById(subtype, id);
  if (!existing) throw ApiError.notFound('Record not found');
  await repo.remove(subtype, id);
}

module.exports = {
  list,
  createWah,
  createUg,
  createMewp,
  removeRecord,
};

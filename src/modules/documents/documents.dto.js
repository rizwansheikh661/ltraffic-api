'use strict';

const { fileUrl } = require('../../utils/url.helper');

const DOWNLOAD_PATHS = {
  policies: 'downloads/policies',
  'method-statements': 'downloads/methodstatement',
  processes: 'downloads/sop',
  coshh: 'downloads/coshh',
};

const COL_MAP = {
  policies: { ref: 'pol1', title: 'pol2', version: 'pol3' },
  'method-statements': { ref: 'ms1', title: 'ms2', version: 'ms3' },
  processes: { ref: 'pro1', title: 'pro2', version: 'pro3' },
  coshh: { ref: 'cos1', title: 'cos2', version: 'cos3' },
};

function formatDocument(type, row) {
  if (!row) return null;
  const cols = COL_MAP[type];
  const ref = row[cols.ref];
  const downloadPath = `${DOWNLOAD_PATHS[type]}/${ref}.pdf`;
  return {
    id: row.id,
    reference: ref,
    title: row[cols.title],
    version: row[cols.version],
    download_url: fileUrl(downloadPath),
  };
}

module.exports = { formatDocument };

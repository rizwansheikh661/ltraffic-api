'use strict';

const ApiError = require('../common/apiError');
const ERROR_CODES = require('../constants/errorCodes');
const bulletinRepository = require('../modules/bulletins/bulletins.repository');

// Employee business endpoints are inaccessible until every active bulletin has
// been acknowledged. Bulletin endpoints themselves stay available so the app
// can display and acknowledge the required content.
async function requireBulletinAcknowledgement(req, _res, next) {
  if (req.path === '/bulletins' || req.path.startsWith('/bulletins/')) {
    return next();
  }

  try {
    const pendingBulletinIds = await bulletinRepository.getUnreadBulletinIds(req.user.id);
    if (pendingBulletinIds.length) {
      return next(ApiError.forbidden(
        'Please read and acknowledge all active bulletins before continuing',
        ERROR_CODES.BULLETIN_ACKNOWLEDGEMENT_REQUIRED,
      ));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireBulletinAcknowledgement };

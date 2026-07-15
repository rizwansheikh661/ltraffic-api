'use strict';

/**
 * Firebase Cloud Messaging — pluggable module.
 *
 * When FCM_ENABLED=false or FCM_SERVICE_ACCOUNT_PATH is empty, this module
 * exports a no-op sender so the rest of the app can call `send()` freely
 * without runtime errors. The moment the client supplies the service-account
 * JSON and flips FCM_ENABLED=true, the real firebase-admin SDK is initialised
 * and pushes are delivered — no other code changes required.
 */

const path = require('path');
const fs = require('fs');
const env = require('./env');
const logger = require('./logger');

let admin = null;
let initialised = false;
let messaging = null;

function init() {
  if (initialised) return;
  initialised = true;

  if (!env.FCM_ENABLED) {
    logger.info('[fcm] disabled via env — using no-op sender');
    return;
  }

  const saPath = env.FCM_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.cwd(), env.FCM_SERVICE_ACCOUNT_PATH)
    : '';

  if (!saPath || !fs.existsSync(saPath)) {
    logger.warn('[fcm] FCM_ENABLED=true but service-account JSON not found — falling back to no-op', {
      path: saPath,
    });
    return;
  }

  // eslint-disable-next-line global-require, import/no-dynamic-require
  admin = require('firebase-admin');
  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  messaging = admin.messaging();
  logger.info('[fcm] firebase-admin initialised', { projectId: serviceAccount.project_id });
}

async function sendToTokens(tokens, payload) {
  if (!Array.isArray(tokens) || tokens.length === 0) return { successCount: 0, failureCount: 0 };
  if (!messaging) {
    logger.debug('[fcm] no-op send (fcm disabled)', { tokenCount: tokens.length, title: payload?.notification?.title });
    return { successCount: 0, failureCount: 0, disabled: true };
  }
  const message = {
    tokens,
    notification: payload.notification,
    data: payload.data || {},
    android: payload.android,
    apns: payload.apns,
  };
  return messaging.sendEachForMulticast(message);
}

function isEnabled() {
  return Boolean(messaging);
}

module.exports = { init, sendToTokens, isEnabled };

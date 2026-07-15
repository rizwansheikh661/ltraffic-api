'use strict';

const { Router } = require('express');

const { validate } = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');

const controller = require('./devices.controller');
const { RegisterSchema, UnregisterSchema } = require('./devices.validators');

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Devices
 *     description: |
 *       FCM device-token registration for the LTraffic mobile apps. Every
 *       endpoint requires a valid access token; per-device scoping is enforced
 *       server-side so a user can only manage their own tokens.
 *
 * components:
 *   schemas:
 *     DeviceRegisterRequest:
 *       type: object
 *       required: [token, platform]
 *       description: |
 *         Sent by the mobile app on launch AND whenever FCM issues a fresh token.
 *         The endpoint upserts — safe to call repeatedly.
 *       properties:
 *         token:
 *           type: string
 *           minLength: 10
 *           maxLength: 512
 *           description: '**REQUIRED.** The FCM registration token from `messaging().getToken()` (Android) / APNs-forwarded FCM token (iOS).'
 *           example: 'fMEP0vJqS0m:APA91bH...'
 *         platform:
 *           type: string
 *           enum: [ios, android]
 *           description: '**REQUIRED.** Which mobile platform issued the token.'
 *           example: 'android'
 *         appVersion:
 *           type: string
 *           maxLength: 32
 *           description: '**OPTIONAL.** Semver of the installed app build \u2014 helps diagnose per-version push issues.'
 *           example: '1.4.2'
 *
 *     DeviceUnregisterRequest:
 *       type: object
 *       required: [token]
 *       properties:
 *         token:
 *           type: string
 *           description: '**REQUIRED.** The FCM token to revoke. Server verifies it belongs to the caller before revoking.'
 *           example: 'fMEP0vJqS0m:APA91bH...'
 *
 *     DeviceRow:
 *       type: object
 *       properties:
 *         id:         { type: integer, example: 42 }
 *         token:      { type: string,  description: 'FCM token (truncated in responses for safety in some deployments).' }
 *         platform:   { type: string,  enum: [ios, android] }
 *         appVersion: { type: string,  nullable: true }
 *         createdAt:  { type: string,  format: date-time }
 *         updatedAt:  { type: string,  format: date-time }
 *
 *     DeviceRegisterResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           properties:
 *             registered: { type: boolean, example: true }
 *
 *     DeviceUnregisterResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           properties:
 *             revoked: { type: boolean, example: true, description: 'True when an active row was affected.' }
 *
 *     DeviceListResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: array
 *           items: { $ref: '#/components/schemas/DeviceRow' }
 */

/**
 * @openapi
 * /devices/register:
 *   post:
 *     tags: [Devices]
 *     summary: Register or refresh an FCM device token for the authenticated user
 *     description: |
 *       Upsert-safe. Call this on:
 *       - App launch (if a token exists in local storage).
 *       - FCM `onTokenRefresh` (Android) / APNs re-issue (iOS).
 *       - Successful login (bind the current device to the logged-in user).
 *
 *       **Required:** `Authorization: Bearer <accessToken>` header.
 *
 *       If the same `token` is already registered to another user, ownership is
 *       transferred to the current caller \u2014 covers the "shared device" case.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeviceRegisterRequest' }
 *           examples:
 *             android:
 *               summary: Android registration
 *               value: { token: 'fMEP0vJqS0m:APA91bH...', platform: 'android', appVersion: '1.4.2' }
 *             ios:
 *               summary: iOS registration
 *               value: { token: 'dEadBeEf...', platform: 'ios', appVersion: '1.4.2' }
 *     responses:
 *       200:
 *         description: Token stored (created or updated).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DeviceRegisterResponse' }
 *       401:
 *         description: '`UNAUTHORIZED` \u2014 missing or invalid bearer token.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       422:
 *         description: '`VALIDATION_ERROR` \u2014 missing/invalid fields.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
router.post('/register', authenticate, validate({ body: RegisterSchema }), controller.register);

/**
 * @openapi
 * /devices/unregister:
 *   post:
 *     tags: [Devices]
 *     summary: Revoke a device token so no further push is delivered to it
 *     description: |
 *       Call this on:
 *       - Logout (revoke the current device's token before dropping the session).
 *       - User-initiated push opt-out.
 *
 *       **Required:** `Authorization: Bearer <accessToken>` header.
 *
 *       Only the token owner can revoke it \u2014 attempts by another user return
 *       `revoked: false` silently.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeviceUnregisterRequest' }
 *     responses:
 *       200:
 *         description: OK. `revoked` shows whether an active row was affected.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DeviceUnregisterResponse' }
 *       401:
 *         description: '`UNAUTHORIZED`'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       422:
 *         description: '`VALIDATION_ERROR`'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
router.post('/unregister', authenticate, validate({ body: UnregisterSchema }), controller.unregister);

/**
 * @openapi
 * /devices:
 *   get:
 *     tags: [Devices]
 *     summary: List the authenticated user's active device tokens
 *     description: |
 *       Returns every active (non-revoked) device row owned by the caller.
 *       Useful for the mobile "signed-in devices" screen.
 *
 *       **Required:** `Authorization: Bearer <accessToken>` header.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of active device rows.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DeviceListResponse' }
 *       401:
 *         description: '`UNAUTHORIZED`'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
router.get('/', authenticate, controller.list);

module.exports = router;

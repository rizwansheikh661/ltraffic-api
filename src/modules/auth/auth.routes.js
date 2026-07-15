'use strict';

const { Router } = require('express');

const { validate } = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const rateLimit = require('../../middlewares/rateLimit.middleware');

const controller = require('./auth.controller');
const {
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} = require('./auth.validators');

const router = Router();

/* ──────────────────────────────────────────────────────────────
 *  Reusable schemas — auth module
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required: [password]
 *       description: |
 *         Provide ONE of `identifier`, `username`, or `email` — any of the three
 *         works. `password` is always required. `deviceId` is optional but strongly
 *         recommended for per-device logout support.
 *
 *         **Validation:** at least one of `identifier`, `username`, or `email`
 *         must be non-empty after trimming, otherwise the server returns 422.
 *
 *         | Field | Required | Notes |
 *         |-------|----------|-------|
 *         | identifier / username / email | ONE required | Merged server-side |
 *         | password | Yes | 1–200 chars |
 *         | deviceId | No | Ties refresh token to device |
 *       example:
 *         identifier: 'admin'
 *         password: 'Test@1234'
 *         deviceId: 'a1b2c3-d4e5f6'
 *       properties:
 *         identifier:
 *           type: string
 *           maxLength: 255
 *           description: '**PREFERRED.** Username OR email — backend auto-detects.'
 *           example: 'admin'
 *         username:
 *           type: string
 *           maxLength: 255
 *           description: 'Legacy alias for `identifier`. Accepted for PHP-parity.'
 *           example: 'admin'
 *         email:
 *           type: string
 *           maxLength: 255
 *           description: 'Legacy alias for `identifier`. Accepted for PHP-parity.'
 *           example: 'al@ltraffic.co.uk'
 *         password:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: '**REQUIRED.** Plain-text password. Server handles MD5/bcrypt comparison internally.'
 *           example: 'Test@1234'
 *         deviceId:
 *           type: string
 *           maxLength: 128
 *           description: |
 *             **OPTIONAL but recommended.** Stable per-device identifier from the
 *             mobile OS (Android: `Settings.Secure.ANDROID_ID`; iOS:
 *             `UIDevice.identifierForVendor`). Ties the issued refresh token to
 *             this device so per-device logout is possible later.
 *           example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 *
 *     LoginResponse:
 *       type: object
 *       description: |
 *         Successful login. Contains a short-lived JWT access token, a long-lived
 *         opaque refresh token, and the authenticated user's profile with resolved
 *         roles and `userType` routing hint.
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           required: [accessToken, accessExpiresIn, refreshToken, refreshExpiresAt, user]
 *           properties:
 *             accessToken:
 *               type: string
 *               description: |
 *                 JWT (HS256) to send on every subsequent request as
 *                 `Authorization: Bearer <accessToken>`. Expires in 15 minutes.
 *               example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3MjA1MjE1NDgsImV4cCI6MTcyMDUyMjQ0OCwiaXNzIjoibHRyYWZmaWMtYXBpIn0.abc123'
 *             accessExpiresIn:
 *               type: string
 *               description: 'Human-readable lifetime of `accessToken`.'
 *               example: '15m'
 *             refreshToken:
 *               type: string
 *               description: |
 *                 64-char opaque hex token. Store in **secure storage only**
 *                 (iOS Keychain / Android EncryptedSharedPreferences). Use on
 *                 `/auth/refresh` when the access token expires. Rotates on every use.
 *               example: '3f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a'
 *             refreshExpiresAt:
 *               type: string
 *               format: date-time
 *               description: 'Absolute UTC expiry of `refreshToken` (~60 days from login).'
 *               example: '2026-09-09T11:19:08.706Z'
 *             user:
 *               $ref: '#/components/schemas/AuthenticatedUser'
 *
 *     AuthenticatedUser:
 *       type: object
 *       description: |
 *         Profile of the logged-in user with resolved roles. Returned inside
 *         `LoginResponse.data.user` and from `GET /auth/me`.
 *
 *         **PHP compatibility:** field values are sourced from the shared
 *         `login_users` and `login_levels` tables — identical to what PHP reads.
 *       required: [id, username, name, email, levelIds, roles, userType]
 *       properties:
 *         id:
 *           type: integer
 *           description: 'Primary key from `login_users.user_id`.'
 *           example: 1
 *         username:
 *           type: string
 *           description: 'Login username from `login_users.username`.'
 *           example: 'admin'
 *         name:
 *           type: string
 *           description: 'Display name from `login_users.name1`.'
 *           example: 'Anthony Louch'
 *         email:
 *           type: string
 *           format: email
 *           description: 'Email address from `login_users.email`.'
 *           example: 'al@ltraffic.co.uk'
 *         ltrafficid:
 *           type: string
 *           nullable: true
 *           description: 'Employee ID from `login_users.ltrafficid`. Null if not assigned.'
 *           example: '00001'
 *         team:
 *           type: string
 *           nullable: true
 *           description: 'Team assignment from `login_users.team`.'
 *           example: 'director'
 *         levelIds:
 *           type: array
 *           items: { type: integer, minimum: 1, maximum: 9 }
 *           description: |
 *             Numeric level IDs from `login_levels`. A user may hold multiple
 *             levels (comma-separated in PHP `login_users.user_level`).
 *
 *             | ID | Role | userType |
 *             |----|------|----------|
 *             | 1 | Admin | admin |
 *             | 2 | Driving Operatives | employee |
 *             | 3 | Operatives | employee |
 *             | 4 | Admin1 | admin |
 *             | 5 | Civils TFL Driver | employee |
 *             | 6 | Civils Trailer Driver | employee |
 *             | 7 | Admin2 | admin |
 *             | 8 | Essex Supervisor | admin |
 *             | 9 | Customer | employee |
 *           example: [1]
 *         roles:
 *           type: array
 *           items: { type: string }
 *           description: |
 *             Human-readable role names matching PHP `protect("Admin, Admin1")`.
 *             Use these for client-side permission gating.
 *           example: ['Admin']
 *         userType:
 *           type: string
 *           enum: [admin, employee]
 *           description: |
 *             Routing hint: which mobile app this user belongs in.
 *             `admin` = levels 1, 4, 7, 8. `employee` = all others.
 *             Use this to decide which screens / navigation to show after login.
 *           example: 'admin'
 *
 *     RefreshRequest:
 *       type: object
 *       required: [refreshToken]
 *       description: 'Submit the current refresh token to obtain a new access + refresh token pair.'
 *       properties:
 *         refreshToken:
 *           type: string
 *           minLength: 1
 *           maxLength: 256
 *           description: '**REQUIRED.** The refresh token previously issued by `/auth/login` or `/auth/refresh`.'
 *           example: '3f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a'
 *
 *     RefreshResponse:
 *       type: object
 *       description: |
 *         New token pair after successful rotation. The previously submitted
 *         refresh token is now permanently revoked and cannot be reused.
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           required: [accessToken, accessExpiresIn, refreshToken, refreshExpiresAt]
 *           properties:
 *             accessToken:
 *               type: string
 *               description: 'New JWT access token (15m lifetime).'
 *               example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3MjA1MjI0NDgsImV4cCI6MTcyMDUyMzM0OCwiaXNzIjoibHRyYWZmaWMtYXBpIn0.def456'
 *             accessExpiresIn:
 *               type: string
 *               description: 'Human-readable lifetime.'
 *               example: '15m'
 *             refreshToken:
 *               type: string
 *               description: 'New opaque refresh token (60d lifetime). Replaces the submitted one — store it.'
 *               example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
 *             refreshExpiresAt:
 *               type: string
 *               format: date-time
 *               description: 'Absolute UTC expiry of the new refresh token.'
 *               example: '2026-09-09T11:19:08.706Z'
 *
 *     LogoutRequest:
 *       type: object
 *       required: [refreshToken]
 *       description: |
 *         Submit the refresh token to revoke it. The access token itself is NOT
 *         blacklisted — it is short-lived (15m) and will expire naturally.
 *         Clients should discard both tokens after calling this endpoint.
 *       properties:
 *         refreshToken:
 *           type: string
 *           minLength: 1
 *           maxLength: 256
 *           description: '**REQUIRED.** The refresh token to revoke.'
 *           example: '3f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a'
 *
 *     LogoutResponse:
 *       type: object
 *       description: |
 *         Logout result. Always returns HTTP 200 regardless of whether the
 *         token was found, to avoid leaking session state.
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           properties:
 *             revoked:
 *               type: boolean
 *               description: '`true` = an active token row was revoked. `false` = token was unknown or already revoked.'
 *               example: true
 *
 *     ChangePasswordRequest:
 *       type: object
 *       required: [currentPassword, newPassword]
 *       description: |
 *         Both the current and new password are required. On success all other
 *         refresh tokens for this user are revoked (forces re-login on every
 *         other device).
 *
 *         | Field | Constraints |
 *         |-------|-------------|
 *         | currentPassword | 1–200 chars |
 *         | newPassword | 8–72 chars (bcrypt limit) |
 *       properties:
 *         currentPassword:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: '**REQUIRED.** User must re-authenticate with their current password.'
 *           example: 'OldPass1!'
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           maxLength: 72
 *           description: '**REQUIRED.** New password. Minimum 8 chars, maximum 72 (bcrypt limit).'
 *           example: 'NewPass987!'
 *
 *     ChangePasswordResponse:
 *       type: object
 *       description: 'Password change confirmation. All other refresh tokens for this user have been revoked.'
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           properties:
 *             changed:
 *               type: boolean
 *               description: 'Always `true` on success.'
 *               example: true
 *
 *     ForgotPasswordRequest:
 *       type: object
 *       required: [email]
 *       description: |
 *         Request a password-reset link. The server always returns 202 regardless
 *         of whether the email exists in the database (anti-enumeration).
 *         The email is trimmed and lowercased server-side before lookup.
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 255
 *           description: '**REQUIRED.** Email address associated with the account.'
 *           example: 'user@example.com'
 *
 *     ForgotPasswordResponse:
 *       type: object
 *       description: |
 *         Always returns `requested: true` with HTTP 202. Does NOT reveal
 *         whether the email address exists in the database.
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           properties:
 *             requested:
 *               type: boolean
 *               description: 'Always `true`. Server does not disclose whether the email exists.'
 *               example: true
 *
 *     ResetPasswordRequest:
 *       type: object
 *       required: [key, newPassword]
 *       description: |
 *         Consume the 32-char reset key from the forgot-password email link and
 *         set a new password. The key is single-use and deleted after consumption.
 *
 *         | Field | Constraints |
 *         |-------|-------------|
 *         | key | Exactly 32 hex chars |
 *         | newPassword | 8–72 chars |
 *       properties:
 *         key:
 *           type: string
 *           minLength: 32
 *           maxLength: 32
 *           description: '**REQUIRED.** 32-char hex reset key from the forgot-password email link.'
 *           example: '87762735f29ba5aab8244d47ef37fd7f'
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           maxLength: 72
 *           description: '**REQUIRED.** New password. Minimum 8 chars, maximum 72 (bcrypt limit).'
 *           example: 'BrandNew1!'
 *
 *     ResetPasswordResponse:
 *       type: object
 *       description: 'Password reset confirmation. All refresh tokens for the user have been revoked.'
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: object
 *           properties:
 *             reset:
 *               type: boolean
 *               description: 'Always `true` on success. User must log in again.'
 *               example: true
 */

/* ──────────────────────────────────────────────────────────────
 *  POST /auth/login
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     operationId: login
 *     tags: [Authentication]
 *     summary: Log in with username or email
 *     security: []
 *     description: |
 *       Authenticates a user against the shared `login_users` table (same table
 *       the PHP web app uses).
 *
 *       **Required fields:**
 *       - `password` — always required (1–200 chars)
 *       - ONE of `identifier` / `username` / `email` — pick any, all three work
 *
 *       **Optional field:**
 *       - `deviceId` — a stable device identifier so per-device logout works later
 *
 *       **Response:** returns `accessToken` (15m JWT), `refreshToken` (60-day opaque
 *       token, rotates on every use), and the resolved user profile including
 *       `userType` — use `userType` to route to Admin or Employee UI.
 *
 *       **Rate limit:** 10 requests per 15 minutes per IP + 10 per account.
 *
 *       **PHP compatibility:** passwords are verified against the MD5 hash stored
 *       in `login_users.password`. On successful login, a bcrypt cache is lazily
 *       written to `lt_user_credentials` for future performance. PHP is unaffected.
 *
 *       | Scenario | HTTP | Error Code |
 *       |----------|------|------------|
 *       | Wrong credentials | 401 | `AUTH_INVALID_CREDENTIALS` |
 *       | User level disabled | 403 | `AUTH_USER_DISABLED` |
 *       | Missing/invalid fields | 422 | `VALIDATION_ERROR` |
 *       | Too many attempts | 429 | `RATE_LIMITED` |
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *           examples:
 *             withEmail:
 *               summary: Login with email
 *               value:
 *                 email: 'al@ltraffic.co.uk'
 *                 password: 'Test@1234'
 *                 deviceId: 'a1b2c3-d4e5f6'
 *             withIdentifier:
 *               summary: Login with identifier (preferred)
 *               value:
 *                 identifier: 'admin'
 *                 password: 'Test@1234'
 *                 deviceId: 'a1b2c3-d4e5f6'
 *             legacyUsername:
 *               summary: Legacy username field (PHP-parity)
 *               value:
 *                 username: 'admin'
 *                 password: 'Test@1234'
 *     responses:
 *       200:
 *         description: Login succeeded — tokens + user profile returned.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LoginResponse' }
 *             example:
 *               success: true
 *               data:
 *                 accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3MjA1MjE1NDgsImV4cCI6MTcyMDUyMjQ0OCwiaXNzIjoibHRyYWZmaWMtYXBpIn0.abc123'
 *                 accessExpiresIn: '15m'
 *                 refreshToken: '3f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a'
 *                 refreshExpiresAt: '2026-09-09T11:19:08.706Z'
 *                 user:
 *                   id: 1
 *                   username: 'admin'
 *                   name: 'Anthony Louch'
 *                   email: 'al@ltraffic.co.uk'
 *                   ltrafficid: '00001'
 *                   team: 'director'
 *                   levelIds: [1]
 *                   roles: ['Admin']
 *                   userType: 'admin'
 *       401:
 *         description: '`AUTH_INVALID_CREDENTIALS` — username/email not found or password wrong.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *             example:
 *               success: false
 *               error:
 *                 code: 'AUTH_INVALID_CREDENTIALS'
 *                 message: 'Invalid credentials'
 *                 details: null
 *                 requestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 *       403:
 *         description: '`AUTH_USER_DISABLED` — the user''s level is disabled in `login_levels`.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *             example:
 *               success: false
 *               error:
 *                 code: 'AUTH_USER_DISABLED'
 *                 message: 'User account is disabled'
 *                 details: null
 *                 requestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 *       429:
 *         $ref: '#/components/responses/RateLimited429'
 */
router.post('/login', rateLimit.auth, rateLimit.loginByAccount, validate({ body: LoginSchema }), controller.login);

/* ──────────────────────────────────────────────────────────────
 *  POST /auth/refresh
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     operationId: refreshToken
 *     tags: [Authentication]
 *     summary: Rotate a refresh token to get a new access token
 *     security: []
 *     description: |
 *       Call this when the `accessToken` expires (after ~15 minutes) or you
 *       receive a `401 AUTH_TOKEN_EXPIRED` error on any API call.
 *
 *       **What happens:**
 *       1. The presented `refreshToken` is revoked (single-use — rotation).
 *       2. A brand-new `accessToken` + `refreshToken` pair is issued.
 *       3. Both tokens must replace the old pair in secure storage.
 *
 *       **Mobile flow:**
 *       ```
 *       accessToken expires → POST /auth/refresh → save new pair → retry failed request
 *       ```
 *
 *       **Important:** if refresh fails with 401, the user's session has ended.
 *       Navigate to the login screen.
 *
 *       **Rate limit:** 10 requests per 15 minutes per IP.
 *
 *       | Scenario | HTTP | Error Code |
 *       |----------|------|------------|
 *       | Token unknown / expired / already used | 401 | `AUTH_REFRESH_INVALID` |
 *       | Too many attempts | 429 | `RATE_LIMITED` |
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RefreshRequest' }
 *           example:
 *             refreshToken: '3f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a'
 *     responses:
 *       200:
 *         description: New token pair issued. Old refresh token is now invalid.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RefreshResponse' }
 *             example:
 *               success: true
 *               data:
 *                 accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3MjA1MjI0NDgsImV4cCI6MTcyMDUyMzM0OCwiaXNzIjoibHRyYWZmaWMtYXBpIn0.def456'
 *                 accessExpiresIn: '15m'
 *                 refreshToken: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
 *                 refreshExpiresAt: '2026-09-09T11:19:08.706Z'
 *       401:
 *         description: '`AUTH_REFRESH_INVALID` — token unknown, expired, or already revoked. User must log in again.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *             example:
 *               success: false
 *               error:
 *                 code: 'AUTH_REFRESH_INVALID'
 *                 message: 'Refresh token is invalid or expired'
 *                 details: null
 *                 requestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 *       429:
 *         $ref: '#/components/responses/RateLimited429'
 */
router.post('/refresh', rateLimit.auth, validate({ body: RefreshSchema }), controller.refresh);

/* ──────────────────────────────────────────────────────────────
 *  POST /auth/logout
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     operationId: logout
 *     tags: [Authentication]
 *     summary: Revoke the current refresh token
 *     security: []
 *     description: |
 *       Marks the presented refresh token as revoked so it can no longer be used
 *       for token rotation. The access token itself is NOT blacklisted — it is
 *       short-lived (15m) and will expire naturally.
 *
 *       **Client behaviour after calling this endpoint:**
 *       1. Discard both tokens from secure storage.
 *       2. Navigate to the login screen.
 *
 *       **Always returns 200.** The `revoked` boolean indicates whether an active
 *       row was actually affected (`false` if the token was unknown or already
 *       revoked). This prevents information leakage about session state.
 *
 *       **Restriction:** no `Authorization` header is required — the refresh
 *       token in the body is the only credential needed.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LogoutRequest' }
 *           example:
 *             refreshToken: '3f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a'
 *     responses:
 *       200:
 *         description: 'OK. `revoked` shows whether an active row was affected.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LogoutResponse' }
 *             examples:
 *               tokenFound:
 *                 summary: Token was active and is now revoked
 *                 value:
 *                   success: true
 *                   data:
 *                     revoked: true
 *               tokenUnknown:
 *                 summary: Token was unknown or already revoked
 *                 value:
 *                   success: true
 *                   data:
 *                     revoked: false
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 *       429:
 *         $ref: '#/components/responses/RateLimited429'
 */
router.post('/logout', validate({ body: LogoutSchema }), controller.logout);

/* ──────────────────────────────────────────────────────────────
 *  GET /auth/me
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     operationId: getMe
 *     tags: [Authentication]
 *     summary: Get the current user's profile
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns the fresh profile of whoever owns the presented access token.
 *       Useful for:
 *       - Restoring session state on app launch (validate stored access token).
 *       - Refreshing role/team info without needing a full re-login.
 *
 *       **Requires:** `Authorization: Bearer <accessToken>` header.
 *
 *       **Business rule:** profile data is fetched live from `login_users` +
 *       `login_levels`, so any admin changes to the user's roles or team are
 *       reflected immediately without re-login.
 *
 *       | Role | Can Access |
 *       |------|------------|
 *       | All authenticated users | Yes |
 *     responses:
 *       200:
 *         description: The authenticated user's profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/AuthenticatedUser' }
 *             example:
 *               success: true
 *               data:
 *                 id: 1
 *                 username: 'admin'
 *                 name: 'Anthony Louch'
 *                 email: 'al@ltraffic.co.uk'
 *                 ltrafficid: '00001'
 *                 team: 'director'
 *                 levelIds: [1]
 *                 roles: ['Admin']
 *                 userType: 'admin'
 *       401:
 *         $ref: '#/components/responses/Unauthorized401'
 */
router.get('/me', authenticate, controller.me);

/* ──────────────────────────────────────────────────────────────
 *  POST /auth/change-password
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     operationId: changePassword
 *     tags: [Authentication]
 *     summary: Change the authenticated user's password
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Verifies the current password, then updates it. Both fields are required.
 *
 *       **What happens under the hood (transactional):**
 *       1. Writes the new MD5 to `login_users.password` — so the PHP web app
 *          keeps working with the new password immediately.
 *       2. Rebuilds the bcrypt cache in `lt_user_credentials`.
 *       3. Revokes ALL outstanding refresh tokens for this user (forces
 *          re-login on every other device).
 *
 *       **Requires:** `Authorization: Bearer <accessToken>` header.
 *
 *       **PHP compatibility:** the PHP web app reads `login_users.password`
 *       (MD5), which is updated in step 1. Both systems always accept the
 *       same password.
 *
 *       **Rate limit:** 5 attempts per 15 minutes per authenticated user.
 *
 *       | Scenario | HTTP | Error Code |
 *       |----------|------|------------|
 *       | Current password wrong | 401 | `AUTH_INVALID_CREDENTIALS` |
 *       | New password too short/long | 422 | `VALIDATION_ERROR` |
 *       | Too many attempts | 429 | `RATE_LIMITED` |
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ChangePasswordRequest' }
 *           example:
 *             currentPassword: 'OldPass1!'
 *             newPassword: 'NewPass987!'
 *     responses:
 *       200:
 *         description: Password changed. All other sessions have been logged out.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ChangePasswordResponse' }
 *             example:
 *               success: true
 *               data:
 *                 changed: true
 *       401:
 *         description: '`AUTH_INVALID_CREDENTIALS` — current password was wrong.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *             example:
 *               success: false
 *               error:
 *                 code: 'AUTH_INVALID_CREDENTIALS'
 *                 message: 'Invalid credentials'
 *                 details: null
 *                 requestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 *       429:
 *         description: '`RATE_LIMITED` — 5 attempts per 15 min per authenticated user.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *             example:
 *               success: false
 *               error:
 *                 code: 'RATE_LIMITED'
 *                 message: 'Too many requests, please try again later'
 *                 details: null
 *                 requestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 */
router.post(
  '/change-password',
  authenticate,
  rateLimit.changePasswordByUser,
  validate({ body: ChangePasswordSchema }),
  controller.changePassword,
);

/* ──────────────────────────────────────────────────────────────
 *  POST /auth/forgot-password
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     operationId: forgotPassword
 *     tags: [Authentication]
 *     summary: Request a password-reset email
 *     security: []
 *     description: |
 *       Writes a reset row into `login_confirm` (same table shape as PHP
 *       `forgot.class.php`) and — in a later phase — sends the user an email
 *       with a reset link containing a 32-char key.
 *
 *       **Anti-enumeration:** always returns `202 Accepted`, whether or not the
 *       email exists in the database. The mobile app must NOT tell the user
 *       whether the address was valid.
 *
 *       **PHP compatibility:** uses the same `login_confirm` table with
 *       `type='forgot_pw'` that the PHP forgot-password flow reads.
 *
 *       **Business rules:**
 *       - Email is trimmed and lowercased before lookup.
 *       - If the email is not found, no row is written — but 202 is still returned.
 *       - Multiple requests overwrite the previous reset key.
 *
 *       **Rate limit:** 10 requests per 15 minutes per IP.
 *
 *       | Scenario | HTTP | Error Code |
 *       |----------|------|------------|
 *       | Email exists or not | 202 | — (always succeeds) |
 *       | Email missing/malformed | 422 | `VALIDATION_ERROR` |
 *       | Too many attempts | 429 | `RATE_LIMITED` |
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ForgotPasswordRequest' }
 *           example:
 *             email: 'user@example.com'
 *     responses:
 *       202:
 *         description: Request accepted (whether the email exists or not).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ForgotPasswordResponse' }
 *             example:
 *               success: true
 *               data:
 *                 requested: true
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 *       429:
 *         $ref: '#/components/responses/RateLimited429'
 */
router.post(
  '/forgot-password',
  rateLimit.auth,
  validate({ body: ForgotPasswordSchema }),
  controller.forgotPassword,
);

/* ──────────────────────────────────────────────────────────────
 *  POST /auth/reset-password
 * ────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     operationId: resetPassword
 *     tags: [Authentication]
 *     summary: Consume a reset key and set a new password
 *     security: []
 *     description: |
 *       Called from the deep-link screen after the user taps the link in the
 *       forgot-password email.
 *
 *       **What happens (transactional):**
 *       1. Verifies the 32-char `key` exists in `login_confirm` with `type='forgot_pw'`.
 *       2. Writes the new MD5 to `login_users.password` (PHP-compatible).
 *       3. Rebuilds the bcrypt cache in `lt_user_credentials`.
 *       4. Revokes ALL refresh tokens for that user.
 *       5. Deletes the `login_confirm` row so the key cannot be reused.
 *
 *       **PHP compatibility:** the new MD5 is written to `login_users.password`
 *       so the PHP web app immediately accepts the new password.
 *
 *       **Business rules:**
 *       - The key is single-use — once consumed, it is deleted.
 *       - If the key is invalid or already used, 400 is returned.
 *       - All sessions are terminated (refresh tokens revoked).
 *
 *       **Rate limit:** 10 requests per 15 minutes per IP.
 *
 *       | Scenario | HTTP | Error Code |
 *       |----------|------|------------|
 *       | Key invalid / used / user deleted | 400 | `BAD_REQUEST` |
 *       | Validation failure | 422 | `VALIDATION_ERROR` |
 *       | Too many attempts | 429 | `RATE_LIMITED` |
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResetPasswordRequest' }
 *           example:
 *             key: '87762735f29ba5aab8244d47ef37fd7f'
 *             newPassword: 'BrandNew1!'
 *     responses:
 *       200:
 *         description: Password reset. User must log in again with the new password.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ResetPasswordResponse' }
 *             example:
 *               success: true
 *               data:
 *                 reset: true
 *       400:
 *         description: '`BAD_REQUEST` — key invalid, already used, or user no longer exists.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *             example:
 *               success: false
 *               error:
 *                 code: 'BAD_REQUEST'
 *                 message: 'Reset key is invalid or has already been used'
 *                 details: null
 *                 requestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 *       422:
 *         $ref: '#/components/responses/ValidationError422'
 *       429:
 *         $ref: '#/components/responses/RateLimited429'
 */
router.post(
  '/reset-password',
  rateLimit.auth,
  validate({ body: ResetPasswordSchema }),
  controller.resetPassword,
);

module.exports = router;

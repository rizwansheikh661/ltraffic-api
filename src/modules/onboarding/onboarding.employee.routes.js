'use strict';

const { Router } = require('express');
const ctrl = require('./onboarding.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { OnboardingSubmitSchema } = require('./onboarding.validators');

const router = Router();

/**
 * @openapi
 * /employee/onboarding/status:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding status
 *     description: Returns whether the authenticated user has completed onboarding.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     completed: { type: boolean }
 *                     ltrafficid: { type: string, nullable: true }
 *                     name: { type: string, nullable: true }
 *                     name1: { type: string, nullable: true }
 */
router.get('/status',
  authenticate,
  ctrl.getStatus,
);

/**
 * @openapi
 * /employee/onboarding:
 *   post:
 *     tags: [Onboarding]
 *     summary: Submit onboarding form
 *     description: |
 *       Submits the employee onboarding (HR record). Inserts into the hr table and
 *       marks login_users.onboarding = '1'. Photo and signature paths are generated
 *       automatically from the user's name1 field (matching PHP behavior).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstname, surname, dob, address, telephone, email, nationality, contactname1, contacttelephone1, relation1, startdate, ninumber]
 *             properties:
 *               firstname: { type: string }
 *               middlename: { type: string }
 *               surname: { type: string }
 *               dob: { type: string }
 *               address: { type: string }
 *               telephone: { type: string }
 *               email: { type: string, format: email }
 *               nationality: { type: string }
 *               contactname1: { type: string }
 *               contacttelephone1: { type: string }
 *               relation1: { type: string }
 *               contactname2: { type: string }
 *               contacttelephone2: { type: string }
 *               relation2: { type: string }
 *               startdate: { type: string }
 *               cis: { type: string }
 *               ninumber: { type: string }
 *               confirm: { type: string }
 *               date_signed: { type: string }
 *     responses:
 *       201:
 *         description: Onboarding completed
 *       404:
 *         description: User not found
 */
router.post('/',
  authenticate,
  validate({ body: OnboardingSubmitSchema }),
  ctrl.submit,
);

/**
 * @openapi
 * /employee/onboarding:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get own onboarding record
 *     description: Returns the authenticated user's HR record created during onboarding.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: HR record
 *       404:
 *         description: No onboarding record found
 */
router.get('/',
  authenticate,
  ctrl.getOwnRecord,
);

module.exports = router;

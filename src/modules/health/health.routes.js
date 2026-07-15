'use strict';

const { Router } = require('express');
const controller = require('./health.controller');

const router = Router();

router.get('/', controller.check);

module.exports = router;

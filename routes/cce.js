'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/cceController');

router.post('/marks/bulk',          ctrl.saveBulkMarks);
router.post('/marks',               ctrl.saveMarks);
router.get('/marks',                ctrl.getMarks);
router.get('/results/halfyear',     ctrl.getHalfYearResults);
router.get('/results/final',        ctrl.getFinalResults);
router.get('/report/:studentId',    ctrl.getStudentReport);

module.exports = router;

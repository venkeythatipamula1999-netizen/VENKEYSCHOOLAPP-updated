'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/cceController');

router.post('/marks/bulk',                ctrl.saveBulkMarks);
router.post('/marks',                     ctrl.saveMarks);
router.get('/marks',                      ctrl.getMarks);
router.get('/my-assigned-subjects',       ctrl.getMyAssignedSubjects);
router.post('/admin/assign-subject',      ctrl.assignTeacherSubject);
router.delete('/admin/assign-subject',    ctrl.removeTeacherSubject);
router.get('/admin/teacher-subjects',     ctrl.getTeacherSubjects);
router.get('/results/halfyear',           ctrl.getHalfYearResults);
router.get('/results/final',              ctrl.getFinalResults);
router.get('/report/:studentId',          ctrl.getStudentReport);
router.get('/student-summary/:studentId', ctrl.getStudentSummary);

module.exports = router;

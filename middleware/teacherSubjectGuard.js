'use strict';

const admin = require('firebase-admin');

const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID || 'school_001';

const BYPASS_ROLES = ['principal', 'admin', 'staff'];

/**
 * Middleware: stricty enforce that a teacher can only submit marks
 * for subjects and classes they are assigned to.
 *
 * Principal / Admin / Staff bypass this check completely.
 * Applied only to POST /api/cce/marks.
 */
async function teacherSubjectGuard(req, res, next) {
  try {
    const role = req.userRole || '';

    if (BYPASS_ROLES.includes(role)) {
      return next();
    }

    const { subjectId, classId, section, academicYear } = req.body;
    const teacherId = req.userId || '';
    const schoolId  = req.schoolId || DEFAULT_SCHOOL_ID;
    
    console.log(`[teacherSubjectGuard Debug] Checking: school=${schoolId}, teacher=${teacherId}, subject=${subjectId}, class=${classId}, year=${academicYear}`);


    if (!subjectId || !classId || !academicYear) {
      return res.status(400).json({
        error: 'subjectId, classId, and academicYear are required',
      });
    }

    const snap = await admin.firestore()
      .collection('schools')
      .doc(schoolId)
      .collection('teacher_subjects')
      .where('teacherId',    '==', teacherId)
      .where('subjectId',    '==', subjectId)
      .where('classId',      '==', classId)
      .where('academicYear', '==', academicYear)
      .get();

    if (!snap.empty) {
      if (section) {
        const sectionMatch = snap.docs.some(d => {
          const s = d.data().section;
          return !s || s === 'ALL' || s === section;
        });
        if (!sectionMatch) {
          return res.status(403).json({
            error: 'You are not assigned to this subject/class',
          });
        }
      }
      return next();
    }

    const userDoc = await admin.firestore().collection('users').doc(teacherId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const teacherSubject = (userData.subject || '').toLowerCase();
      const assignedClasses = (userData.assignedClasses || []).map(c => c.trim().toLowerCase());
      const timetable = userData.timetable || [];

      const subjectMatch = teacherSubject === subjectId.toLowerCase() ||
        timetable.some(t => (t.subject || '').toLowerCase() === subjectId.toLowerCase());

      const classNorm = classId.replace(/^Grade\s*/i, '').trim().toLowerCase();
      const classMatch = assignedClasses.some(ac => ac.replace(/^Grade\s*/i, '').trim() === classNorm) ||
        timetable.some(t => (t.className || '').replace(/^Grade\s*/i, '').trim().toLowerCase() === classNorm);

      if (subjectMatch && classMatch) {
        console.log(`[teacherSubjectGuard] Fallback passed for ${teacherId}: ${subjectId} in ${classId}`);
        return next();
      }
    }

    return res.status(403).json({
      error: 'You are not assigned to this subject/class',
    });
  } catch (err) {
    console.error('[teacherSubjectGuard]', err.message);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

module.exports = teacherSubjectGuard;

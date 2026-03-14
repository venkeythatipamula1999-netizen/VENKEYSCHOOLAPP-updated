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

    if (snap.empty) {
      return res.status(403).json({
        error: 'You are not assigned to this subject/class',
      });
    }

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

    next();
  } catch (err) {
    console.error('[teacherSubjectGuard]', err.message);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

module.exports = teacherSubjectGuard;

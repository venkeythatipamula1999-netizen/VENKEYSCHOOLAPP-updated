'use strict';

const admin = require('firebase-admin');

function db() { return admin.firestore(); }

/**
 * Notify admin when marks are submitted (POST /api/cce/marks).
 * Writes to schools/{schoolId}/notifications
 */
async function notifyAdminMarksSubmitted(schoolId, data) {
  try {
    await db()
      .collection('schools').doc(schoolId)
      .collection('notifications').add({
        type:         'MARKS_SUBMITTED',
        teacherName:  data.teacherName  || '',
        className:    data.className    || '',
        subjectName:  data.subjectName  || '',
        examType:     data.examType     || '',
        studentCount: data.studentCount || 1,
        timestamp:    data.timestamp    || new Date().toISOString(),
        read:         false,
        createdAt:    data.timestamp    || new Date().toISOString(),
      });
  } catch (err) {
    console.error('[notificationService] notifyAdminMarksSubmitted:', err.message);
  }
}

/**
 * Notify admin when marks are edited (PUT /api/cce/marks).
 * Writes to schools/{schoolId}/notifications
 */
async function notifyAdminMarksEdited(schoolId, data) {
  try {
    await db()
      .collection('schools').doc(schoolId)
      .collection('notifications').add({
        type:          'MARKS_EDITED',
        teacherName:   data.teacherName   || '',
        className:     data.className     || '',
        studentName:   data.studentName   || '',
        subjectName:   data.subjectName   || '',
        previousMarks: data.previousMarks ?? null,
        updatedMarks:  data.updatedMarks  ?? null,
        reason:        data.reason        || '',
        timestamp:     data.timestamp     || new Date().toISOString(),
        read:          false,
        createdAt:     data.timestamp     || new Date().toISOString(),
      });
  } catch (err) {
    console.error('[notificationService] notifyAdminMarksEdited:', err.message);
  }
}

/**
 * Notify parent when their child's marks are saved or edited.
 * Looks up parentId from students collection, then writes to
 * schools/{schoolId}/parent_notifications
 */
async function notifyParentMarksUpdated(schoolId, studentId, data) {
  try {
    let parentId   = null;
    let studentName = data.studentName || studentId;

    const directDoc = await db().collection('students').doc(studentId).get();
    if (directDoc.exists) {
      const d = directDoc.data();
      parentId    = d.parentId || d.parent_uid || null;
      studentName = d.full_name || d.name || studentName;
    } else {
      const q = await db()
        .collection('students')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      if (!q.empty) {
        const d = q.docs[0].data();
        parentId    = d.parentId || d.parent_uid || null;
        studentName = d.full_name || d.name || studentName;
      }
    }

    await db()
      .collection('schools').doc(schoolId)
      .collection('parent_notifications').add({
        type:          'MARKS_UPDATED',
        parentId:      parentId || null,
        studentId,
        studentName,
        subjectName:   data.subjectName   || '',
        examType:      data.examType      || '',
        marks:         data.marks         ?? null,
        previousMarks: data.previousMarks ?? null,
        gradeLetter:   data.gradeLetter   || null,
        timestamp:     data.timestamp     || new Date().toISOString(),
        read:          false,
        createdAt:     data.timestamp     || new Date().toISOString(),
      });
  } catch (err) {
    console.error('[notificationService] notifyParentMarksUpdated:', err.message);
  }
}

module.exports = {
  notifyAdminMarksSubmitted,
  notifyAdminMarksEdited,
  notifyParentMarksUpdated,
};

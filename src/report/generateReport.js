const fs = require('fs');
const path = require('path');

function escape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

function fileSection(label, filePath) {
  const content = readFile(filePath);
  if (!content) return `<div class="file-block"><div class="file-header"><span class="file-name">${escape(filePath)}</span><span class="file-meta">file not found</span></div></div>`;
  const lines = content.split('\n').length;
  const ext = path.extname(filePath).slice(1) || 'txt';
  return `
<div class="file-block">
  <div class="file-header">
    <span class="file-name">${escape(filePath)}</span>
    <span class="file-meta">${lines} lines · .${ext}</span>
  </div>
  <pre class="code">${escape(content)}</pre>
</div>`;
}

function sectionTitle(title, icon) {
  return `<div class="section-title"><span class="sec-icon">${icon}</span>${escape(title)}</div>`;
}

function generateReport() {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const apiRoutes = [
    ['POST', '/api/login', 'Login for teacher, driver, cleaner — returns session token and user profile'],
    ['POST', '/api/admin/login', 'Admin/Principal login with email + password'],
    ['POST', '/api/parent/login', 'Parent login with phone number + 4-digit PIN'],
    ['POST', '/api/parent/register', 'Register new parent, link to children by studentId'],
    ['POST', '/api/parent/set-pin', 'Set or change parent login PIN'],
    ['GET', '/api/teacher/profile', 'Fetch teacher profile, subject, assignedClasses, timetable'],
    ['GET', '/api/teacher/permissions', 'Fetch allowed subjects and class map for marks entry permission'],
    ['GET', '/api/teacher/students', 'List all students assigned to teacher class'],
    ['GET', '/api/teacher/calendar', 'Fetch teacher personal event calendar'],
    ['GET', '/api/classes', 'List all classes with student count'],
    ['POST', '/api/classes/add', 'Add a new class to the school'],
    ['DELETE', '/api/classes/:id', 'Delete a class by ID'],
    ['POST', '/api/classes/delete', 'Alternative class deletion endpoint'],
    ['GET', '/api/students/:classId', 'Get all students in a specific class'],
    ['POST', '/api/students/add', 'Add a new student record to a class'],
    ['GET', '/api/attendance/:classId', 'Get attendance records for a class'],
    ['POST', '/api/attendance/mark', 'Mark or update attendance for a student'],
    ['GET', '/api/attendance/student/:studentId', 'Get attendance history for a student (parent view)'],
    ['POST', '/api/marks/save', 'Save marks for a subject + exam type (normalizes subject names)'],
    ['GET', '/api/marks/view', 'View marks filtered by examType and classId'],
    ['GET', '/api/marks/summary', 'School-wide subject averages from student_marks collection'],
    ['GET', '/api/marks/class/:classId', 'Full marks breakdown for a class: per-student, per-subject, per-exam'],
    ['GET', '/api/marks/student/:studentId', 'All marks for a specific student grouped by exam and subject'],
    ['POST', '/api/leave/request', 'Submit student leave request — routes to assigned teacher'],
    ['GET', '/api/leave/teacher', 'Get all pending leave requests assigned to a teacher'],
    ['POST', '/api/leave/update-status', 'Approve or reject a student leave request'],
    ['GET', '/api/leave/parent', 'Get student leave history for parent view'],
    ['GET', '/api/leave/admin', 'Get all leave requests for admin overview'],
    ['POST', '/api/leave/staff', 'Submit leave request for staff (teacher/driver/cleaner)'],
    ['GET', '/api/leave/staff/:roleId', 'Get leave records for a specific staff member'],
    ['GET', '/api/admin/leaves', 'Admin: combined view of all staff and student leaves'],
    ['POST', '/api/admin/leaves/approve', 'Admin: approve a staff leave request'],
    ['POST', '/api/admin/leaves/reject', 'Admin: reject a staff leave request'],
    ['GET', '/api/trip/active', 'Get currently active bus trip'],
    ['POST', '/api/trip/start', 'Driver starts a new trip (morning/evening auto-detected by IST hour)'],
    ['POST', '/api/trip/end', 'Driver ends the active trip'],
    ['POST', '/api/trip/scan', 'Driver scans student QR code during trip'],
    ['GET', '/api/trip/student-status', 'Get trip boarding status for a specific student (parent)'],
    ['GET', '/api/trip/history', 'Trip history log'],
    ['GET', '/api/trip/daily-summary', 'Admin: daily trip summary across all buses'],
    ['GET', '/api/salary/driver', 'Driver salary details and payment history'],
    ['POST', '/api/salary/driver/pay', 'Mark driver monthly salary as paid'],
    ['GET', '/api/admin/salary', 'Admin: all staff salaries'],
    ['POST', '/api/admin/salary/update', 'Admin: update a staff salary amount'],
    ['GET', '/api/fees', 'Get fee records for the school'],
    ['POST', '/api/fees/pay', 'Record a fee payment'],
    ['GET', '/api/activities', 'List school activities and events'],
    ['POST', '/api/activities', 'Create a new school activity/event'],
    ['GET', '/api/events', 'List calendar events'],
    ['POST', '/api/events', 'Create a calendar event'],
    ['GET', '/api/alerts/driver', 'Proximity/geofence alerts for driver'],
    ['GET', '/api/admin/alerts', 'All system alerts for admin view'],
    ['POST', '/api/admin/import-csv', 'Bulk import students and marks from a CSV file'],
    ['GET', '/api/onboarded-users', 'List all users onboarded by the principal'],
    ['POST', '/api/users/create', 'Create/onboard a new user (teacher, driver, cleaner)'],
    ['GET', '/api/report', 'Generate and download this full codebase report as HTML/PDF'],
  ];

  const collections = [
    ['users', 'All staff users. Fields: role_id, role (teacher/driver/cleaner), email, full_name, subject, classTeacherOf, assignedClasses, timetable[], salary, onboarded_by'],
    ['students', 'Student records. Fields: studentId, name, classId, rollNumber, parentPhone, schoolId (school_001)'],
    ['classes', 'Class definitions. Fields: name (e.g. "4-A"), schoolId, createdAt'],
    ['student_marks', 'Marks per student. Fields: studentId, studentName, classId, subject (normalized), examType, marksObtained, maxMarks, recordedBy, timestamp'],
    ['attendance', 'Daily attendance records. Fields: studentId, classId, date (YYYY-MM-DD), status (present/absent/late), markedBy'],
    ['leaveRequests', 'Student leave requests (new camelCase collection). Fields: studentId, studentName, studentClass, studentClassNormalized, assignedTeacherId, reason, startDate, endDate, status (Pending/Approved/Rejected), requestedAt'],
    ['leave_requests', 'Staff leave requests (legacy underscore collection). Fields: roleId, name, role, reason, from, to, status, days'],
    ['trips', 'Bus trip records. Fields: driverId, tripType (morning/evening), status (active/completed), startTime, endTime, schoolId'],
    ['trip_scans', 'QR scan events within trips. Fields: tripId, studentId, studentName, timestamp (IST), type (board/alight)'],
    ['salaries', 'Staff salary records. Fields: roleId, name, role, baseSalary, paidMonths[], deductions'],
    ['fees', 'Student fee records. Fields: studentId, amount, dueDate, status (paid/unpaid), paidDate'],
    ['events', 'School calendar events. Fields: title, date, description, category, schoolId'],
    ['activities', 'School activities (gallery/announcements). Fields: title, description, date, category, media[]'],
    ['alerts', 'System/proximity alerts. Fields: type, message, driverId, studentId, timestamp, read'],
    ['parent_children', 'Maps parent phone number to array of studentIds for multi-child support'],
  ];

  const screens = [
    ['Admin / Principal', [
      ['AdminOverview', 'Home dashboard: live counts (students, teachers, buses), attendance stats, upcoming events calendar, recent activity feed'],
      ['AdminUsers', 'Onboard new teachers/drivers/cleaners with role assignment, subject mapping, class assignment, salary config, timetable builder'],
      ['AdminClasses', 'Create classes (e.g. Grade 4-A), view roster per class, delete classes'],
      ['AdminStudents', 'Full student list view — imported via CSV bulk upload or added manually (unrouted in nav)'],
      ['AdminLeaveScreen', 'View all pending and resolved leave requests (student + staff), approve/reject with one tap'],
      ['AdminActivities', 'Create and manage school events, photo galleries, and announcements'],
      ['AdminReports', 'Analytics: school-wide subject averages bar chart, class drill-down (topper/rankers), per-student marks deep-dive, bus data tabs'],
      ['AdminSalaryScreen', 'View staff salary table, mark months as paid, track deductions'],
      ['AdminFeeScreen', 'View student fee status, record payments'],
      ['AdminBuses', 'Bus route summary and driver overview'],
      ['AdminAlerts', 'System-wide alert feed'],
      ['AdminSettings', 'School app configuration settings'],
      ['AdminProfile', 'Admin/principal personal profile'],
    ]],
    ['Teacher', [
      ['TeacherDashboard', 'Quick-action hub with cards: Take Attendance, Enter Marks, Leave Alerts (badge count), View Schedule, Apply Personal Leave'],
      ['TeacherAttendance', 'Mark daily attendance for assigned class — present/absent/late per student, view historical attendance'],
      ['TeacherMarksScreen', 'Entry Mode: select subject + exam type + class → enter marks per student. View Mode: read-only table of class marks by exam'],
      ['TeacherAlertsScreen', 'Incoming student leave requests — pending/approved/rejected tabs, approve or reject with comments, real-time refetch on tab focus'],
      ['TeacherPersonalScreen', 'Teacher personal leave application — date range picker, reason, submit to admin'],
      ['TeacherScheduleScreen', 'Class timetable display — period-by-period schedule for the week'],
      ['TeacherBusMonitor', 'Bus monitoring screen (currently shows hardcoded mock data — not connected to live trips)'],
      ['TeacherProfile', 'Teacher profile with subject and class assignment display, change password'],
    ]],
    ['Parent', [
      ['ParentDashboard', 'Multi-child switcher at top, quick tiles for all child screens: Leave, Marks, Attendance, Bus, Fees, Activities'],
      ['LeaveScreen', 'Apply leave request for child — start/end date, reason; view submitted leaves with status badges'],
      ['MarksScreen', 'Child academic performance — overall % donut, exam-wise bar chart, subject averages with progress bars; drill into any exam for detail'],
      ['AttendanceScreen', 'Child attendance calendar — monthly view with colored days, overall attendance %, period breakdown'],
      ['BusScreen', 'Real-time bus/trip tracking — show if child has boarded, current trip status, estimated arrival'],
      ['FeeScreen', 'Fee payment status for the child'],
      ['ActivitiesScreen', 'School events and activities feed'],
      ['NotificationsScreen', 'App notification history'],
      ['DigitalFolder', 'Digital documents, circulars, and resources'],
    ]],
    ['Driver', [
      ['DriverDashboard', 'Trip controls: Start Trip / End Trip buttons, live scan count, trip duration timer, morning/evening auto-detection'],
      ['DriverDuration', 'Historical daily trip duration log'],
      ['DriverLeave', 'Personal leave application form (currently local state only — not persisted to Firestore)'],
      ['DriverScans', 'List of QR scan events from current and past trips'],
      ['DriverStudentLocations', 'Map view of student pickup/dropoff locations'],
      ['DriverProximityAlerts', 'Geofence alerts when driver approaches a student stop'],
      ['DriverProfile', 'Driver profile and salary summary'],
    ]],
    ['Cleaner', [
      ['CleanerDashboard', 'Check-in/check-out buttons, daily task list, work status'],
      ['CleanerScanner', 'QR scanner for cleaning area verification (currently static/hardcoded)'],
      ['CleanerDuration', 'Daily work duration display (currently static)'],
      ['CleanerLeave', 'Personal leave application (currently local state only — not persisted)'],
      ['CleanerAlerts', 'Supervisor alerts feed'],
      ['CleanerProfile', 'Cleaner profile and assignment details'],
    ]],
  ];

  const apiRoutesHtml = apiRoutes.map(([method, p, desc]) =>
    `<tr><td><span class="badge badge-${method.toLowerCase()}">${method}</span></td><td><code>${escape(p)}</code></td><td>${escape(desc)}</td></tr>`
  ).join('');

  const collectionsHtml = collections.map(([name, desc]) =>
    `<tr><td><code>${escape(name)}</code></td><td>${escape(desc)}</td></tr>`
  ).join('');

  const screensHtml = screens.map(([role, list]) =>
    `<tr class="role-row"><td colspan="2"><strong>${escape(role)} Portal</strong></td></tr>` +
    list.map(([name, desc]) =>
      `<tr><td><code>${escape(name)}</code></td><td>${escape(desc)}</td></tr>`
    ).join('')
  ).join('');

  const sourceGroups = [
    ['Root Files', [
      ['App.js', 'App.js'],
      ['server.js', 'server.js'],
      ['app.json', 'app.json'],
      ['package.json', 'package.json'],
      ['babel.config.js', 'babel.config.js'],
      ['firestore.rules', 'firestore.rules'],
    ]],
    ['Auth Screens', [
      ['SplashIntroScreen.js', 'src/screens/auth/SplashIntroScreen.js'],
      ['SplashScreen.js', 'src/screens/auth/SplashScreen.js'],
      ['LoginScreen.js', 'src/screens/auth/LoginScreen.js'],
      ['AdminLoginScreen.js', 'src/screens/admin/AdminLoginScreen.js'],
      ['ParentPortalScreen.js', 'src/screens/auth/ParentPortalScreen.js'],
      ['ParentLoginScreen.js', 'src/screens/auth/ParentLoginScreen.js'],
      ['ParentPinScreen.js', 'src/screens/auth/ParentPinScreen.js'],
      ['ParentRegisterScreen.js', 'src/screens/auth/ParentRegisterScreen.js'],
      ['SignupScreen.js', 'src/screens/auth/SignupScreen.js'],
      ['CompleteProfileScreen.js', 'src/screens/auth/CompleteProfileScreen.js'],
    ]],
    ['Admin Portal', [
      ['AdminOverview.js', 'src/screens/admin/AdminOverview.js'],
      ['AdminUsers.js', 'src/screens/admin/AdminUsers.js'],
      ['AdminClasses.js', 'src/screens/admin/AdminClasses.js'],
      ['AdminStudents.js', 'src/screens/admin/AdminStudents.js'],
      ['AdminLeaveScreen.js', 'src/screens/admin/AdminLeaveScreen.js'],
      ['AdminActivities.js', 'src/screens/admin/AdminActivities.js'],
      ['AdminReports.js', 'src/screens/admin/AdminReports.js'],
      ['AdminSalaryScreen.js', 'src/screens/admin/AdminSalaryScreen.js'],
      ['AdminFeeScreen.js', 'src/screens/admin/AdminFeeScreen.js'],
      ['AdminBuses.js', 'src/screens/admin/AdminBuses.js'],
      ['AdminAlerts.js', 'src/screens/admin/AdminAlerts.js'],
      ['AdminSettings.js', 'src/screens/admin/AdminSettings.js'],
      ['AdminProfile.js', 'src/screens/admin/AdminProfile.js'],
    ]],
    ['Teacher Portal', [
      ['TeacherDashboard.js', 'src/screens/teacher/TeacherDashboard.js'],
      ['TeacherAttendance.js', 'src/screens/teacher/TeacherAttendance.js'],
      ['TeacherMarksScreen.js', 'src/screens/teacher/TeacherMarksScreen.js'],
      ['TeacherAlertsScreen.js', 'src/screens/teacher/TeacherAlertsScreen.js'],
      ['TeacherPersonalScreen.js', 'src/screens/teacher/TeacherPersonalScreen.js'],
      ['TeacherScheduleScreen.js', 'src/screens/teacher/TeacherScheduleScreen.js'],
      ['TeacherBusMonitor.js', 'src/screens/teacher/TeacherBusMonitor.js'],
      ['TeacherProfile.js', 'src/screens/teacher/TeacherProfile.js'],
    ]],
    ['Parent Portal', [
      ['ParentDashboard.js', 'src/screens/parent/ParentDashboard.js'],
      ['LeaveScreen.js', 'src/screens/parent/LeaveScreen.js'],
      ['MarksScreen.js', 'src/screens/parent/MarksScreen.js'],
      ['AttendanceScreen.js', 'src/screens/parent/AttendanceScreen.js'],
      ['BusScreen.js', 'src/screens/parent/BusScreen.js'],
      ['FeeScreen.js', 'src/screens/parent/FeeScreen.js'],
      ['ActivitiesScreen.js', 'src/screens/parent/ActivitiesScreen.js'],
      ['NotificationsScreen.js', 'src/screens/parent/NotificationsScreen.js'],
      ['DigitalFolder.js', 'src/screens/parent/DigitalFolder.js'],
    ]],
    ['Driver Portal', [
      ['DriverDashboard.js', 'src/screens/driver/DriverDashboard.js'],
      ['DriverDuration.js', 'src/screens/driver/DriverDuration.js'],
      ['DriverLeave.js', 'src/screens/driver/DriverLeave.js'],
      ['DriverScans.js', 'src/screens/driver/DriverScans.js'],
      ['DriverStudentLocations.js', 'src/screens/driver/DriverStudentLocations.js'],
      ['DriverProximityAlerts.js', 'src/screens/driver/DriverProximityAlerts.js'],
      ['DriverProfile.js', 'src/screens/driver/DriverProfile.js'],
    ]],
    ['Cleaner Portal', [
      ['CleanerDashboard.js', 'src/screens/cleaner/CleanerDashboard.js'],
      ['CleanerScanner.js', 'src/screens/cleaner/CleanerScanner.js'],
      ['CleanerDuration.js', 'src/screens/cleaner/CleanerDuration.js'],
      ['CleanerLeave.js', 'src/screens/cleaner/CleanerLeave.js'],
      ['CleanerAlerts.js', 'src/screens/cleaner/CleanerAlerts.js'],
      ['CleanerProfile.js', 'src/screens/cleaner/CleanerProfile.js'],
    ]],
    ['Services, Config & Theme', [
      ['firebase/config.js', 'src/firebase/config.js'],
      ['services/googleSheets.js', 'src/services/googleSheets.js'],
      ['theme/colors.js', 'src/theme/colors.js'],
      ['theme/styles.js', 'src/theme/styles.js'],
      ['components/Icon.js', 'src/components/Icon.js'],
      ['components/DonutRing.js', 'src/components/DonutRing.js'],
      ['components/UnitDetail.js', 'src/components/UnitDetail.js'],
      ['components/ChangePasswordModal.js', 'src/components/ChangePasswordModal.js'],
      ['api/client.js', 'src/api/client.js'],
      ['data/admin.js', 'src/data/admin.js'],
      ['data/teacher.js', 'src/data/teacher.js'],
      ['data/marks.js', 'src/data/marks.js'],
      ['data/attendance.js', 'src/data/attendance.js'],
      ['data/driver.js', 'src/data/driver.js'],
      ['data/cleaner.js', 'src/data/cleaner.js'],
      ['data/activities.js', 'src/data/activities.js'],
    ]],
  ];

  const sourceSections = sourceGroups.map(([groupLabel, files], gi) =>
    `<div class="section">
      ${sectionTitle(`${gi + 6}. Source Code — ${groupLabel}`, '📄')}
      ${files.map(([label, fp]) => fileSection(label, fp)).join('')}
    </div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sree Pragathi High School — Codebase Report</title>
  <style>
    :root {
      --navy: #0a1628; --gold: #f5a623; --teal: #00bfa5;
      --purple: #7c3aed; --coral: #ff6b6b;
      --text: #1e293b; --muted: #64748b; --border: #e2e8f0;
      --bg: #f8fafc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); font-size: 13px; line-height: 1.6; }

    .print-btn {
      position: fixed; bottom: 24px; right: 24px;
      background: var(--gold); color: #1a1a1a;
      border: none; border-radius: 50px; padding: 14px 28px;
      font-size: 14px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25); z-index: 999;
    }
    .print-btn:hover { background: #e8950f; }
    @media print { .print-btn { display: none !important; } @page { margin: 15mm 12mm; size: A4; } }

    .cover { background: var(--navy); color: white; padding: 56px 48px; }
    .cover h1 { font-size: 34px; font-weight: 800; margin-bottom: 6px; }
    .cover h2 { font-size: 18px; font-weight: 400; color: #9bb0c9; margin-bottom: 8px; }
    .cover .gen-time { color: #9bb0c9; font-size: 12px; margin-bottom: 36px; }
    .cover-stats { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
    .stat { background: rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 22px; min-width: 120px; }
    .stat .val { font-size: 26px; font-weight: 800; color: var(--gold); }
    .stat .lbl { font-size: 11px; color: #9bb0c9; margin-top: 2px; }

    .toc { padding: 28px 48px; background: white; border-bottom: 2px solid var(--border); }
    .toc h3 { font-size: 17px; font-weight: 700; margin-bottom: 16px; color: var(--navy); }
    .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 32px; }
    .toc-item { padding: 4px 0; color: var(--muted); font-size: 12px; }
    .toc-item strong { color: var(--navy); }

    .section { padding: 28px 48px; background: white; }
    .section + .section { border-top: 2px solid var(--border); }
    .section-title { font-size: 19px; font-weight: 800; color: var(--navy); margin-bottom: 18px; display: flex; align-items: center; gap: 10px; }
    .sec-icon { font-size: 21px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: var(--navy); color: white; padding: 9px 13px; text-align: left; font-size: 11px; font-weight: 600; }
    td { padding: 8px 13px; border-bottom: 1px solid var(--border); font-size: 12px; vertical-align: top; }
    tr:hover td { background: #f8fafc; }
    .role-row td { background: #f1f5f9; font-weight: 700; color: var(--navy); padding: 10px 13px; }

    code { font-family: 'Consolas', monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 11px; color: var(--purple); }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: monospace; }
    .badge-get { background: #dcfce7; color: #166534; }
    .badge-post { background: #dbeafe; color: #1e40af; }
    .badge-delete { background: #fee2e2; color: #991b1b; }

    .analysis-card { background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; margin-bottom: 14px; }
    .analysis-card h4 { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--navy); }
    .tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin: 2px 2px 2px 0; }
    .tag-ok { background: #dcfce7; color: #166534; }
    .tag-warn { background: #fef9c3; color: #713f12; }

    .file-block { margin-bottom: 20px; }
    .file-header { background: var(--navy); color: white; padding: 9px 14px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .file-name { font-family: monospace; font-size: 11.5px; color: var(--gold); }
    .file-meta { font-size: 10px; color: #9bb0c9; }
    pre.code { background: #0d1a30; color: #e2e8f0; padding: 14px 16px; border-radius: 0 0 8px 8px; overflow-x: auto; font-family: 'Consolas', monospace; font-size: 10.5px; line-height: 1.55; white-space: pre; max-height: 500px; overflow-y: auto; }
    @media print { pre.code { max-height: none; page-break-inside: avoid; } }

    footer { text-align: center; padding: 28px; background: var(--navy); color: #9bb0c9; font-size: 11px; }
  </style>
</head>
<body>

<button class="print-btn" onclick="window.print()">🖨 Save / Print as PDF</button>

<div class="cover">
  <h1>🏫 Sree Pragathi High School</h1>
  <h2>School Management App — Full Codebase &amp; Analysis Report</h2>
  <div class="gen-time">Gopalraopet · Generated: ${escape(now)} IST</div>
  <div class="cover-stats">
    <div class="stat"><div class="val">5</div><div class="lbl">User Roles</div></div>
    <div class="stat"><div class="val">68+</div><div class="lbl">Source Files</div></div>
    <div class="stat"><div class="val">~24k</div><div class="lbl">Lines of Code</div></div>
    <div class="stat"><div class="val">15</div><div class="lbl">Firestore Collections</div></div>
    <div class="stat"><div class="val">52</div><div class="lbl">API Routes</div></div>
    <div class="stat"><div class="val">Firebase</div><div class="lbl">Database &amp; Auth</div></div>
  </div>
</div>

<div class="toc">
  <h3>📋 Table of Contents</h3>
  <div class="toc-grid">
    <div class="toc-item">1. <strong>Project Overview &amp; Architecture</strong></div>
    <div class="toc-item">2. <strong>API Routes Reference (52 routes)</strong></div>
    <div class="toc-item">3. <strong>Firestore Collections (15)</strong></div>
    <div class="toc-item">4. <strong>Screen &amp; Component Inventory</strong></div>
    <div class="toc-item">5. <strong>Code Quality Analysis</strong></div>
    <div class="toc-item">6. <strong>Source Code — Root Files</strong></div>
    <div class="toc-item">7. <strong>Source Code — Auth Screens</strong></div>
    <div class="toc-item">8. <strong>Source Code — Admin Portal</strong></div>
    <div class="toc-item">9. <strong>Source Code — Teacher Portal</strong></div>
    <div class="toc-item">10. <strong>Source Code — Parent Portal</strong></div>
    <div class="toc-item">11. <strong>Source Code — Driver Portal</strong></div>
    <div class="toc-item">12. <strong>Source Code — Cleaner Portal</strong></div>
    <div class="toc-item">13. <strong>Source Code — Services, Config &amp; Theme</strong></div>
  </div>
</div>

<div class="section">
  ${sectionTitle('1. Project Overview & Architecture', '🏗')}
  <div class="analysis-card">
    <h4>Technology Stack</h4>
    <p><strong>Frontend:</strong> React Native (Expo SDK 50) compiled to web via <code>npx expo export --platform web</code>. Output served as static files from <code>dist/</code> by Express.js.</p>
    <p style="margin-top:6px"><strong>Backend:</strong> Node.js + Express.js (<code>server.js</code>, ~4,950 lines). Single file containing all 52 API routes, Firebase SDK calls, Google Sheets sync, and static file serving.</p>
    <p style="margin-top:6px"><strong>Database:</strong> Firebase Firestore (NoSQL, 15 collections). No SQL database.</p>
    <p style="margin-top:6px"><strong>Auth:</strong> Firebase Authentication (Email/Password for staff, Phone+PIN for parents). No JWT middleware on API routes.</p>
    <p style="margin-top:6px"><strong>External Sync:</strong> Google Sheets via service account key — marks and attendance sync automatically after each save.</p>
  </div>
  <div class="analysis-card">
    <h4>User Roles &amp; Login Portals</h4>
    <table style="margin:0">
      <thead><tr><th>Role</th><th>Auth Method</th><th>Entry Screen</th></tr></thead>
      <tbody>
        <tr><td>Admin / Principal</td><td>Email + Password (Firebase Auth)</td><td>AdminLoginScreen</td></tr>
        <tr><td>Teacher</td><td>Email + Password (Firebase Auth)</td><td>LoginScreen</td></tr>
        <tr><td>Parent</td><td>Phone Number + 4-digit PIN</td><td>ParentPortalScreen → ParentLoginScreen → ParentPinScreen</td></tr>
        <tr><td>Driver</td><td>Email + Password (Firebase Auth)</td><td>LoginScreen</td></tr>
        <tr><td>Cleaner</td><td>Email + Password (Firebase Auth)</td><td>LoginScreen</td></tr>
      </tbody>
    </table>
  </div>
  <div class="analysis-card">
    <h4>Data Flow</h4>
    <p>React Native screens → REST API calls to <code>/api/*</code> → Express.js handlers → Firebase Firestore reads/writes → JSON response. Google Sheets sync runs as a side-effect after marks and attendance saves. The web bundle is pre-built and served from <code>dist/</code>.</p>
  </div>
</div>

<div class="section">
  ${sectionTitle('2. API Routes Reference', '🔌')}
  <table>
    <thead><tr><th style="width:70px">Method</th><th style="width:260px">Path</th><th>Description</th></tr></thead>
    <tbody>${apiRoutesHtml}</tbody>
  </table>
</div>

<div class="section">
  ${sectionTitle('3. Firestore Collections', '🗄')}
  <table>
    <thead><tr><th style="width:180px">Collection</th><th>Description &amp; Key Fields</th></tr></thead>
    <tbody>${collectionsHtml}</tbody>
  </table>
</div>

<div class="section">
  ${sectionTitle('4. Screen & Component Inventory', '📱')}
  <table>
    <thead><tr><th style="width:220px">Screen / Component</th><th>Description</th></tr></thead>
    <tbody>${screensHtml}</tbody>
  </table>
</div>

<div class="section">
  ${sectionTitle('5. Code Quality Analysis', '🔍')}
  <div class="analysis-card">
    <h4>✅ Fully Working Features</h4>
    <span class="tag tag-ok">Student leave routing to teacher</span>
    <span class="tag tag-ok">Teacher leave request approval</span>
    <span class="tag tag-ok">Teacher attendance marking</span>
    <span class="tag tag-ok">Marks entry (all subjects/exams)</span>
    <span class="tag tag-ok">Subject name normalization</span>
    <span class="tag tag-ok">Marks reports (school-wide + class + student)</span>
    <span class="tag tag-ok">Admin user onboarding (all roles)</span>
    <span class="tag tag-ok">Driver trip start/end/QR scan</span>
    <span class="tag tag-ok">Parent multi-child support</span>
    <span class="tag tag-ok">Admin salary management</span>
    <span class="tag tag-ok">CSV bulk import (students + marks)</span>
    <span class="tag tag-ok">Sree Pragathi splash branding</span>
    <span class="tag tag-ok">Google Sheets sync (marks/attendance)</span>
    <span class="tag tag-ok">Firebase Auth (all 5 roles)</span>
    <span class="tag tag-ok">Class creation/deletion</span>
    <span class="tag tag-ok">IST timezone for trip timestamps</span>
  </div>
  <div class="analysis-card">
    <h4>⚠️ Known Incomplete / Hardcoded Features</h4>
    <span class="tag tag-warn">DriverLeave — local state only, no Firestore save</span>
    <span class="tag tag-warn">CleanerLeave — local state only, no Firestore save</span>
    <span class="tag tag-warn">TeacherBusMonitor — fully hardcoded mock data</span>
    <span class="tag tag-warn">CleanerScanner — hardcoded QR flow</span>
    <span class="tag tag-warn">CleanerDuration — static display</span>
    <span class="tag tag-warn">CompleteProfileScreen — imported but unreachable in nav</span>
    <span class="tag tag-warn">AdminStudents — imported but unrouted in nav</span>
    <span class="tag tag-warn">No JWT middleware on any API route</span>
    <span class="tag tag-warn">Hardcoded schoolId 'school_001' in several places</span>
    <span class="tag tag-warn">Firebase API key hardcoded as fallback in config.js</span>
  </div>
  <div class="analysis-card">
    <h4>📌 Important Notes for Developers</h4>
    <ul style="padding-left:18px;line-height:2.2">
      <li>After any frontend change, run <code>npx expo export --platform web --output-dir dist</code> then restart the server</li>
      <li>Student leaves → <code>leaveRequests</code> collection (camelCase). Staff leaves → <code>leave_requests</code> (underscore). Both are queried in admin views.</li>
      <li>Subject names are normalized by <code>normalizeSubjectName()</code> in server.js — covers math/maths/Mathematics etc.</li>
      <li>Trip timestamps use IST: <code>new Date(Date.now() + 330 * 60000)</code></li>
      <li>The Firestore rules file (<code>firestore.rules</code>) exists but must be deployed via Firebase CLI</li>
    </ul>
  </div>
</div>

${sourceSections}

<footer>
  Sree Pragathi High School · Gopalraopet · School Management App &nbsp;|&nbsp; Report generated ${escape(now)} IST
</footer>

</body>
</html>`;
}

module.exports = { generateReport };

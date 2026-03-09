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
    ['POST', '/api/register', 'Register new staff user with Firebase Auth'],
    ['POST', '/api/login', 'Login for teacher, driver, cleaner — returns session token and user profile'],
    ['POST', '/api/complete-profile', 'Complete user profile after registration'],
    ['GET', '/api/available-classes', 'List classes available for assignment'],
    ['POST', '/api/check-timetable-conflict', 'Check for timetable conflicts before saving'],
    ['POST', '/api/set-class-teacher', 'Assign a teacher as class teacher'],
    ['GET', '/api/class-teacher', 'Get class teacher for a specific class'],
    ['POST', '/api/fee-reminder', 'Send fee reminder notification to parent'],
    ['GET', '/api/fee-reminders', 'Get all fee reminders'],
    ['POST', '/api/fee-reminder/acknowledge', 'Acknowledge a fee reminder'],
    ['GET', '/api/classes', 'List all classes with student count'],
    ['POST', '/api/classes/add', 'Add a new class to the school'],
    ['DELETE', '/api/classes/:id', 'Delete a class by ID'],
    ['POST', '/api/classes/delete', 'Alternative class deletion endpoint'],
    ['POST', '/api/students', 'Add a new student with schoolId, busId, routeId, qrCode fields'],
    ['GET', '/api/students/:classId', 'Get all students in a specific class'],
    ['DELETE', '/api/students/:id', 'Delete a student record'],
    ['POST', '/api/students/bulk-upload/:classId', 'CSV bulk import students with schoolId/busId/routeId/qrCode'],
    ['POST', '/api/assign-classes', 'Assign classes to a teacher'],
    ['GET', '/api/teacher-classes', 'Get classes assigned to a teacher'],
    ['GET', '/api/teacher/profile', 'Fetch teacher profile, subject, assignedClasses, timetable'],
    ['GET', '/api/teacher/permissions', 'Fetch allowed subjects and class map for marks entry'],
    ['POST', '/api/save-timetable', 'Save teacher timetable'],
    ['GET', '/api/teacher-notifications', 'Get teacher notification feed'],
    ['POST', '/api/teacher-notifications/mark-read', 'Mark teacher notifications as read'],
    ['GET', '/api/teacher-timetable', 'Fetch teacher timetable'],
    ['GET', '/api/teacher-calendar', 'Fetch teacher personal event calendar'],
    ['POST', '/api/marks/save', 'Save marks for a subject + exam type (verifyAuth, normalizes subjects)'],
    ['GET', '/api/marks/submitted-exams', 'Get list of submitted exam types'],
    ['POST', '/api/marks/edit', 'Edit previously saved marks'],
    ['GET', '/api/marks/view', 'View marks filtered by examType and classId'],
    ['GET', '/api/marks/summary', 'School-wide subject averages from student_marks collection'],
    ['GET', '/api/marks/class/:classId', 'Full marks breakdown for a class: per-student, per-subject, per-exam'],
    ['GET', '/api/marks/student/:studentId', 'All marks for a specific student grouped by exam and subject'],
    ['GET', '/api/onboarded-users', 'List all users onboarded by the principal'],
    ['POST', '/api/onboard-teacher', 'Onboard a new teacher with Firebase Auth'],
    ['POST', '/api/add-logistics-staff', 'Onboard driver or cleaner with Firebase Auth'],
    ['GET', '/api/logistics-staff', 'List all logistics staff (drivers/cleaners)'],
    ['POST', '/api/delete-user', 'Delete a staff user'],
    ['POST', '/api/attendance/save', 'Save daily attendance for a class'],
    ['GET', '/api/attendance/submission-status', 'Check if attendance submitted for a date'],
    ['POST', '/api/attendance/edit', 'Edit attendance records'],
    ['GET', '/api/admin/notifications', 'Get admin notification feed'],
    ['POST', '/api/admin/notifications/mark-read', 'Mark admin notifications as read'],
    ['GET', '/api/attendance/records', 'Get attendance records for a class and date range'],
    ['GET', '/api/attendance/class-stats', 'Get attendance statistics for a class'],
    ['POST', '/api/leave-request/submit', 'Submit staff leave request (verifyAuth)'],
    ['GET', '/api/leave-requests/mine', 'Get own leave requests'],
    ['GET', '/api/leave-requests', 'Get all leave requests (admin view)'],
    ['POST', '/api/leave-request/update-status', 'Approve or reject a leave request'],
    ['POST', '/api/leave-request/student/submit', 'Submit student leave request — routes to teacher (verifyAuth)'],
    ['GET', '/api/leave-requests/students', 'Get student leave requests for teacher'],
    ['GET', '/api/leave-requests/student-class', 'Get student leaves by class'],
    ['POST', '/api/leave-requests/backfill-teacher', 'Backfill teacher assignment on old leave requests'],
    ['POST', '/api/forgot-password', 'Send password reset email'],
    ['POST', '/api/change-password', 'Change user password'],
    ['POST', '/api/admin/update-profile', 'Update admin profile'],
    ['POST', '/api/admin/upload-photo', 'Upload admin profile photo'],
    ['POST', '/api/bus/start-trip', 'Driver starts a new trip (morning/evening auto-detected by IST)'],
    ['POST', '/api/bus/update-location', 'Update bus GPS location during trip'],
    ['POST', '/api/bus/end-trip', 'Driver ends the active trip'],
    ['GET', '/api/trip/onboard-count', 'Get onboard student count for active trip (verifyAuth)'],
    ['GET', '/api/admin/buses', 'List all buses with route info (verifyAuth)'],
    ['POST', '/api/admin/buses/add', 'Create a new bus with route/driver/cleaner (verifyAdmin)'],
    ['POST', '/api/admin/buses/assign-students', 'Assign students to a bus, updates both docs (verifyAdmin)'],
    ['GET', '/api/bus/onboard-students', 'Get onboarded students for a bus trip (verifyAuth)'],
    ['GET', '/api/trip/scans', 'Get QR scan events for a trip (verifyAuth)'],
    ['POST', '/api/trip/scan', 'Strict QR scan: format/school/student/active/wrong-bus validation (verifyAuth)'],
    ['GET', '/api/student/qr/:studentId', 'Get or generate QR code for a student (verifyAuth)'],
    ['GET', '/api/school-info', 'Get school information'],
    ['POST', '/api/school-info', 'Update school information (verifyAdmin)'],
    ['POST', '/api/school-info/upload-image', 'Upload school image (verifyAdmin)'],
    ['GET', '/api/bus/live-location', 'Get live bus location for parent tracking'],
    ['GET', '/api/bus/active-trips', 'Get all active bus trips'],
    ['GET', '/api/bus/route-students', 'Get students on a bus route with stop info'],
    ['POST', '/api/bus/set-stop', 'Set student bus stop location'],
    ['POST', '/api/bus/lock-stop', 'Lock a student bus stop (prevent changes)'],
    ['POST', '/api/bus/request-location-change', 'Parent requests bus stop location change'],
    ['GET', '/api/bus/location-change-requests', 'Get pending location change requests'],
    ['POST', '/api/bus/approve-location-change', 'Approve a bus stop location change'],
    ['POST', '/api/bus/reject-location-change', 'Reject a bus stop location change'],
    ['GET', '/api/bus/pending-requests', 'Get pending bus-related requests'],
    ['GET', '/api/bus/all-stops', 'Get all bus stops'],
    ['POST', '/api/duty/clock-in', 'Staff clock-in for duty'],
    ['POST', '/api/duty/clock-out', 'Staff clock-out from duty'],
    ['POST', '/api/duty/update-status', 'Update duty status'],
    ['GET', '/api/duty/status', 'Get current duty status'],
    ['GET', '/api/duty/week-log', 'Get weekly duty log'],
    ['GET', '/api/duty/all-staff', 'Admin: get all staff duty records'],
    ['POST', '/api/duty/auto-clockout', 'Auto clock-out all staff at 7 PM'],
    ['POST', '/api/student-files/upload', 'Upload student digital folder file'],
    ['GET', '/api/student-files', 'Get student digital folder files'],
    ['GET', '/api/student/bus-tracking', 'Parent: real-time bus tracking for child'],
    ['GET', '/api/parent/check-student', 'Check if student exists for parent registration'],
    ['POST', '/api/parent/register', 'Register new parent with Firebase Auth'],
    ['POST', '/api/parent/email-login', 'Parent email login'],
    ['POST', '/api/parent/forgot-password', 'Parent password reset'],
    ['POST', '/api/parent/verify-pin', 'Verify parent PIN'],
    ['POST', '/api/parent/set-pin', 'Set parent login PIN'],
    ['POST', '/api/parent/remove-pin', 'Remove parent PIN'],
    ['POST', '/api/parent/add-child', 'Link additional child to parent account'],
    ['POST', '/api/parent/switch-child', 'Switch active child in parent session'],
    ['GET', '/api/admin/parent-accounts', 'Admin: list all parent accounts'],
    ['POST', '/api/admin/parent-accounts/:uid/status', 'Admin: enable/disable parent account'],
    ['GET', '/api/attendance/student-monthly', 'Get monthly attendance for a student'],
    ['GET', '/api/parent-notifications', 'Get parent notification feed'],
    ['POST', '/api/parent-notifications/read', 'Mark parent notifications as read'],
    ['GET', '/api/events', 'List school calendar events'],
    ['POST', '/api/events/create', 'Create a calendar event'],
    ['PUT', '/api/events/:id', 'Update a calendar event'],
    ['DELETE', '/api/events/:id', 'Delete a calendar event'],
    ['POST', '/api/events/:id/renotify', 'Re-send event notification'],
    ['GET', '/api/report', 'Generate and download this full codebase report as HTML'],
    ['GET', '/api/payroll/my-salary', 'Get own salary details and leave balance'],
    ['GET', '/api/payroll/my-payslip', 'Get monthly payslip with attendance breakdown'],
    ['GET', '/api/payroll/my-year', 'Get yearly salary summary'],
    ['GET', '/api/payroll/payslip-html', 'Generate printable payslip HTML'],
    ['POST', '/api/payroll/mark-credited', 'Mark salary as credited for a month'],
    ['GET', '/api/leave-balance', 'Get leave balance for a staff member'],
    ['GET', '/api/payroll/employees', 'Admin: list all employees for payroll'],
    ['GET', '/api/payroll/attendance', 'Admin: get payroll attendance data'],
    ['POST', '/api/payroll/salary', 'Admin: save/update salary settings'],
    ['POST', '/api/payroll/attendance/override', 'Admin: override attendance record'],
    ['POST', '/api/payroll/toggle', 'Admin: toggle payroll active/inactive'],
    ['GET', '/api/admin/sync-status', 'Admin: get Google Sheets sync status'],
    ['GET', '/api/bus/proximity-alerts-today', 'Get today proximity alerts for driver'],
    ['GET', '/api/bus/today-summary', 'Get today bus trip summary'],
    ['GET', '/api/bus/trip-duration-week', 'Get weekly trip duration stats'],
    ['GET', '/api/bus/driver-notifications', 'Get driver notification feed'],
    ['POST', '/api/bus/driver-notifications/read', 'Mark driver notifications as read'],
    ['GET', '/api/admin/bus-alerts', 'Admin: get all bus-related alerts'],
  ];

  const collections = [
    ['users', 'All staff users. Fields: role_id, role (teacher/driver/cleaner), email, full_name, subject, classTeacherOf, assignedClasses, timetable[], salary, onboarded_by'],
    ['admins', 'Admin/principal accounts. Fields: email, role, full_name, schoolId'],
    ['onboarded_users', 'Users onboarded by principal. Fields: role_id, role, email, full_name, subject, assignedClasses, onboarded_by, createdAt'],
    ['logistics_staff', 'Driver and cleaner staff records. Fields: role_id, role, full_name, email, bus_number, route'],
    ['students', 'Student records. Fields: studentId, name, classId, rollNumber, parentPhone, schoolId, busId, routeId, status (active), qrCode (SREE_PRAGATHI|schoolId|studentId)'],
    ['classes', 'Class definitions. Fields: name (e.g. "4-A"), schoolId, createdAt'],
    ['student_marks', 'Marks per student. Fields: studentId, studentName, classId, subject (normalized), examType, marksObtained, maxMarks, recordedBy, timestamp'],
    ['marks_edit_logs', 'Audit log for marks edits. Fields: studentId, classId, subject, examType, oldMarks, newMarks, editedBy, timestamp'],
    ['student_attendance', 'Daily student attendance. Fields: studentId, classId, date, status (present/absent/late), markedBy'],
    ['attendance_records', 'Attendance records per class/date. Fields: classId, date, records[], submittedBy'],
    ['attendance_submissions', 'Tracks which classes have submitted attendance. Fields: classId, date, submittedBy, timestamp'],
    ['attendance_edits', 'Audit log for attendance edits. Fields: classId, date, studentId, oldStatus, newStatus, editedBy'],
    ['attendance_overrides', 'Admin attendance overrides for staff. Fields: roleId, month, date, status, overriddenBy'],
    ['leaveRequests', 'Student leave requests (camelCase). Fields: studentId, studentName, studentClass, assignedTeacherId, reason, startDate, endDate, status, requestedAt'],
    ['leave_requests', 'Staff leave requests (underscore). Fields: roleId, name, role, reason, from, to, status, days'],
    ['buses', 'Bus records. Fields: busId, busNumber, route, routeId, driverId, driverName, cleanerId, cleanerName, schoolId, studentIds[], status'],
    ['bus_trips', 'Bus trip records. Fields: driverId, busId, tripType (morning/evening), status (active/completed), startTime, endTime, schoolId'],
    ['trip_scans', 'QR scan events. Fields: tripId, studentId, studentName, className, busId, scannedBy, timestamp, type, isWrongBus, assignedBusId'],
    ['scan_rejection_logs', 'Rejected scan attempts. Fields: scannedData, driverId, busId, studentId, reason, timestamp'],
    ['tripLogs', 'Trip log entries. Fields: tripId, driverId, action, timestamp'],
    ['trip_summaries', 'Daily trip summary aggregates. Fields: date, busId, totalScans, tripCount'],
    ['live_bus_locations', 'Real-time bus GPS locations. Fields: busId, driverId, lat, lng, heading, speed, updatedAt'],
    ['student_stops', 'Student bus stop locations. Fields: studentId, lat, lng, address, locked'],
    ['proximity_alert_logs', 'Geofence proximity alerts. Fields: driverId, busId, studentId, distance, timestamp'],
    ['location_change_requests', 'Parent bus stop change requests. Fields: studentId, parentId, newLat, newLng, status, requestedAt'],
    ['salary_settings', 'Staff salary configuration. Fields: basicSalary, hra, ta, da, pf, tax, lopRate, specialAllowance'],
    ['salary_payments', 'Monthly salary payment records. Fields: roleId, month, status, paidAt'],
    ['staff_duty', 'Staff clock-in/out records. Fields: roleId, dateKey, clockIn, clockOut, hoursWorked, status'],
    ['fee_reminders', 'Fee reminder notifications. Fields: studentId, parentPhone, message, acknowledged, sentAt'],
    ['events', 'School calendar events. Fields: title, date, description, category, schoolId'],
    ['admin_notifications', 'Admin notification feed. Fields: type (wrong_bus_boarding, repeated_invalid_scans, etc.), message, priority, read, timestamp'],
    ['parent_notifications', 'Parent notification feed. Fields: parentPhone, type, message, studentId, read, timestamp'],
    ['teacher_notifications', 'Teacher notification feed. Fields: teacherId, type, message, read, timestamp'],
    ['teacher_calendar', 'Teacher personal calendar events. Fields: teacherId, title, date, type'],
    ['driver_notifications', 'Driver notification feed. Fields: driverId, type, message, read, timestamp'],
    ['parent_accounts', 'Parent auth accounts. Fields: uid, phone, email, pin, childStudentIds, status'],
    ['student_files', 'Digital folder files for students. Fields: studentId, fileName, fileUrl, uploadedBy, uploadedAt'],
    ['sync_errors', 'Google Sheets sync error logs. Fields: type, error, timestamp'],
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
      ['TeacherBusMonitor', 'Bus monitoring screen — connected to live Firestore trip data via /api/bus/active-trips'],
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
      ['DriverLeave', 'Personal leave application — persisted to Firestore leave_requests collection via /api/leave-request/submit'],
      ['DriverScans', 'List of QR scan events from current and past trips'],
      ['DriverStudentLocations', 'Map view of student pickup/dropoff locations'],
      ['DriverProximityAlerts', 'Geofence alerts when driver approaches a student stop'],
      ['DriverProfile', 'Driver profile and salary summary'],
    ]],
    ['Cleaner', [
      ['CleanerDashboard', 'Check-in/check-out buttons, daily task list, work status'],
      ['CleanerScanner', 'QR scanner for student boarding — sends qrData to /api/trip/scan with strict validation, shows scan result banners'],
      ['CleanerDuration', 'Daily work duration display (currently static)'],
      ['CleanerLeave', 'Personal leave application — persisted to Firestore leave_requests collection via /api/leave-request/submit'],
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
    <div class="stat"><div class="val">~6.2k</div><div class="lbl">Server Lines</div></div>
    <div class="stat"><div class="val">${collections.length}</div><div class="lbl">Firestore Collections</div></div>
    <div class="stat"><div class="val">${apiRoutes.length}</div><div class="lbl">API Routes</div></div>
    <div class="stat"><div class="val">Firebase</div><div class="lbl">Database &amp; Auth</div></div>
  </div>
</div>

<div class="toc">
  <h3>📋 Table of Contents</h3>
  <div class="toc-grid">
    <div class="toc-item">1. <strong>Project Overview &amp; Architecture</strong></div>
    <div class="toc-item">2. <strong>API Routes Reference (${apiRoutes.length} routes)</strong></div>
    <div class="toc-item">3. <strong>Firestore Collections (${collections.length})</strong></div>
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
    <p style="margin-top:6px"><strong>Backend:</strong> Node.js + Express.js (<code>server.js</code>, ~6,200 lines). Single file containing all ${apiRoutes.length} API routes, Firebase SDK calls, Google Sheets sync, and static file serving.</p>
    <p style="margin-top:6px"><strong>Database:</strong> Firebase Firestore (NoSQL, ${collections.length} collections). No SQL database.</p>
    <p style="margin-top:6px"><strong>Auth:</strong> Firebase Authentication (Email/Password for staff, Phone+PIN for parents). verifyAuth middleware on protected routes, verifyAdmin for admin-only routes. Firestore security rules deployed.</p>
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
    <span class="tag tag-ok">DriverLeave — Firestore persistence via /api/leave-request/submit</span>
    <span class="tag tag-ok">CleanerLeave — Firestore persistence via /api/leave-request/submit</span>
    <span class="tag tag-ok">TeacherBusMonitor — live Firestore data via /api/bus/active-trips</span>
    <span class="tag tag-ok">CleanerScanner — strict QR validation, wrong-bus alerts, result banners</span>
    <span class="tag tag-ok">verifyAuth middleware (role_id presence check) on protected routes</span>
    <span class="tag tag-ok">verifyAdmin middleware on admin-only routes</span>
    <span class="tag tag-ok">schoolId consistency (SCHOOL_ID constant, student/bus docs)</span>
    <span class="tag tag-ok">Firestore security rules deployed</span>
    <span class="tag tag-ok">Bus management (add buses, assign students)</span>
    <span class="tag tag-ok">Strict QR scan validation (format/school/student/active/wrong-bus)</span>
    <span class="tag tag-ok">Scan rejection logging and invalid scan threshold alerts</span>
    <span class="tag tag-ok">Staff duty clock-in/clock-out with auto-clockout at 7 PM</span>
    <span class="tag tag-ok">Payroll system (salary settings, payslips, yearly summary)</span>
    <span class="tag tag-ok">Student digital folder (file upload/download)</span>
    <span class="tag tag-ok">Bus stop management and location change requests</span>
    <span class="tag tag-ok">Parent bus tracking with live location</span>
    <span class="tag tag-ok">Event management (CRUD + re-notify)</span>
    <span class="tag tag-ok">Fee reminders with acknowledgment</span>
  </div>
  <div class="analysis-card">
    <h4>⚠️ Known Incomplete / Hardcoded Features</h4>
    <span class="tag tag-warn">CleanerDuration — static display</span>
    <span class="tag tag-warn">CompleteProfileScreen — imported but unreachable in nav</span>
    <span class="tag tag-warn">AdminStudents — imported but unrouted in nav</span>
    <span class="tag tag-warn">QR scanning still simulated (no real camera) in CleanerScanner</span>
    <span class="tag tag-warn">Firebase API key hardcoded as fallback in config.js</span>
    <span class="tag tag-warn">In-memory scan dedup (recentScans) resets on server restart</span>
  </div>
  <div class="analysis-card">
    <h4>📌 Important Notes for Developers</h4>
    <ul style="padding-left:18px;line-height:2.2">
      <li>After any frontend change, run <code>npx expo export --platform web --output-dir dist</code> then restart the server</li>
      <li>Student leaves → <code>leaveRequests</code> collection (camelCase). Staff leaves → <code>leave_requests</code> (underscore). Both are queried in admin views.</li>
      <li>Subject names are normalized by <code>normalizeSubjectName()</code> in server.js — covers math/maths/Mathematics etc.</li>
      <li>Trip timestamps use IST: <code>new Date(Date.now() + 330 * 60000)</code></li>
      <li>Firestore security rules are deployed and enforced. The rules file is at <code>firestore.rules</code></li>
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

# Venkeys International School App

## Overview
A pure React Native (Expo) application for Venkeys International School with Parent, Teacher, Admin (Principal), Driver, and Cleaner portals. Built with Expo web output, served by a Node.js/Express backend with Firebase Firestore. Parent auth uses email+password login with Student ID validated at registration. A unified Create Account form (Teacher/Parent/Driver tabs) serves as the Parent Portal landing screen.

## Tech Stack
- **Frontend**: React Native (Expo SDK 52), expo-linear-gradient, react-native-svg, react-native-web
- **Backend**: Express.js on port 5000, Firebase Firestore (project: school-app-87900)
- **Google Sheets**: google-spreadsheet + google-auth-library, auto-sync attendance & marks
- **Build**: `npx expo export --platform web --output-dir dist` → static files served by Express

## Project Structure
```
App.js                         — Main entry: state-based nav, bottom tabs, screen router
server.js                      — Express API server (register/login + static serving)
app.json                       — Expo configuration
babel.config.js                — Babel preset for Expo
package.json                   — Dependencies and scripts
src/
  theme/
    colors.js                  — Design tokens (C object)
    styles.js                  — Shared StyleSheet (S object), INR formatter, FEE_STATUS_COLOR
  components/
    Icon.js                    — SVG icon component (react-native-svg)
    DonutRing.js               — Circular progress ring (SVG)
    UnitDetail.js              — Unit detail sub-screen for marks
    ChangePasswordModal.js     — Reusable password change modal (Firebase Auth)
  data/
    attendance.js              — Attendance calendar data
    marks.js                   — Student marks, CLASS_STUDENTS
    teacher.js                 — Teacher schedule, salary, leave data, INITIAL_LEAVE_REQS
    admin.js                   — Admin employees, salary modes
    driver.js                  — Driver profile, scans, duration, leave data
  api/
    client.js                  — API client (registerUser, loginUser)
  screens/
    auth/
      SplashScreen.js          — Landing with role selection (Parent/Teacher-Staff/Explore/Contact)
      LoginScreen.js           — Shared login (role auto-detected from Firestore on login)
      SignupScreen.js           — Registration with Teacher/Parent/Driver toggle
    parent/
      ParentDashboard.js       — Parent home with child overview
      AttendanceScreen.js      — Monthly attendance calendar
      MarksScreen.js           — Academic marks with unit tabs
      BusScreen.js             — Bus tracking
      NotificationsScreen.js   — Notification feed
      FeeScreen.js             — Fee summary and payments
      LeaveScreen.js           — Leave application
      DigitalFolder.js         — Student documents shared by teachers (files from Firebase Storage)
      ActivitiesScreen.js      — School activities
    teacher/
      TeacherDashboard.js      — Teacher home with schedule
      TeacherAttendance.js     — Student attendance marking
      TeacherMarksScreen.js    — Marks entry
      TeacherScheduleScreen.js — Full year schedule
      TeacherBusMonitor.js     — Bus monitoring
      TeacherAlertsScreen.js   — Leave request management
      TeacherPersonalScreen.js — Personal leave & salary
      TeacherProfile.js        — Teacher profile with change password & logout
    admin/
      AdminLoginScreen.js      — Admin passcode entry
      AdminOverview.js         — Admin dashboard
      AdminUsers.js            — User management
      AdminClasses.js          — Class management with drill-down
      AdminBuses.js            — Bus fleet management
      AdminReports.js          — Reports & analytics (large)
      AdminAlerts.js           — Alert management
      AdminActivities.js       — Activity management
      AdminSettings.js         — School settings
      AdminLeaveScreen.js      — Staff leave management
      AdminFeeScreen.js        — Fee management
      AdminSalaryScreen.js     — Payroll management
      AdminProfile.js          — Principal profile with photo upload, editable fields, change password
    driver/
      DriverDashboard.js       — Driver home: GPS toggle, summary, scans, crew
      DriverStudentLocations.js — Student home location mapping: save GPS, update requests, green/gray status icons
      DriverScans.js           — Student board/alight scan timeline
      DriverDuration.js        — Trip duration charts and weekly overview
      DriverProfile.js         — Driver profile, bus info, assigned cleaner
      DriverLeave.js           — Leave balance, apply modal, leave history
    cleaner/
      CleanerDashboard.js      — Cleaner home: GPS toggle, scan summary, absent alerts, crew
      CleanerScanner.js        — QR scanner simulation with 4-phase scan tracking
      CleanerDuration.js       — Trip duration charts and weekly overview
      CleanerAlerts.js         — Absence alerts and general notifications
      CleanerProfile.js        — Cleaner profile, bus info, assigned driver
      CleanerLeave.js          — Leave balance, apply modal, leave history
    auth/
      CompleteProfileScreen.js — Mandatory profile setup (full name, mobile, blood group, emergency contact)
    ExploreScreen.js           — School info and gallery
    ContactScreen.js           — Contact form
```

## Design Tokens
- Navy: `#0B1F3A`, NavyMid: `#122848`, NavyLt: `#1A3A60`
- Gold: `#E8A21A`, Teal: `#00B8A9`, Coral: `#FF6B6B`, Purple: `#7C5CBF`
- Card: `#162E50`, Border: `#213D62`, Muted: `#8A9DBB`

## Database
- Firebase Firestore `users` collection (fields: full_name, email, role, role_id, uid, created_at)
- Roles: 'teacher', 'parent', 'principal', 'staff', 'student', 'driver', 'cleaner'
- Firebase project: school-app-87900
- Master admin (principal): thatipamulavenkatesh1999@gmail.com — auto-promoted on login

## Database Collections
- `users` — User profiles (full_name, email, role, role_id, uid, created_at, join_date, profileCompleted, mobile, blood_group, emergency_contact, date_of_birth, profile_completed_at)
- `attendance_records` — Daily attendance (doc ID: `{studentId}_{date}`, fields: studentId, studentName, classId, schoolId, date, month, status, markedBy, timestamp)
- `student_marks` — Student marks (doc ID: `{studentId}_{examType}_{subject}`, fields: studentId, studentName, classId, subject, examType, marksObtained, maxMarks, recordedBy, timestamp)
- `marks_edit_logs` — Audit trail for marks edits (fields: studentId, studentName, classId, className, subject, examType, oldMarks, newMarks, maxMarks, editedByTeacher, editReason, timestamp)
- `student_files` — Uploaded student documents (studentId, studentName, className, fileName, fileUrl, fileType, fileSize, uploadedBy, uploaderRole, uploadedAt)
- `parent_notifications` — Parent notifications for file uploads (studentId, studentName, message, fileUrl, fileName, read, createdAt)
- `bus_trips` — Active/completed bus trips (driverId, driverName, busNumber, route, tripType, status, startTime, endTime, lat, lng)
- `live_bus_locations` — Real-time bus GPS positions (tripId, driverId, busNumber, route, lat, lng, speed, status, updatedAt)
- `student_stops` — Student pickup GPS coordinates (studentId, studentName, className, route, lat, lng, setBy, locked, updatedAt)
- `staff_duty` — Staff on-duty records (doc ID: `duty_{roleId}_{YYYY-MM-DD}`, fields: userId, name, role, roleId, onDuty, clockIn, clockOut, hoursWorked, currentStatus, date, dateKey)
- `location_change_requests` — Location change requests submitted by drivers (studentId, studentName, className, route, oldLat, oldLng, newLat, newLng, requestedBy, requestedByRoleId, status [pending/approved/rejected], createdAt, approvedAt, rejectedAt, reason)

## API Endpoints
- `POST /api/register` — Create user account (Firebase Auth + Firestore)
- `POST /api/login` — Authenticate user (Firebase Auth)
- `POST /api/onboard-teacher` — Principal onboards teacher/staff: auto-generates unique Teacher ID (TCH-YYYY-XXXX), saves to Firestore, syncs to Google Sheets "User_Directory" tab
- `GET /api/onboarded-users` — Returns all principal-onboarded users with live status (pending_registration / onboarded)
- `POST /api/register` — Registration hook: if roleId matches TCH-YYYY-XXXX pattern, updates existing Firestore doc to "onboarded" and syncs status+email to Google Sheets User_Directory
- `POST /api/attendance/save` — Save daily attendance using writeBatch (overwrites if same student+date), syncs to Google Sheet "Attendance" tab
- `POST /api/marks/save` — Save student marks using writeBatch (overwrites if same student+exam+subject), syncs to Google Sheet "Marks" tab
- `POST /api/marks/edit` — Edit locked marks with reason: body { studentId, studentName, classId, className, subject, examType, newMarks, maxMarks, reason, editedBy }. Writes to `student_marks`, `marks_edit_logs`, and `admin_notifications` (type: marks_edited, priority: high)
- `GET /api/marks/view?examType=unit1&classId=class-8a` — View saved marks filtered by exam type (queries both normalized and legacy exam type formats)
- `POST /api/assign-classes` — Admin assigns classes to teacher: saves `assignedClasses` array to Firestore user doc, syncs to Google Sheets User_Directory "Classes" column
- `GET /api/teacher-classes?roleId=TCH-XXXX` — Fetch assigned classes for a teacher by role ID
- `POST /api/complete-profile` — Mandatory profile setup: saves full_name, mobile, blood_group, emergency_contact to Firestore with profileCompleted=true, syncs to Google Sheets (User_Directory or Logistics_Staff)
- `POST /api/forgot-password` — Forgot password: checks email exists in Firestore (users + logistics_staff), sends Firebase password reset email, returns success/error
- `POST /api/change-password` — Change password: re-authenticates with current password via Firebase Auth, updates to new password, returns success/error
- `POST /api/admin/update-profile` — Update admin mobile/blood group, sync to Google Sheets User_Directory
- `POST /api/admin/upload-photo` — Upload admin profile photo to Firebase Storage, save URL in Firestore, sync to Google Sheets
- `POST /api/student-files/upload` — Upload student file (multipart: file + studentId, studentName, className, uploaderName, uploaderRole). Saves to Firebase Storage, Firestore `student_files`, creates `parent_notifications`, syncs to Google Sheets `Student_Files` tab
- `GET /api/student-files?studentId=X` — List uploaded files for a student, ordered by uploadedAt desc
- `GET /api/parent-notifications?studentId=X` — Get unread notifications for a student
- `POST /api/parent-notifications/read` — Mark notifications as read (body: { notificationIds: [...] })
- `POST /api/fee-reminder` — Send fee reminder to parent: body { studentId, studentName, className, amount, dueDate, message, senderName, senderRole }. Creates `fee_reminders` doc + `parent_notifications` entry
- `GET /api/fee-reminders?studentId=X` — Get fee reminders for a student, ordered by createdAt desc
- `POST /api/fee-reminder/acknowledge` — Parent acknowledges fee reminder: body { reminderId }. Updates `parentAcknowledged=true`, creates admin notification
- `POST /api/bus/start-trip` — Start a bus trip: creates bus_trips + live_bus_locations docs, notifies parents and admin
- `POST /api/bus/update-location` — Update live GPS position for active bus (busNumber, lat, lng, speed). Also runs proximity check: if bus is within 500m of any student stop on the route, sends a `proximity_alert` notification to the parent (once per student per trip day)
- `POST /api/bus/end-trip` — End a trip: marks complete, clears live location, notifies parents, syncs to Google Sheets Bus_Logistics_History
- `GET /api/bus/live-location?busNumber=X` — Get active bus position
- `GET /api/bus/active-trips` — List all active bus trips
- `GET /api/bus/route-students?route=X` — Get saved student stops for a route
- `POST /api/bus/set-stop` — Save student pickup GPS coordinates (studentId, lat, lng). Syncs to Google Sheets Students tab (Home_Latitude, Home_Longitude). Blocked if stop is locked.
- `POST /api/bus/lock-stop` — Admin locks/unlocks a student stop (studentId, locked). Locked stops cannot be changed by drivers.
- `GET /api/bus/all-stops` — Get all captured student stops for admin map view
- `POST /api/bus/request-location-change` — Driver requests location change for a student stop. Creates pending request in `location_change_requests` collection with old/new coordinates. Requires admin approval before updating.
- `GET /api/bus/location-change-requests` — Get all pending location change requests for admin review
- `POST /api/bus/approve-location-change` — Admin approves location change: updates `student_stops` in Firestore + syncs new coordinates to Google Sheets Students tab
- `POST /api/bus/reject-location-change` — Admin rejects location change request with optional reason
- `GET /api/bus/pending-requests?route=X` — Get pending location change requests, optionally filtered by route
- `POST /api/assign-classes` — Admin assigns teaching classes to a teacher. Body: { roleId, classes: ['8-A','9-B',...] }. Updates `assignedClasses` array in Firestore user doc + syncs to Google Sheets.
- `GET /api/teacher/permissions?roleId=X` — Get teacher's allowed subjects, classes, and subject-to-class mapping (derived from timetable + primary subject + assignedClasses). Used by marks screen for permission filtering. Principals bypass all checks.
- `POST /api/duty/clock-in` — Staff clock-in: body { userId, name, role, roleId }. Creates `staff_duty` doc with deterministic ID `duty_{roleId}_{YYYY-MM-DD}`
- `POST /api/duty/clock-out` — Staff clock-out: body { userId, name, role, roleId }. Records clock_out time, calculates hours_worked, syncs to Google Sheets Daily_Attendance
- `POST /api/duty/update-status` — Update staff status: body { roleId, currentStatus }. Updates currentStatus field on today's duty record
- `GET /api/duty/status?roleId=X` — Get today's duty record for a staff member (onDuty, clockIn, clockOut, currentStatus)
- `GET /api/duty/all-staff` — Get all today's duty records for admin Live Staff Board
- `POST /api/duty/auto-clockout` — Auto clock-out all on-duty staff at 19:00 (also runs automatically via scheduled timer at 7 PM daily)
- `GET /api/payroll/employees?month=YYYY-MM` — All staff employees (teachers + drivers + cleaners; parents/students filtered) with salary settings + monthly attendance summary per employee
- `GET /api/payroll/attendance?roleId=X&month=YYYY-MM` — Day-by-day attendance breakdown for one employee (checks staff_duty records + attendance_overrides)
- `POST /api/payroll/salary` — Save/update salary settings per employee (body: roleId, basicSalary, hra, ta, da, pf, tax, lopRate). Saves to `salary_settings` collection.
- `POST /api/payroll/attendance/override` — Admin override for one day's attendance (body: roleId, date, status, reason, overriddenBy). Saves to `attendance_overrides` collection.
- `POST /api/payroll/toggle` — Admin toggles clock-in/out for any employee for today (action: 'in' | 'out'). Accumulates multi-session hours in `staff_duty` doc.

## Payroll System Collections
- `salary_settings` — Per-employee salary config (doc ID = roleId, fields: basicSalary, hra, ta, da, pf, tax, lopRate, updatedAt)
- `attendance_overrides` — Admin attendance overrides (doc ID = `{roleId}_{date}`, fields: roleId, date, month, status, reason, overriddenBy, overriddenAt)

## Payroll Calculation Rules
- Working days = Mon–Sat for the month (Sundays excluded)
- Full Day (hoursWorked >= 7) = full daily rate credited
- Half Day (3.5–6.9h) = 0.5 daily rate credited
- Short Day (0.1–3.4h) = 0.5 daily rate credited
- Absent (no record / 0h) = LOP deduction applied (absent days × lopRate)
- Net = Gross − PF − Tax − LOP deductions
- Attendance % = (fullDays + halfDays×0.5 + shortDays×0.5) / workingDays × 100

## Google Sheets Integration
- **Spreadsheet ID**: 1vDxamKXSMEJhgAUafzCwAMxBQh1ySxWVVPNAFBqAQ6o
- **Service account**: replit-sheet-sync@school-app-test-488806.iam.gserviceaccount.com
- **Sync module**: `src/services/googleSheets.js` — syncAttendance(), syncMarks(), syncUserDirectory(), updateUserDirectoryOnRegistration(), updateUserDirectoryClasses(), syncStudentFile(), syncBusTripHistory(), syncStudentStop(), syncStaffAttendance()
- **Credentials**: Secret `GoogleKey` (service account JSON) + env var `GOOGLE_SPREADSHEET_ID`
- **Auth**: JWT service account (google-auth-library). Doc cache reset on error via `resetDocCache()`
- **safeSync(operation, fn, payload)**: Wrapper in server.js — on failure logs to `sync_errors` Firestore collection. Retry scheduler runs every 5 minutes via `setInterval(retrySyncErrors, 300000)`.
- **Admin sync status**: `GET /api/admin/sync-status` → returns `{ synced, pending, recentErrors }`. AdminOverview dashboard shows green "✅ Google Sheets synced" or amber "⚠️ Sync pending — X records waiting" banner, refreshed every 60s.
- **Sheet tabs and sync triggers:**
  - **Students**: [studentId, name, rollNumber, class, section, parentName, parentPhone, createdAt] — synced on `/api/students` POST and `/api/students/bulk-upload` per row
  - **Teachers**: [teacherId, name, email, phone, subject, classTeacherOf, designation, joiningDate, createdAt] — synced on `/api/onboard-teacher`
  - **Attendance**: [Date, Student ID, Student Name, Class, Status, Teacher ID] — synced on attendance submit/re-edit
  - **Marks**: [Student ID, Student Name, Class, Subject, Exam Type, Marks, Max Marks, Teacher ID] — synced on marks entry
  - **LeaveRequests**: [leaveId, type, applicantId, applicantName, class, leaveType, fromDate, toDate, reason, status, actionedBy, actionedAt, submittedAt] — synced on submit + approve/reject for both staff and student leaves
  - **ParentAccounts**: [parentId, parentName, email, phone, linkedStudentId, studentName, studentClass, registeredAt, accountStatus] — synced on `/api/parent/register`
  - **Payroll**: [employeeId, employeeName, month, year, basicSalary, hra, da, ta, specialAllowance, grossSalary, pf, tax, lopDays, lopDeduction, totalDeductions, netPayable, daysPresent, daysAbsent, halfDays, totalActiveHours, creditStatus, creditedAt] — synced on salary save and mark-credited
  - **Notifications**: [notifId, type, recipientId, recipientRole, title, message, channel, sentAt] — logged on salary credited
  - **User_Directory**: [Teacher ID, Full Name, Role, Subject, Email, Phone, Status, Onboarded Date] — keyed by Teacher ID
  - **Student_Files**, **Bus_Logistics_History**, **Daily_Attendance**, **Logistics_Staff**, **Master_Timetable** — existing legacy sheets still synced

## Student Leave System
- **Firestore collection**: `leave_requests` — `type: 'staff'` for staff, `type: 'student'` for students
- **Student leave fields**: `type, studentId, studentName, rollNumber, studentClass, schoolId, parentId, parentName, reasonId, reasonLabel, icon, customReason, dates[], from, to, days, status, approvedBy, approvedByRole, approvedAt, rejectReason, submittedAt`
- **Teacher view** (`TeacherAlertsScreen.js`): Fetches via `/api/leave-requests/student-class?teacherRoleId=X` → shows only students from teacher's `classTeacherOf` class. Non-class-teachers see a "Not Assigned" message.
- **Admin view** (`AdminLeaveScreen.js`): Fetches via `/api/leave-requests/students` → shows ALL student leaves across all classes. Students tab shows student name, roll no, class, parent name, reason, dates, status.
- **Approval/Rejection**: Both teacher and admin use `/api/leave-request/update-status` with `actorRole` field. Record stores `approvedBy` + `approvedByRole` so UI can display "by Mrs. Kavitha (Class Teacher)".
- **Attendance auto-mark**: When student leave is Approved → `attendance_records` collection gets `status: 'Leave'` entries for each date (distinct from 'Absent'). Batch write via Firestore.
- **Parent notification**: On Approved/Rejected → `parent_notifications` collection gets a notification with full message including actor name and role.
- **API endpoints**: `POST /api/leave-request/student/submit`, `GET /api/leave-requests/students`, `GET /api/leave-requests/student-class?teacherRoleId=X`, `POST /api/leave-request/update-status` (handles both staff and student types)

## Running
- Workflow: `node server.js` on port 5000 (webview output)
- Build: `npx expo export --platform web --output-dir dist` (pre-built dist included)
- Deployment: autoscale target, builds with expo export before running server
- Environment: Node.js 20, Firebase secrets configured

## Navigation & Security
State-based routing in App.js with useState. Bottom tab navigation for logged-in screens.
- Parent tabs: Home, Marks, Activities, Bus, Alerts
- Teacher tabs: Dashboard, Attendance, Marks, Alerts, My Leave, Profile
- Driver tabs: Home, Scans, Locations, Trips, Profile, Leave (teal active color)
- Cleaner tabs: Home, Scanner, Trips, Alerts, Profile, Leave (gold active color)
- Admin tabs: Overview, Users, Leaves, Fees, Payroll
- Admin Dashboard hidden from splash screen — only accessible via principal role login
- Protected routes: admin screens check role === 'principal', driver screens check role === 'driver', cleaner screens check role === 'cleaner', others get "Access Denied" page
- Login auto-redirect: principal → admin, driver → driver dashboard, cleaner → cleaner dashboard, teacher/staff → teacher dashboard, parent/student → parent dashboard
- Driver/Cleaner login: No separate login button — drivers/cleaners use "Teacher / Staff Login" and are auto-redirected based on Firestore role
- Mandatory Profile Setup: On login/signup, if profileCompleted !== true, user is redirected to /complete-profile screen. Must fill full name, mobile, blood group, emergency contact. Saves to Firestore + Google Sheets. Shows "Profile Verified" then redirects to dashboard.
- Cleaner ID format: CLN-XXXX (auto-generated via /api/add-logistics-staff, auto-sets role to 'cleaner' on login/register)
- Driver data sync: On login, server fetches bus_number, route, assigned_area from Firestore `logistics_staff` collection and includes in user response
- Driver ID format: DRV-XXXX (auto-generated via /api/add-logistics-staff, auto-sets role to 'driver' on login/register)

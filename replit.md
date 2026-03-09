# Venkeys International School App — Setup Complete

## Project Overview
A comprehensive school management system with React Native (Expo) frontend serving multiple portals: Parent, Teacher, Admin (Principal), Driver, and Cleaner. Built with Node.js/Express backend and Firebase Firestore real-time database.

## Technology Stack
- **Frontend**: React Native (Expo SDK 52) with web output, Metro bundler
- **Backend**: Express.js API server (Node.js)
- **Database**: Firebase Firestore (project: school-app-87900)
- **Authentication**: Firebase Auth (Email/Password)
- **Google Sheets**: Auto-sync for attendance, marks, payroll, and master timetable
- **Error Tracking**: Automatic error reporting to Firestore "alerts" collection

## Directory Structure
```
App.js                         — Main app entry with routing, navigation, error boundary
server.js                      — Express server (port 5000) with API endpoints
src/
  api/
    client.js                  — API client with auto error reporting
  services/
    errorReporter.js           — Error tracking & reporting to Firestore
    googleSheets.js            — Google Sheets sync integration
  components/
    ErrorBoundary.js           — React error boundary (catches render crashes)
    Icon.js, DonutRing.js, UnitDetail.js, ChangePasswordModal.js
  hooks/
    useGlobalErrorListener.js   — Global error & promise rejection listener
  theme/
    colors.js                  — Design tokens (C object)
    styles.js                  — Shared styles (S object)
  data/
    teacher.js, admin.js, parent.js, driver.js, cleaner.js, marks.js, attendance.js
  screens/
    auth/                      — SplashScreen, LoginScreen, SignupScreen, etc.
    parent/                    — Parent portal screens (Dashboard, Attendance, Marks, Bus, etc.)
    teacher/                   — Teacher portal screens (Dashboard, Attendance, Marks, etc.)
    admin/                      — Admin dashboard screens (Users, Classes, Buses, Reports, etc.)
    driver/                    — Driver portal screens (Home, Scans, Locations, Trips, etc.)
    cleaner/                   — Cleaner portal screens (Home, Scanner, Alerts, etc.)
    ExploreScreen.js, ContactScreen.js
config.js                      — Firebase configuration (ENV vars with fallbacks)
app.json                       — Expo configuration
package.json                   — Dependencies
dist/                          — Built Expo web app (static files)
```

## Error Tracking System

### Overview
Automatic error tracking that reports to Firestore "alerts" collection when any user experiences a crash, API error, or unhandled exception.

### Features
1. **React Error Boundary** — Catches render crashes, displays friendly error screen
2. **Global Error Listener** — Catches unhandled JS errors and promise rejections
3. **API Error Reporting** — Auto-reports HTTP 4xx/5xx errors and network failures
4. **User Attribution** — All errors include userId, userRole, and user profile
5. **Severity Levels** — low, medium, high, critical
6. **Error Types** — js_crash, api_error, firestore_error, auth_error, unhandled_promise

### Firestore "alerts" Collection Schema
```javascript
{
  type: "js_crash" | "api_error" | "firestore_error" | "auth_error" | "unhandled_promise",
  severity: "low" | "medium" | "high" | "critical",
  message: string,           // Human-readable error description
  screen: string,            // Page/endpoint where error occurred
  userId: string,            // Logged-in user's ID (or "anonymous")
  userRole: string,          // User's role (parent, teacher, driver, etc.)
  details: string,           // Stack trace or error details
  timestamp: Firestore.serverTimestamp(),
  read: false,               // Super Admin marks as read
  source: "auto" | "error_boundary" | "global_error_listener",
  appVersion: "2.0.0"
}
```

### Error Reporting Functions
- `reportError(payload)` — General-purpose error reporting
- `reportApiError(endpoint, statusCode, message)` — API-specific errors
- `reportFirestoreError(operation, message)` — Firestore operation errors
- `reportAuthError(operation, message)` — Authentication errors
- `reportUnhandledPromiseRejection(reason)` — Promise rejection errors
- `setErrorReporterUser(user)` — Set current user for error attribution
- `clearErrorReporterUser()` — Clear user on logout

### Integration Points
1. **App.js** — Wrapped with `<ErrorBoundary>`, calls `useGlobalErrorListener()`, manages user context
2. **src/api/client.js** — All API calls wrapped with automatic error reporting
3. **Error screens** — Friendly error UI with "Try Again" and "Go Home" buttons
4. **Admin dashboard** — Super Admin can view all alerts in AdminAlerts screen

## Running the App

### Development
- **Start Server**: `node server.js` (runs on port 5000)
- **Build Frontend**: `npx expo export --platform web --output-dir dist`
- **Workflow**: "Start application" (webview on port 5000)

### Environment Variables (Already Set)
```
FIREBASE_API_KEY=AIzaSyA-daJ4E8CEVh89BGEU9wRLGOZAT7T3-vM
FIREBASE_AUTH_DOMAIN=school-app-87900.firebaseapp.com
FIREBASE_PROJECT_ID=school-app-87900
FIREBASE_STORAGE_BUCKET=school-app-87900.firebasestorage.app
FIREBASE_APP_ID=1:774655999002:android:6ccc7fd89c5c57598565a3
```

### Deployment
- **Target**: autoscale
- **Build**: `npx expo export --platform web --output-dir dist`
- **Run**: `node server.js`

## Authentication & Role-Based Access
- **Parent**: Email + Password login (Student ID validated on registration)
- **Teacher/Staff**: Email + Password login (email+password or pre-generated ID)
- **Driver**: Email + Password login (auto-detected from Firestore role)
- **Cleaner**: Email + Password login (auto-detected from Firestore role)
- **Admin/Principal**: Email + Password login (auto-promoted if email = principal email)

## Data Models
- **users**: uid, full_name, email, role, role_id, profileCompleted, created_at, etc.
- **parent_accounts**: Parent-specific data (studentIds, activeStudentId, pinHash, etc.)
- **leave_requests**: Student and staff leave applications with approvals
- **attendance_records**: Daily attendance marked by teachers
- **marks**: Student academic marks by subject and unit
- **logistics_staff**: Driver and cleaner data (bus_number, route, assigned_area)
- **alerts**: Error tracking and admin alerts

## School Info & Gallery System
- **Firestore document**: `settings/school_001` stores all school info fields
- **Fields**: name, tagline, phone, email, address, board, website, principalName, foundedYear, description, studentCount, staffCount, yearsCount, galleryImages[]
- **Gallery images**: Uploaded via `POST /api/school-info/upload-image`, saved to `uploads/gallery/`, served as static files
- **Image validation**: Server-side MIME check (JPEG/PNG/GIF/WebP only), 500KB max size
- **AdminSettings**: Full CRUD for all school fields + gallery image upload/remove
- **ExploreScreen**: Fetches from `/api/school-info`, shows name, tagline, stats, description, principal, board, and gallery images (falls back to emoji placeholders)
- **ContactScreen**: Fetches from `/api/school-info`, shows phone, email, address, website (if set)

## Admin Bus Management
- **API**: `GET /api/admin/buses` (protected by `verifyAuth`) — returns all buses from Firestore `buses` collection
- **API**: `GET /api/bus/onboard-students` (protected by `verifyAuth`) — returns today's scanned students per bus, grouped by latest scan status (Onboard/Arrived)
- **Screen**: `AdminBuses.js` — fetches real bus data from API, shows bus list with route/driver/student count, "View Onboard" button opens modal showing per-student scan status and timestamps
- **Navigation**: `admin-buses` route in App.js, button in AdminOverview

## Driver Real-Time Onboard Count
- **API**: `GET /api/trip/scans` (protected by `verifyAuth`) — returns today's scans filtered by `driverId`/`busNumber`
- **Polling**: DriverDashboard polls every 5 seconds when trip is active
- **Data flow**: Cleaner scans QR → `POST /api/trip/scan` → saves to `trip_scans` → driver dashboard polls `GET /api/trip/scans` → updates `boardedCount` and `recentScans`
- **All three driver screens** (Dashboard, ProximityAlerts, StudentLocations) now use real Firestore data via `/api/bus/route-students` instead of hardcoded `ADMIN_DATA`/`ADMIN_CLASS_STUDENTS`

## Strict QR Scan Validation (`POST /api/trip/scan`)
- **QR Format**: `SREE_PRAGATHI|{schoolId}|{studentId}` — validated on scan
- **Validation Rules**:
  1. School match — QR schoolId must match `SCHOOL_ID`
  2. Student exists — looked up from `students` collection (not `users`)
  3. Active status — rejects inactive students
  4. Wrong bus detection — allows boarding but sends admin + parent notifications
  5. Duplicate prevention — 5-minute cooldown per student per day (in-memory)
- **Rejection logging**: All rejected scans logged to `scan_rejection_logs` collection
- **Invalid scan threshold**: 3+ rejected scans in 10 minutes triggers admin security alert
- **Backward compatible**: Accepts legacy `studentId` field if `qrData` not provided

## Bus Management Routes
- `POST /api/admin/buses/add` (verifyAdmin) — creates bus document with setDoc
- `POST /api/admin/buses/assign-students` (verifyAdmin) — assigns students to bus, updates both bus and student docs
- `GET /api/student/qr/:studentId` (verifyAuth) — returns/generates QR code for student

## Student Document Structure (`students` collection)
```javascript
{
  studentId: "STU1741555123456",
  name: "Ravi Kumar",
  rollNumber: 12,
  classId: "class_6A",
  className: "Class 6-A",
  parentPhone: "9876543210",
  schoolId: "school_001",          // links to school
  busId: "TN-07-1234",            // assigned bus
  routeId: "Route 7",             // assigned route
  status: "active",               // active/inactive
  qrCode: "SREE_PRAGATHI|school_001|STU1741555123456",  // QR format
  createdAt: serverTimestamp()
}
```
- QR code format: `SREE_PRAGATHI|{schoolId}|{studentId}`
- Both individual add (`POST /api/students`) and CSV bulk import write identical fields
- CSV import recognizes bus/route columns: `busid`, `bus id`, `bus number`, `routeid`, `route id`, `bus route`, etc.

## Notes
- All API calls use relative `/api` path (proxied by Express)
- Profile completion is mandatory on first login
- Super Admin gets real-time error notifications via Firestore
- Bus tracking uses Leaflet maps on web
- Leave system supports student and staff requests with approval workflow
- `const SCHOOL_ID = 'school_001'` at top of server.js is the single source of truth for school identity

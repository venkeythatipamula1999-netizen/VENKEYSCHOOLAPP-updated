# SaaS Migration — Master Audit Report

**Project**: Venkeys International School App (Sree Pragathi High School)
**Date**: March 10, 2026
**School Code**: SP-GOPA (Sree Pragathi, Gopalraopet)
**Server**: server.js (6,636 lines)
**Status**: All 6 steps completed

---

## Step 1: Replace Hardcoded School ID
**Commit**: `1bcd2c4`

| Item | Status |
|------|--------|
| Replaced all hardcoded `SCHOOL_ID = 'school_001'` with `DEFAULT_SCHOOL_ID` constant | Done |
| `DEFAULT_SCHOOL_ID = 'school_001'` defined at line 48 | Done |
| All routes use `(req.schoolId \|\| DEFAULT_SCHOOL_ID)` pattern | Done |
| QR format updated to `SREE_PRAGATHI\|{schoolId}\|{studentId}` | Done |

---

## Step 2: School Code Generator + Super Admin Verification
**Commits**: `550cf88`, `1bcd2c4`

| Item | Status |
|------|--------|
| `generateSchoolCode(schoolName, location)` function (line 152) | Done |
| Format: first 2 chars of school name + first 4 chars of location, uppercase (e.g., SP-GOPA) | Done |
| `verifySuperAdmin` middleware (line 89) — validates `x-super-admin-key` header | Done |
| Firebase Admin SDK initialized with `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | Done |
| `adminDb` (firebase-admin Firestore) for super admin routes — bypasses security rules | Done |

---

## Step 3: Super Admin Routes
**Commits**: `c81b347`, `4e2edfa`

| Item | Status |
|------|--------|
| `POST /api/super/schools/create` — creates school + principal account | Done |
| `GET /api/super/schools` — list all schools | Done |
| `GET /api/super/schools/:schoolId` — school details | Done |
| `POST /api/super/schools/:schoolId/status` — enable/suspend school | Done |
| `POST /api/super/schools/:schoolId/subscription` — update plan | Done |
| `GET /api/super/stats` — overview stats | Done |
| All routes use `adminDb` (firebase-admin) | Done |
| All routes protected by `verifySuperAdmin` middleware | Done |
| `checkSchoolActive` middleware created (line 123) — blocks suspended schools | Done |

---

## Step 4: schoolId on Every Query and Write
**Commit**: `adde2de`

### Queries Updated (schoolId filter added) — 67 `where('schoolId', ...)` clauses

| Collection | Routes/Areas | Queries |
|-----------|-------------|---------|
| classes | available-classes, classes list, add, delete | 6 |
| students | students/:classId, bulk-upload, bus route fallback | 4 |
| users | timetable conflict, class-teacher, leave assignment, event notifications, payroll | 10 |
| student_marks | view, summary, class marks | 5 |
| attendance_records | records, class-stats, edit recount | 4 |
| leave_requests / leaveRequests | staff leave list, teacher queries (4 parallel), backfill | 8 |
| events | list events | 1 |
| buses | admin buses list | 1 |
| admin_notifications | admin notifications | 1 |
| parent_notifications | parent forAll notifications | 1 |
| payroll (users, salary_settings, attendance_overrides, staff_duty) | payroll employees | 5 |
| parent_accounts | parent accounts list | 1 |
| student_stops | student stops | 1 |
| logistics_staff | logistics staff list | 1 |
| bus-alerts (proximity_alert_logs, location_change_requests, trip_summaries) | bus alerts | 3 |

### Writes Updated (schoolId field added) — 195 total schoolId references

| Write Type | Areas |
|-----------|-------|
| `addDoc` — classes | Class creation |
| `setDoc` / `batch.set` — student_marks | Individual marks, bulk marks import |
| `addDoc` — leave_requests | Staff leave creation |
| `addDoc` — events | Event creation |
| `setDoc` — bus_trips | Trip start/end |
| `setDoc` — live_bus_locations | Location updates |
| `setDoc` — trip_summaries | Trip summary |
| `addDoc` — proximity_alert_logs | Proximity alerts |
| `addDoc` — attendance_edits | Attendance edit logs |
| `addDoc` — fee_reminders | Fee reminders |
| `addDoc` — student_files | Student file uploads |
| `addDoc` — salary_payments | Salary payments |
| `addDoc` — location_change_requests | Location change requests |
| `addDoc` — users (register) | User registration |
| `addDoc` — users (teacher onboarding) | Teacher pre-registration |
| `addDoc` — parent_accounts (register) | Parent account creation |
| `addDoc` — parent_accounts (parent auth) | Parent auth registration |
| `addDoc` — logistics_staff | Driver/cleaner onboarding |
| 28 notification `addDoc` calls | admin_notifications, parent_notifications, teacher_notifications, driver_notifications |

### `sendEventNotifications()` Updated
- Accepts `schoolId` as 10th parameter
- Filters all internal user/student queries by schoolId
- All 4 callers updated to pass `(req.schoolId || DEFAULT_SCHOOL_ID)`

### Intentionally NOT Changed
| Collection | Reason |
|-----------|--------|
| sync_errors | System-level, not tenant-scoped |
| scan_rejection_logs | System-level, not tenant-scoped |
| alerts | System-level error tracking |
| Queries by uid/email/role_id | Inherently user-scoped (unique identifiers) |
| verifyAuth / verifyAdmin | Must look up across all schools |

---

## Step 5: Rate Limiting + Security Hardening
**Commits**: `40ed974`, `d6b29f9`

### Rate Limiters (5 defined, 24 applied)

| Limiter | Window | Max | Applied To |
|---------|--------|-----|-----------|
| `loginLimiter` | 15 min | 10/IP | `/api/login`, `/api/parent/email-login`, `/api/parent/verify-pin`, `/api/forgot-password`, `/api/parent/forgot-password` |
| `registerLimiter` | 60 min | 5/IP | `/api/register`, `/api/parent/register` |
| `scanLimiter` | 1 min | 60/IP | `/api/trip/scan` |
| `superAdminLimiter` | 1 min | 50/IP | All 10 `/api/super/*` routes |
| `apiLimiter` | 1 min | 300/IP | Global on all `/api/` routes |

### Security Headers
| Header | Value |
|--------|-------|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |
| X-Powered-By | Removed |

### CORS Restriction
| Allowed Origin | Purpose |
|---------------|---------|
| `https://super-admin-with-error-tracking-8b9.vercel.app` | Vidhaya Layam Super Admin dashboard |
| `http://localhost:3000` | Local development |
| `http://localhost:5000` | Local server |
| `http://localhost:19006` | Expo dev server |
| `process.env.APP_URL` | Replit dev domain |
| No-origin requests | Mobile apps, Postman |

### Additional Security
| Feature | Detail |
|---------|--------|
| Request size limit | 10mb for JSON and URL-encoded bodies |
| Global error handler | Catches unhandled errors, 403 for CORS violations, 500 for others |
| Credential headers | `credentials: true` enabled |
| Allowed methods | GET, POST, PUT, DELETE, OPTIONS |
| Allowed headers | Content-Type, Authorization, x-role-id, x-super-admin-key |

---

## Step 6: Super Admin Dashboard API Integration
**Commit**: `a00ed41`

### New Routes Added (4)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super/schools/:schoolId/activity` | Recent activity log (students, staff, trips, scans) |
| GET | `/api/super/schools/:schoolId/summary` | Full school stats with role breakdown |
| DELETE | `/api/super/schools/:schoolId` | Hard delete with confirmation (`DELETE_<schoolId>`) |
| GET | `/api/super/schools/:schoolId/security-logs` | QR scan rejection logs |

### Routes Removed (1)

| Method | Path | Reason |
|--------|------|--------|
| POST | `/api/super/migrate/wipe-school-001` | Migration complete, security risk |

### API Documentation
- `SUPER_ADMIN_API.md` created — full reference for all 10 super admin endpoints
- Super admin key placeholder used (not hardcoded) for security

### Complete Super Admin Route Inventory (10 routes)

| # | Method | Path | Middleware |
|---|--------|------|-----------|
| 1 | POST | /api/super/schools/create | superAdminLimiter, verifySuperAdmin |
| 2 | GET | /api/super/schools | superAdminLimiter, verifySuperAdmin |
| 3 | GET | /api/super/schools/:schoolId | superAdminLimiter, verifySuperAdmin |
| 4 | POST | /api/super/schools/:schoolId/status | superAdminLimiter, verifySuperAdmin |
| 5 | POST | /api/super/schools/:schoolId/subscription | superAdminLimiter, verifySuperAdmin |
| 6 | GET | /api/super/stats | superAdminLimiter, verifySuperAdmin |
| 7 | GET | /api/super/schools/:schoolId/activity | superAdminLimiter, verifySuperAdmin |
| 8 | GET | /api/super/schools/:schoolId/summary | superAdminLimiter, verifySuperAdmin |
| 9 | DELETE | /api/super/schools/:schoolId | superAdminLimiter, verifySuperAdmin |
| 10 | GET | /api/super/schools/:schoolId/security-logs | superAdminLimiter, verifySuperAdmin |

---

## Live Test Results (March 10, 2026)

### Stats Endpoint
```json
{
  "success": true,
  "stats": {
    "totalSchools": 1,
    "activeSchools": 1,
    "suspendedSchools": 0,
    "totalStudents": 243,
    "totalStaff": 12
  }
}
```

### School Summary (SP-GOPA)
```json
{
  "stats": {
    "totalStudents": 243,
    "totalStaff": 12,
    "totalClasses": 8,
    "totalTrips": 6,
    "totalScans": 0,
    "pendingLeaves": 0,
    "byRole": {
      "teachers": 8,
      "drivers": 1,
      "cleaners": 2,
      "principal": 1
    }
  }
}
```

### Auth Rejection (Wrong Key)
```json
{"error": "Invalid super admin key"}
```

---

## Pending / Future Work

| Item | Priority | Notes |
|------|----------|-------|
| JWT middleware to set `req.schoolId` from token | High | Currently using `DEFAULT_SCHOOL_ID` fallback |
| `checkSchoolActive` middleware wired to routes | Medium | Middleware exists but not applied to tenant routes |
| Firestore composite indexes for schoolId + orderBy queries | Medium | May be needed for activity/security-logs routes |
| Super admin key rotation to environment variable | High | Currently hardcoded in `verifySuperAdmin` |
| Frontend multi-tenant login (school selector) | Low | Backend ready, frontend still single-school |

---

## Files Modified

| File | Changes |
|------|---------|
| server.js | All 6 migration steps (6,636 lines) |
| SUPER_ADMIN_API.md | New — API documentation for Vidhaya Layam dashboard |
| replit.md | Updated with SaaS architecture, rate limiting, CORS docs |
| package.json | Added `express-rate-limit` dependency |

---

## Commit History

| Commit | Description |
|--------|-------------|
| `1bcd2c4` | Step 1: Replace hardcoded SCHOOL_ID, add school code generator |
| `550cf88` | Step 2: Add super admin verification and firebase-admin |
| `c81b347` | Step 3: Add super admin routes |
| `4e2edfa` | Step 3b: Use Admin SDK for super admin routes |
| `adde2de` | Step 4: Add schoolId to all queries and writes |
| `40ed974` | Step 5a: Add rate limiting and security headers |
| `d6b29f9` | Step 5b: CORS restriction, request size limits, global error handler |
| `a00ed41` | Step 6: New super admin endpoints, API docs, remove wipe route |

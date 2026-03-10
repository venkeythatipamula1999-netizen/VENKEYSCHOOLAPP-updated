# SaaS Migration — Master Audit Report

**Project**: Vidhaya Layam — Sree Pragathi High School
**Date**: March 10, 2026
**School Code**: SP-GOPA (Sree Pragathi, Gopalraopet)
**Server**: server.js (6,650+ lines)
**Status**: All 6 steps + 3 security fixes complete

---

## Step 1: Replace Hardcoded School ID ✅
- `DEFAULT_SCHOOL_ID = 'school_001'` defined as fallback only
- All routes use `(req.schoolId || DEFAULT_SCHOOL_ID)` pattern
- QR format: `SREE_PRAGATHI|{schoolId}|{studentId}`

---

## Step 2: School Code Generator + Super Admin Verification ✅
- `generateSchoolCode(schoolName, location)` — e.g. SP-GOPA
- `verifySuperAdmin` middleware reads `process.env.SUPER_ADMIN_KEY`
- Firebase Admin SDK initialized (`adminAuth` + `adminDb`)
- All super admin routes use `adminDb` — bypasses Firestore security rules

---

## Step 3: Super Admin Routes ✅ (10 routes)
- POST /api/super/schools/create
- GET  /api/super/schools
- GET  /api/super/schools/:schoolId
- POST /api/super/schools/:schoolId/status
- POST /api/super/schools/:schoolId/subscription
- GET  /api/super/stats
- GET  /api/super/schools/:schoolId/activity
- GET  /api/super/schools/:schoolId/summary
- DELETE /api/super/schools/:schoolId
- GET  /api/super/schools/:schoolId/security-logs

All protected by `superAdminLimiter` + `verifySuperAdmin`.

---

## Step 4: schoolId on Every Query and Write ✅
- 67 where('schoolId') query filters added
- 195 total schoolId references across all writes
- Collections covered: classes, students, users, student_marks,
  attendance_records, leave_requests, leaveRequests, events, buses,
  admin_notifications, parent_notifications, payroll, parent_accounts,
  student_stops, logistics_staff, bus-alerts

---

## Step 5: Rate Limiting + Security Hardening ✅
- 5 rate limiters, 24 applications
- Security headers: nosniff, DENY, XSS, Referrer-Policy, X-Powered-By removed
- CORS restricted to Vercel super admin + localhost dev + APP_URL env

---

## Step 6: Super Admin Dashboard API Integration ✅
- 4 new routes added (activity, summary, delete, security-logs)
- Wipe migration route removed
- SUPER_ADMIN_API.md created

---

## Post-Migration Security Fixes ✅

### Fix 1 — JWT Authentication Fully Wired
- All 3 login routes issue JWT tokens (signToken called on every login)
- verifyAuth accepts Bearer token only — no fallback
- Frontend stores token in AsyncStorage after login
- apiFetch sends Authorization: Bearer <token> on every request
- JWT_SECRET enforced — server crashes if env var missing

### Fix 2 — Global Auth Guard
- Applied at line 292 via app.use()
- All 146 routes protected by default
- 13 public routes explicitly allowlisted:
  POST /api/login, POST /api/admin/login, POST /api/register,
  POST /api/forgot-password, POST /api/parent/register,
  POST /api/parent/email-login, POST /api/parent/forgot-password,
  POST /api/parent/verify-pin, GET /api/parent/check-student,
  GET /api/school-info, GET /api/report,
  GET /download/audit-report, GET /download/production-report
- /api/super/* handled by verifySuperAdmin separately

### Fix 3 — apiFetch Migration Complete
- 170 raw fetch() calls replaced with apiFetch across 45 files
- 7 batches: Admin(14), Teacher(7), Parent(8), Driver(7), Cleaner(4), Auth(1), Shared(3)
- x-role-id fallback fully removed from verifyAuth
- Stale src/services/client.js deleted
- Duplicate ChangePasswordModal.js cleaned up

### Fix 4 — Firestore Composite Indexes
- firestore.indexes.json created with 19 composite indexes
- Deployed via: firebase deploy --only firestore:indexes ✅

### Fix 5 — checkSchoolActive Wired Globally
- Blocks suspended schools on all routes except public allowlist
- Applied via app.use() after express.json()

---

## Live Test Results (March 10, 2026)
- GET /api/classes (no token) → 401 ✅
- GET /api/classes (x-role-id only) → 401 ✅
- GET /api/school-info → 200 ✅
- GET /api/super/stats → 1 school, 243 students, 12 staff ✅

---

## Remaining Items

| Item | Priority |
|------|----------|
| Input validation on sensitive routes | Medium |
| Remove localhost from CORS for production | Low |
| Request logging / audit trail | Medium |
| Password policy enforcement | Medium |
| Frontend multi-school login selector | Low |
| Firestore scheduled backup | Low |
| Remove /download/* routes before production | Low |

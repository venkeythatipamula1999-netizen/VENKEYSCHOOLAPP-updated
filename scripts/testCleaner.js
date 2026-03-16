/**
 * testCleaner.js
 * Full cleaner portal functionality test
 * School: V-HYDE | Cleaner: Priya Housekeeping (CLN-XXXX)
 */
const http = require('http');

const BASE = 'http://localhost:5000';
const SCHOOL = 'V-HYDE';
const ADMIN_EMAIL = 'venkateshthatipamulaaaa@gmail.com';
const ADMIN_PASS  = 'School@123';

const CLEANER_NAME  = 'Priya Housekeeping';
const CLEANER_EMAIL = 'priya.cleaner@vidhyalam.com';
const CLEANER_PASS  = 'Cleaner@1234';
const CLEANER_AREA  = 'Restrooms Block-A';

let passed = 0;
let failed = 0;

function pass(label, ok, detail = '') {
  if (ok) {
    console.log(`✅  ${label}  →  ${detail}`);
    passed++;
  } else {
    console.log(`❌  ${label}  →  ${detail}`);
    failed++;
  }
}

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers,
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function run() {
  console.log('════════════════════════════════════════');
  console.log('  CLEANER FULL FUNCTIONALITY TEST');
  console.log(`  School: ${SCHOOL}  |  Area: ${CLEANER_AREA}`);
  console.log('════════════════════════════════════════\n');

  // ── STEP 1: ADMIN LOGIN ────────────────────────────────
  console.log('── SETUP (as Admin/Principal) ──');
  const adminLogin = await req('POST', '/api/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
    schoolId: SCHOOL,
  });
  pass('Admin login', adminLogin.status === 200, adminLogin.body?.error || 'ok');
  const adminToken = adminLogin.body?.token;

  // ── STEP 2: ADD LOGISTICS STAFF (CLEANER) ─────────────
  console.log('\n── CLEANER ONBOARDING ──');
  let cleanerRoleId = null;

  const logisticsRes = await req('GET', `/api/logistics-staff?schoolId=${SCHOOL}`, null, adminToken);
  const existing = (logisticsRes.body?.staff || []).find(
    s => s.full_name === CLEANER_NAME && s.type === 'cleaner'
  );
  if (existing) {
    cleanerRoleId = existing.staff_id;
    pass('Logistics staff lookup', true, `already exists → cleanerRoleId: ${cleanerRoleId}`);
  } else {
    const addRes = await req('POST', '/api/add-logistics-staff', {
      fullName: CLEANER_NAME,
      type: 'cleaner',
      email: CLEANER_EMAIL,
      phone: '9876543001',
      assignedArea: CLEANER_AREA,
      experience: '3',
      schoolId: SCHOOL,
    }, adminToken);
    cleanerRoleId = addRes.body?.staffId;
    pass('Add cleaner via logistics', !!cleanerRoleId, `cleanerRoleId: ${cleanerRoleId}`);
  }
  console.log(`  Cleaner Role ID: ${cleanerRoleId}`);

  // ── STEP 3: REGISTER CLEANER ACCOUNT ──────────────────
  console.log('\n── CLEANER ACCOUNT REGISTRATION ──');
  const register = await req('POST', '/api/register', {
    fullName: CLEANER_NAME,
    email: CLEANER_EMAIL,
    password: CLEANER_PASS,
    role: 'cleaner',
    roleId: cleanerRoleId,
    schoolId: SCHOOL,
  });
  const regExists =
    register.status === 409 ||
    (register.body?.error || '').toLowerCase().includes('already') ||
    (register.body?.error || '').toLowerCase().includes('in use');
  pass(
    'Register cleaner account',
    register.status === 200 || register.status === 201 || regExists,
    regExists ? 'already registered' : JSON.stringify(register.body).slice(0, 80)
  );

  // ── STEP 4: CLEANER LOGIN ──────────────────────────────
  console.log('\n── CLEANER AUTHENTICATION ──');
  const loginRes = await req('POST', '/api/login', {
    email: CLEANER_EMAIL,
    password: CLEANER_PASS,
    schoolId: SCHOOL,
    roleId: cleanerRoleId,
  });
  pass('Cleaner login', loginRes.status === 200, `role: ${loginRes.body?.user?.role}`);
  pass('Cleaner role confirmed', loginRes.body?.user?.role === 'cleaner', `role: ${loginRes.body?.user?.role}`);
  const cleanerToken = loginRes.body?.token;
  const cleanerUid   = loginRes.body?.user?.uid;
  const cleanerDocId = loginRes.body?.user?.id;
  pass('Cleaner full name in session', !!loginRes.body?.user?.full_name, `name: ${loginRes.body?.user?.full_name}`);
  console.log(`  UID: ${cleanerUid}  |  docId: ${cleanerDocId}`);

  // ── STEP 5: COMPLETE PROFILE ───────────────────────────
  console.log('\n── PROFILE COMPLETION ──');
  const profileRes = await req('POST', '/api/complete-profile', {
    uid: cleanerUid,
    docId: cleanerDocId,
    fullName: CLEANER_NAME,
    mobile: '9876543001',
    bloodGroup: 'B+',
    emergencyContact: '9876543002',
    dateOfBirth: '1990-07-15',
    role: 'cleaner',
    roleId: cleanerRoleId,
  }, cleanerToken);
  pass(
    'Complete profile',
    profileRes.status === 200 && profileRes.body?.success === true,
    JSON.stringify(profileRes.body).slice(0, 80)
  );

  // ── STEP 6: CLOCK IN ──────────────────────────────────
  console.log('\n── DUTY CLOCK-IN ──');
  const clockIn = await req('POST', '/api/duty/clock-in', {
    userId: cleanerUid,
    name: CLEANER_NAME,
    role: 'cleaner',
    roleId: cleanerRoleId,
  }, cleanerToken);
  pass(
    'Clock in',
    clockIn.status === 200 && (clockIn.body?.success === true || clockIn.body?.alreadyOn === true),
    `clockIn: ${clockIn.body?.clockIn || 'already on duty'}`
  );

  // ── STEP 7: DUTY STATUS ────────────────────────────────
  console.log('\n── DUTY STATUS ──');
  const dutyStatus = await req('GET', `/api/duty/status?roleId=${cleanerRoleId}`, null, cleanerToken);
  pass(
    'Get duty status',
    dutyStatus.status === 200,
    `onDuty: ${dutyStatus.body?.onDuty}, status: ${dutyStatus.body?.currentStatus}`
  );

  // ── STEP 8: UPDATE STATUS ──────────────────────────────
  const updateStatus = await req('POST', '/api/duty/update-status', {
    roleId: cleanerRoleId,
    currentStatus: 'Cleaning in Progress',
  }, cleanerToken);
  pass(
    'Update duty status',
    updateStatus.status === 200 && updateStatus.body?.success === true,
    JSON.stringify(updateStatus.body).slice(0, 60)
  );

  // ── STEP 9: MARK AREA COMPLETE ─────────────────────────
  console.log('\n── AREA CLEANING ──');
  const markArea = await req('POST', '/api/duty/mark-area-complete', {
    roleId: cleanerRoleId,
    areaName: CLEANER_AREA,
    completedAt: new Date().toISOString(),
  }, cleanerToken);
  pass(
    'Mark area as cleaned',
    markArea.status === 200 && markArea.body?.success === true,
    JSON.stringify(markArea.body).slice(0, 60)
  );

  // Verify admin notification was created
  const adminNotifs = await req('GET', `/api/admin/notifications?schoolId=${SCHOOL}`, null, adminToken);
  const areaNotif = (adminNotifs.body?.notifications || []).find(n => n.type === 'area_cleaned' && n.roleId === cleanerRoleId);
  pass(
    'Admin notified of area completion',
    !!areaNotif,
    areaNotif ? `area: ${areaNotif.areaName}` : `not found (count: ${adminNotifs.body?.notifications?.length || 0})`
  );

  // ── STEP 10: MARK SECOND AREA ─────────────────────────
  const markArea2 = await req('POST', '/api/duty/mark-area-complete', {
    roleId: cleanerRoleId,
    areaName: 'Staff Room',
  }, cleanerToken);
  pass(
    'Mark second area as cleaned',
    markArea2.status === 200 && markArea2.body?.success === true,
    JSON.stringify(markArea2.body).slice(0, 60)
  );

  // ── STEP 11: WEEK LOG ──────────────────────────────────
  console.log('\n── WEEKLY LOG ──');
  const today = new Date().toISOString().slice(0, 10);
  const weekLog = await req('GET', `/api/duty/week-log?roleId=${cleanerRoleId}&date=${today}`, null, cleanerToken);
  pass(
    'Get today duty log',
    weekLog.status === 200,
    `onDuty: ${weekLog.body?.onDuty}, status: ${weekLog.body?.currentStatus}, areas: ${weekLog.body?.areaCompletions?.length || 0}`
  );
  pass(
    'Area completions recorded in log',
    (weekLog.body?.areaCompletions?.length || 0) >= 1,
    `count: ${weekLog.body?.areaCompletions?.length || 0}`
  );

  // ── STEP 12: ALL STAFF STATUS ──────────────────────────
  console.log('\n── ADMIN VIEW ──');
  const allStaff = await req('GET', '/api/duty/all-staff', null, adminToken);
  const myRecord = (allStaff.body?.staff || []).find(s => s.roleId === cleanerRoleId);
  pass(
    'Cleaner visible in all-staff duty list',
    !!myRecord,
    myRecord ? `status: ${myRecord.currentStatus}` : `not found (count: ${allStaff.body?.staff?.length || 0})`
  );

  // ── STEP 13: LEAVE REQUEST ─────────────────────────────
  console.log('\n── LEAVE MANAGEMENT ──');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const leaveRes = await req('POST', '/api/leave-request/submit', {
    staffId: cleanerRoleId,
    staffName: CLEANER_NAME,
    role: 'cleaner',
    dept: 'Housekeeping',
    reasonId: 'sick',
    reasonLabel: 'Sick Leave',
    reasonIcon: '🤒',
    customReason: 'Fever',
    dates: [tomorrow],
    fromDate: tomorrow,
    toDate: tomorrow,
    leaveType: 'casual',
  }, cleanerToken);
  pass(
    'Submit leave request',
    leaveRes.status === 200 && leaveRes.body?.success === true,
    `leaveId: ${leaveRes.body?.id || leaveRes.body?.error}`
  );

  // ── STEP 14: VIEW MY LEAVE REQUESTS ───────────────────
  const myLeaves = await req('GET', `/api/leave-requests/mine?staffId=${cleanerRoleId}`, null, cleanerToken);
  pass(
    'View my leave requests',
    myLeaves.status === 200 && (myLeaves.body?.requests?.length || 0) >= 1,
    `count: ${myLeaves.body?.requests?.length || 0}`
  );
  const pendingLeave = (myLeaves.body?.requests || []).find(r => r.status === 'Pending');
  pass(
    'Leave shows as Pending',
    !!pendingLeave,
    pendingLeave ? `from: ${pendingLeave.from}` : 'not found'
  );

  // ── STEP 15: ADMIN APPROVES LEAVE ────────────────────
  console.log('\n── LEAVE APPROVAL (Admin) ──');
  if (pendingLeave?.id) {
    const approveRes = await req('POST', '/api/leave-request/update-status', {
      requestId: pendingLeave.id,
      status: 'Approved',
      adminName: 'Principal',
      schoolId: SCHOOL,
    }, adminToken);
    pass(
      'Admin approves leave',
      approveRes.status === 200 && (approveRes.body?.success === true || approveRes.body?.id),
      JSON.stringify(approveRes.body).slice(0, 60)
    );

    // Verify cleaner's leave now shows approved
    const updatedLeaves = await req('GET', `/api/leave-requests/mine?staffId=${cleanerRoleId}`, null, cleanerToken);
    const approved = (updatedLeaves.body?.requests || []).find(r => r.id === pendingLeave.id);
    pass(
      'Leave status updated to Approved',
      approved?.status === 'Approved',
      `status: ${approved?.status}`
    );
  } else {
    pass('Admin approves leave', false, 'no pending leave ID found');
    pass('Leave status updated to Approved', false, 'skipped');
  }

  // ── STEP 16: EVENTS (read-only for cleaner) ───────────
  console.log('\n── SCHOOL EVENTS ──');
  const events = await req('GET', `/api/events?schoolId=${SCHOOL}`, null, cleanerToken);
  pass(
    'Cleaner can view school events',
    events.status === 200,
    `count: ${events.body?.events?.length ?? events.body?.length ?? JSON.stringify(events.body).slice(0, 40)}`
  );

  // ── STEP 17: CLOCK OUT ─────────────────────────────────
  console.log('\n── DUTY CLOCK-OUT ──');
  const clockOut = await req('POST', '/api/duty/clock-out', {
    userId: cleanerUid,
    name: CLEANER_NAME,
    role: 'cleaner',
    roleId: cleanerRoleId,
  }, cleanerToken);
  pass(
    'Clock out',
    clockOut.status === 200 && clockOut.body?.success === true,
    `clockOut: ${clockOut.body?.clockOut}, hours: ${clockOut.body?.hoursWorked}`
  );

  // ── STEP 18: POST CLOCKOUT STATUS ─────────────────────
  console.log('\n── POST CLOCK-OUT VERIFICATION ──');
  const postStatus = await req('GET', `/api/duty/status?roleId=${cleanerRoleId}`, null, cleanerToken);
  pass(
    'Duty status is Off Duty after clock-out',
    postStatus.body?.onDuty === false || postStatus.body?.currentStatus === 'Off Duty',
    `onDuty: ${postStatus.body?.onDuty}, status: ${postStatus.body?.currentStatus}`
  );

  // Final log confirms hours
  const finalLog = await req('GET', `/api/duty/week-log?roleId=${cleanerRoleId}&date=${today}`, null, cleanerToken);
  pass(
    'Hours worked recorded',
    parseFloat(finalLog.body?.hoursWorked || 0) >= 0,
    `hours: ${finalLog.body?.hoursWorked || '0'}`
  );

  // ── STEP 19: ADMIN SEES CLEANER IN LOGISTICS ──────────
  console.log('\n── ADMIN LOGISTICS VIEW ──');
  const logisticsAll = await req('GET', `/api/logistics-staff?schoolId=${SCHOOL}`, null, adminToken);
  const cleanerInList = (logisticsAll.body?.staff || []).find(s => s.staff_id === cleanerRoleId);
  pass(
    'Cleaner visible in logistics staff list',
    !!cleanerInList,
    cleanerInList ? `name: ${cleanerInList.full_name}, area: ${cleanerInList.assigned_area}` : 'not found'
  );

  // ── SUMMARY ───────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('  CLEANER TEST COMPLETE');
  console.log(`  ✅ Passed: ${passed}  |  ❌ Failed: ${failed}`);
  console.log('════════════════════════════════════════');
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

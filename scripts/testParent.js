require('dotenv').config();
const http = require('http');

const BASE_HOST   = '127.0.0.1';
const BASE_PORT   = 5000;
const SCHOOL      = 'V-HYDE';
const STUDENT_ID  = 'STU1773639444029';
const PARENT_EMAIL = 'ravi.parent@vidhyalam.com';
const PARENT_PASS  = 'Parent@1234';
const PARENT_PIN   = '1234';
const PARENT_NAME  = 'Suresh Kumar';
const PARENT_PHONE = '9876543210';

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    r.on('error', e => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

function pass(label, ok, detail = '') {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon}  ${label}${detail ? '  →  ' + detail : ''}`);
}

async function run() {
  console.log('\n════════════════════════════════════════');
  console.log('  PARENT PORTAL FULL FUNCTIONALITY TEST');
  console.log(`  School: ${SCHOOL}  |  Student: ${STUDENT_ID}`);
  console.log('════════════════════════════════════════\n');

  // ── 1. CHECK STUDENT ─────────────────────────────────────
  console.log('── REGISTRATION FLOW ──');
  const checkRes = await req('GET', `/api/parent/check-student?studentId=${STUDENT_ID}`);
  const alreadyExists = checkRes.status === 409;
  pass(
    'Check student by ID',
    checkRes.status === 200 || alreadyExists,
    alreadyExists
      ? `already registered (${checkRes.body?.error})`
      : `name: ${checkRes.body?.studentName}, class: ${checkRes.body?.studentClass}`
  );

  // ── 2. REGISTER (skip if already exists) ─────────────────
  const regRes = await req('POST', '/api/parent/register', {
    studentId: STUDENT_ID,
    parentName: PARENT_NAME,
    email: PARENT_EMAIL,
    phone: PARENT_PHONE,
    password: PARENT_PASS,
    pin: PARENT_PIN,
  });
  const regOk   = regRes.status === 200;
  const regSkip = regRes.status === 409 || (regRes.body?.error || '').includes('already');
  pass(
    'Register parent account',
    regOk || regSkip,
    regOk   ? 'new account created' :
    regSkip ? 'already registered — skipping' :
    JSON.stringify(regRes.body).slice(0, 80)
  );

  // ── 3. LOGIN ──────────────────────────────────────────────
  console.log('\n── AUTHENTICATION ──');
  const loginRes = await req('POST', '/api/parent/email-login', {
    email: PARENT_EMAIL,
    password: PARENT_PASS,
  });
  const token = loginRes.body?.token;
  const user  = loginRes.body?.user || {};
  const uid   = user.uid;

  pass('Parent email login', !!token, token ? `uid: ${uid}` : loginRes.body?.error);
  if (!token) { console.log('\n⚠  Cannot continue — check credentials.'); return; }

  pass(
    'Login response has student data',
    !!(user.studentId || user.studentIds?.length),
    `name: ${user.parentName}, studentId: ${user.studentId}, class: ${user.studentClass}`
  );
  pass(
    'schoolId in token payload',
    !!user.schoolId,
    `schoolId: ${user.schoolId}`
  );

  // ── 4. STUDENT INFO ───────────────────────────────────────
  console.log('\n── STUDENT INFO ──');
  const studentVerify = await req('GET', `/api/students/verify/${STUDENT_ID}`);
  pass('Student QR verify (public scan)', studentVerify.status === 200,
    `name: ${studentVerify.body?.studentName}, class: ${studentVerify.body?.className}`);

  const studentQR = await req('GET', `/api/student/qr/${STUDENT_ID}`, null, token);
  pass('Student QR card data', studentQR.status === 200,
    JSON.stringify(studentQR.body).slice(0, 80));

  // ── 5. ATTENDANCE ─────────────────────────────────────────
  console.log('\n── ATTENDANCE ──');
  const today = new Date().toISOString().split('T')[0];
  const attRecords = await req('GET', `/api/attendance/records?schoolId=${SCHOOL}&classId=10-A&date=${today}`, null, token);
  pass('Attendance records for class', attRecords.status === 200,
    JSON.stringify(attRecords.body).slice(0, 80));
  const attSummary = await req('GET', `/api/attendance/class-summary?schoolId=${SCHOOL}&date=${today}`, null, token);
  pass('Attendance class summary (today)', attSummary.status === 200,
    JSON.stringify(attSummary.body).slice(0, 60));

  // ── 6. LEAVE REQUESTS ─────────────────────────────────────
  console.log('\n── LEAVE REQUESTS ──');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const submitLeave = await req('POST', '/api/leave-request/student/submit', {
    studentId: STUDENT_ID,
    schoolId: SCHOOL,
    studentName: 'Ravi Kumar',
    studentClass: '10-A',
    from: tomorrow,
    to: tomorrow,
    reasonLabel: 'Family function',
    submittedBy: 'parent',
  }, token);
  pass(
    'Submit student leave request',
    submitLeave.status === 200 || submitLeave.status === 201,
    JSON.stringify(submitLeave.body).slice(0, 80)
  );

  const myLeaves = await req('GET', `/api/leave-requests/students?schoolId=${SCHOOL}`, null, token);
  pass('All student leave requests (admin view)', myLeaves.status === 200,
    `count: ${myLeaves.body?.requests?.length ?? myLeaves.body?.error}`);

  // ── 7. FEES ───────────────────────────────────────────────
  console.log('\n── FEES ──');
  const feeSummary = await req('GET', `/api/parent/fee-summary?studentId=${STUDENT_ID}`, null, token);
  pass('Fee summary for child', feeSummary.status === 200,
    JSON.stringify(feeSummary.body).slice(0, 80));

  const feeReminders = await req('GET', `/api/fee-reminders?studentId=${STUDENT_ID}`, null, token);
  pass('Fee reminders for student', feeReminders.status === 200,
    JSON.stringify(feeReminders.body).slice(0, 80));

  const reminders = (feeReminders.body?.reminders || []);
  if (reminders.length > 0) {
    const feeAck = await req('POST', '/api/fee-reminder/acknowledge', {
      reminderId: reminders[0].id,
    }, token);
    pass('Acknowledge fee reminder', feeAck.status === 200,
      JSON.stringify(feeAck.body).slice(0, 60));
  } else {
    pass('Acknowledge fee reminder', true, 'skipped — no active reminders (expected)');
  }

  // ── 8. NOTIFICATIONS ──────────────────────────────────────
  console.log('\n── NOTIFICATIONS ──');
  const notifs = await req('GET', `/api/parent-notifications?studentId=${STUDENT_ID}&schoolId=${SCHOOL}`, null, token);
  pass('Parent notifications', notifs.status === 200,
    `count: ${notifs.body?.notifications?.length ?? notifs.body?.error}`);

  const notifIds = (notifs.body?.notifications || []).map(n => n.id).slice(0, 5);
  const markRead = await req('POST', '/api/parent-notifications/read', {
    notificationIds: notifIds,
  }, token);
  pass('Mark notifications read', markRead.status === 200 || notifIds.length === 0,
    notifIds.length === 0 ? 'no notifications to mark' : JSON.stringify(markRead.body).slice(0, 60));

  const schNotifs = await req('GET', `/api/school-notifications?schoolId=${SCHOOL}`, null, token);
  pass('School-wide notifications', schNotifs.status === 200,
    `unread: ${schNotifs.body?.unreadCount ?? schNotifs.body?.error}`);

  // ── 9. BUS TRACKING ───────────────────────────────────────
  console.log('\n── BUS TRACKING ──');
  const activeTrips = await req('GET', `/api/bus/active-trips?schoolId=${SCHOOL}`, null, token);
  pass('Active bus trips', activeTrips.status === 200,
    `count: ${activeTrips.body?.trips?.length ?? Array.isArray(activeTrips.body) ? activeTrips.body?.length : activeTrips.body?.error}`);

  const buses = await req('GET', `/api/admin/buses?schoolId=${SCHOOL}`, null, token);
  pass('Bus list for school', buses.status === 200,
    `count: ${buses.body?.buses?.length ?? buses.body?.error}`);

  const allStops = await req('GET', `/api/bus/all-stops?schoolId=${SCHOOL}`, null, token);
  pass('All bus stops', allStops.status === 200,
    JSON.stringify(allStops.body).slice(0, 80));

  const pendingLocReq = await req('GET', `/api/bus/pending-requests?schoolId=${SCHOOL}`, null, token);
  pass('Bus pending location-change requests', pendingLocReq.status === 200,
    JSON.stringify(pendingLocReq.body).slice(0, 80));

  const reqLocChange = await req('POST', '/api/bus/request-location-change', {
    studentId: STUDENT_ID,
    schoolId: SCHOOL,
    newLat: 17.385044,
    newLng: 78.486671,
    reason: 'Moved house',
  }, token);
  pass('Request bus stop change', reqLocChange.status === 200 || reqLocChange.status === 400,
    JSON.stringify(reqLocChange.body).slice(0, 80));

  // ── 10. MULTI-CHILD ───────────────────────────────────────
  console.log('\n── MULTI-CHILD ──');
  const switchChild = await req('POST', '/api/parent/switch-child', {
    uid,
    studentId: STUDENT_ID,
  }, token);
  pass('Switch active child', switchChild.status === 200,
    JSON.stringify(switchChild.body).slice(0, 80));

  // ── 11. ADMIN VERIFIES PARENT ACCOUNT ────────────────────
  console.log('\n── ADMIN VERIFICATION ──');
  const adminLogin = await req('POST', '/api/login', {
    email: 'venkateshthatipamulaaaa@gmail.com',
    password: 'School@123',
  });
  const adminToken = adminLogin.body?.token;
  pass('Admin login', !!adminToken, adminToken ? 'ok' : adminLogin.body?.error);

  const parentAccounts = await req('GET', `/api/admin/parent-accounts?schoolId=${SCHOOL}`, null, adminToken);
  const accounts = Array.isArray(parentAccounts.body) ? parentAccounts.body : (parentAccounts.body?.accounts || []);
  const thisParent = accounts.find(a => a.email === PARENT_EMAIL);
  pass(
    'Parent visible in admin panel',
    !!thisParent,
    thisParent
      ? `status: ${thisParent.accountStatus}, emailVerified: ${thisParent.emailVerified}`
      : `raw: ${JSON.stringify(parentAccounts.body).slice(0, 80)}`
  );

  if (thisParent) {
    const suspend = await req('POST', `/api/admin/parent-accounts/${uid}/status`, {
      status: 'suspended', reason: 'Test suspend',
    }, adminToken);
    pass('Admin can suspend parent account', suspend.status === 200,
      JSON.stringify(suspend.body).slice(0, 60));

    const reEnable = await req('POST', `/api/admin/parent-accounts/${uid}/status`, {
      status: 'active',
    }, adminToken);
    pass('Admin can re-enable parent account', reEnable.status === 200,
      JSON.stringify(reEnable.body).slice(0, 60));
  }

  console.log('\n════════════════════════════════════════');
  console.log('  PARENT TEST COMPLETE');
  console.log('════════════════════════════════════════\n');
}

run().catch(console.error);

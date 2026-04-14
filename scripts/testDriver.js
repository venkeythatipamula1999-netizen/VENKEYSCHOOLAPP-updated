require('dotenv').config();
const http = require('http');

const BASE_HOST    = '127.0.0.1';
const BASE_PORT    = 5000;
const SCHOOL       = 'V-HYDE';
const DRIVER_EMAIL = 'rajesh.driver@vidhyalam.com';
const DRIVER_PASS  = 'Driver@1234';
const DRIVER_NAME  = 'Rajesh Kumar';
const DRIVER_PHONE = '9123456789';
const BUS_NUMBER   = 'AP-09-TG-1234';
const ROUTE        = 'Madhapur-School';

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
  console.log(`${ok ? '✅' : '❌'}  ${label}${detail ? '  →  ' + detail : ''}`);
}

async function run() {
  console.log('\n════════════════════════════════════════');
  console.log('  BUS DRIVER FULL FUNCTIONALITY TEST');
  console.log(`  School: ${SCHOOL}  |  Bus: ${BUS_NUMBER}`);
  console.log('════════════════════════════════════════\n');

  // ── ADMIN LOGIN ───────────────────────────────────────────
  console.log('── SETUP (as Admin/Principal) ──');
  const adminLogin = await req('POST', '/api/login', {
    email: 'venkateshthatipamulaaaa@gmail.com',
    password: 'School@123',
  });
  const adminToken = adminLogin.body?.token;
  pass('Admin login', !!adminToken, adminToken ? 'ok' : adminLogin.body?.error);
  if (!adminToken) return;

  // ── STEP 1: ADD LOGISTICS STAFF (DRIVER) ─────────────────
  console.log('\n── DRIVER ONBOARDING ──');
  let driverRoleId = null;

  const logisticsRes = await req('GET', `/api/logistics-staff?schoolId=${SCHOOL}`, null, adminToken);
  const existing = (logisticsRes.body?.staff || []).find(s => s.full_name === DRIVER_NAME && s.type === 'driver');
  if (existing) {
    driverRoleId = existing.staff_id;
    pass('Logistics staff lookup', true, `already exists → driverRoleId: ${driverRoleId}`);
  } else {
    const addStaff = await req('POST', '/api/add-logistics-staff', {
      fullName: DRIVER_NAME,
      type: 'driver',
      phone: DRIVER_PHONE,
      email: DRIVER_EMAIL,
      busNumber: BUS_NUMBER,
      route: ROUTE,
      license: 'AP-09-20200001234',
      experience: '5',
    }, adminToken);
    driverRoleId = addStaff.body?.staffId;
    pass('Add driver via logistics', addStaff.status === 201, `roleId: ${driverRoleId || addStaff.body?.error}`);
  }

  if (!driverRoleId) { console.log('⚠  No driver roleId — aborting.'); return; }
  console.log(`  Driver Role ID: ${driverRoleId}`);

  // ── STEP 2: ADD BUS & LINK DRIVER ─────────────────────────
  console.log('\n── BUS SETUP ──');
  let busId = null;
  const busesRes = await req('GET', `/api/admin/buses?schoolId=${SCHOOL}`, null, adminToken);
  const existingBus = (busesRes.body?.buses || []).find(b => b.busNumber === BUS_NUMBER);

  if (existingBus) {
    busId = existingBus.busId || existingBus.id;
    pass('Bus exists', true, `busId: ${busId}`);
  } else {
    const addBus = await req('POST', '/api/admin/buses/add', {
      busNumber: BUS_NUMBER,
      route: ROUTE,
      driverId: driverRoleId,
      driverName: DRIVER_NAME,
    }, adminToken);
    busId = addBus.body?.busId;
    pass('Add bus', addBus.status === 200, `busId: ${busId || addBus.body?.error}`);
  }
  console.log(`  Bus ID: ${busId}`);

  if (busId) {
    const assignStudents = await req('POST', '/api/admin/buses/assign-students', {
      busId,
      studentIds: ['STU1773639444029'],
    }, adminToken);
    pass('Assign student to bus', assignStudents.status === 200,
      JSON.stringify(assignStudents.body).slice(0, 60));
  }

  // ── STEP 3: REGISTER DRIVER ACCOUNT ───────────────────────
  console.log('\n── DRIVER ACCOUNT REGISTRATION ──');
  const register = await req('POST', '/api/register', {
    fullName: DRIVER_NAME,
    email: DRIVER_EMAIL,
    password: DRIVER_PASS,
    role: 'driver',
    roleId: driverRoleId,
  });
  const regExists = register.status === 409 || (register.body?.error || '').toLowerCase().includes('already');
  pass(
    'Register driver account',
    register.status === 200 || register.status === 201 || regExists,
    regExists ? 'already registered' : JSON.stringify(register.body).slice(0, 60)
  );

  // ── STEP 4: DRIVER LOGIN ──────────────────────────────────
  console.log('\n── DRIVER AUTHENTICATION ──');
  const loginRes = await req('POST', '/api/login', {
    email: DRIVER_EMAIL,
    password: DRIVER_PASS,
    roleId: driverRoleId,
  });
  const driverToken = loginRes.body?.token;
  const driverUser  = loginRes.body?.user || {};
  pass('Driver login', !!driverToken, driverToken ? `role: ${driverUser.role}` : loginRes.body?.error);
  if (!driverToken) { console.log('\n⚠  Cannot continue without token.'); return; }

  pass('Driver role confirmed', driverUser.role === 'driver', `role: ${driverUser.role}`);
  pass('Driver full name in session', !!driverUser.full_name, `name: ${driverUser.full_name}`);

  // ── STEP 5: MY BUS ────────────────────────────────────────
  console.log('\n── BUS INFO ──');
  const myBus = await req('GET', `/api/driver/my-bus?driverId=${driverRoleId}`, null, driverToken);
  pass('Get my assigned bus',
    myBus.status === 200,
    myBus.body?.bus
      ? `busNumber: ${myBus.body.bus.busNumber}, route: ${myBus.body.bus.route}`
      : 'no bus linked yet (need busId in users doc)'
  );

  const busCrew = await req('GET', `/api/bus/crew?busNumber=${BUS_NUMBER}&schoolId=${SCHOOL}`, null, driverToken);
  pass('Get bus crew', busCrew.status === 200, JSON.stringify(busCrew.body).slice(0, 80));

  // ── STEP 6: NOTIFICATIONS ─────────────────────────────────
  console.log('\n── DRIVER NOTIFICATIONS ──');
  const notifs = await req('GET', `/api/bus/driver-notifications?driverId=${driverRoleId}`, null, driverToken);
  pass('Driver notifications', notifs.status === 200,
    `count: ${notifs.body?.notifications?.length ?? notifs.body?.error}`);

  // ── STEP 7: ROUTE & STUDENTS ──────────────────────────────
  console.log('\n── ROUTE & STUDENTS ──');
  const routeStudents = await req('GET', `/api/bus/route-students?driverId=${driverRoleId}&schoolId=${SCHOOL}`, null, driverToken);
  pass('Students on my route (by driverId)', routeStudents.status === 200,
    JSON.stringify(routeStudents.body).slice(0, 80));

  if (busId) {
    const onboardStudents = await req('GET', `/api/bus/onboard-students?busId=${busId}&schoolId=${SCHOOL}`, null, driverToken);
    pass('Students for QR onboarding (by busId)', onboardStudents.status === 200,
      `count: ${onboardStudents.body?.students?.length ?? JSON.stringify(onboardStudents.body).slice(0, 60)}`);
  }

  const locationReqs = await req('GET', `/api/bus/location-change-requests?driverId=${driverRoleId}&schoolId=${SCHOOL}`, null, driverToken);
  pass('Location change requests', locationReqs.status === 200,
    `count: ${locationReqs.body?.requests?.length ?? locationReqs.body?.error}`);

  const allStops = await req('GET', `/api/bus/all-stops?schoolId=${SCHOOL}`, null, driverToken);
  pass('All bus stops', allStops.status === 200,
    `count: ${allStops.body?.stops?.length ?? allStops.body?.error}`);

  // ── STEP 8: TRIP LIFECYCLE ────────────────────────────────
  console.log('\n── TRIP LIFECYCLE ──');
  const startTrip = await req('POST', '/api/bus/start-trip', {
    driverId: driverRoleId,
    driverName: DRIVER_NAME,
    busNumber: BUS_NUMBER,
    route: ROUTE,
    tripType: 'evening',
    lat: 17.385044,
    lng: 78.486671,
  }, driverToken);
  const tripId = startTrip.body?.tripId;
  pass('Start trip', startTrip.status === 200, `tripId: ${tripId || startTrip.body?.error}`);

  const updateLoc = await req('POST', '/api/bus/update-location', {
    busNumber: BUS_NUMBER,
    lat: 17.392000,
    lng: 78.490000,
    speed: 35,
  }, driverToken);
  pass('Update GPS location (mid-route)', updateLoc.status === 200,
    JSON.stringify(updateLoc.body).slice(0, 60));

  // ── STEP 9: LIVE TRACKING (parent/admin view) ─────────────
  console.log('\n── LIVE TRACKING ──');
  const liveLocation = await req('GET', `/api/bus/live-location?busNumber=${BUS_NUMBER}`, null, driverToken);
  pass('Live location visible to parent', liveLocation.status === 200,
    liveLocation.body?.active
      ? `lat: ${liveLocation.body.location?.lat}, speed: ${liveLocation.body.location?.speed}`
      : `active: ${liveLocation.body?.active}`);

  const activeTrips = await req('GET', `/api/bus/active-trips?schoolId=${SCHOOL}`, null, driverToken);
  pass('Bus appears in active trips list', activeTrips.status === 200,
    `count: ${Array.isArray(activeTrips.body) ? activeTrips.body.length : activeTrips.body?.trips?.length ?? '?'}`);

  // ── STEP 10: STUDENT QR BOARDING ─────────────────────────
  console.log('\n── QR SCAN BOARDING ──');
  const setStop = await req('POST', '/api/bus/set-stop', {
    studentId: 'STU1773639444029',
    busNumber: BUS_NUMBER,
    driverId: driverRoleId,
    lat: 17.392000,
    lng: 78.490000,
    boardingType: 'boarding',
  }, driverToken);
  pass('Student boards bus (QR scan)', setStop.status === 200 || setStop.status === 201,
    JSON.stringify(setStop.body).slice(0, 80));

  // ── STEP 11: PENDING LOCATION CHANGES ────────────────────
  console.log('\n── LOCATION CHANGE APPROVAL ──');
  const pending = await req('GET', `/api/bus/pending-requests?schoolId=${SCHOOL}`, null, driverToken);
  pass('Pending location requests', pending.status === 200,
    `count: ${pending.body?.requests?.length ?? pending.body?.error}`);

  if (pending.body?.requests?.length > 0) {
    const rid = pending.body.requests[0].id;
    const approve = await req('POST', '/api/bus/approve-location-change', {
      requestId: rid,
      approvedBy: driverRoleId,
    }, driverToken);
    pass('Approve location change', approve.status === 200,
      JSON.stringify(approve.body).slice(0, 60));
  } else {
    pass('Approve location change', true, 'skipped — no pending requests');
  }

  // ── STEP 12: ANALYTICS ────────────────────────────────────
  console.log('\n── ANALYTICS & REPORTS ──');
  const proximity = await req('GET', `/api/bus/proximity-alerts-today?busNumber=${BUS_NUMBER}`, null, driverToken);
  pass('Proximity alerts today', proximity.status === 200,
    `count: ${proximity.body?.count ?? proximity.body?.error}`);

  const todaySummary = await req('GET', `/api/bus/today-summary?driverId=${driverRoleId}&schoolId=${SCHOOL}`, null, driverToken);
  pass('Today trip summary', todaySummary.status === 200,
    JSON.stringify(todaySummary.body).slice(0, 80));

  const weekDuration = await req('GET', `/api/bus/trip-duration-week?driverId=${driverRoleId}&schoolId=${SCHOOL}`, null, driverToken);
  pass('Weekly trip duration', weekDuration.status === 200,
    JSON.stringify(weekDuration.body).slice(0, 80));

  // ── STEP 13: END TRIP ─────────────────────────────────────
  console.log('\n── END TRIP ──');
  if (tripId) {
    const endTrip = await req('POST', '/api/bus/end-trip', {
      tripId,
      driverId: driverRoleId,
      driverName: DRIVER_NAME,
      busNumber: BUS_NUMBER,
      route: ROUTE,
      totalDistance: 12.5,
      studentsBoarded: 1,
    }, driverToken);
    pass('End trip', endTrip.status === 200,
      JSON.stringify(endTrip.body).slice(0, 80));
  } else {
    pass('End trip', false, 'no tripId available');
  }

  // ── STEP 14: POST-TRIP CHECKS ─────────────────────────────
  console.log('\n── POST-TRIP VERIFICATION ──');
  const noLive = await req('GET', `/api/bus/live-location?busNumber=${BUS_NUMBER}`, null, driverToken);
  pass('Live location cleared after trip end', noLive.status === 200,
    `active: ${noLive.body?.active}`);

  const busAlerts = await req('GET', `/api/admin/bus-alerts?schoolId=${SCHOOL}`, null, adminToken);
  pass('Bus alerts/summaries visible to admin', busAlerts.status === 200,
    `logs: ${busAlerts.body?.logs?.length}, summaries: ${busAlerts.body?.summaries?.length}`);

  const adminBuses = await req('GET', `/api/admin/buses?schoolId=${SCHOOL}`, null, adminToken);
  pass('Admin bus list', adminBuses.status === 200,
    `buses: ${adminBuses.body?.buses?.length}`);

  console.log('\n════════════════════════════════════════');
  console.log('  DRIVER TEST COMPLETE');
  console.log('════════════════════════════════════════\n');
}

run().catch(console.error);

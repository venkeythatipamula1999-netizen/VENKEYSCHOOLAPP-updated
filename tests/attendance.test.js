'use strict';

const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

let passed = 0;
let failed = 0;

function check(label, result) {
  if (result) {
    console.log(`  ✅ PASS — ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL — ${label}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== Attendance Smoke Test ===\n');

  // 1. Healthcheck — attendance must be "pass"
  try {
    const res = await axios.get(`${BASE_URL}/api/healthcheck`);
    check('Healthcheck: attendance = "pass"', res.data && res.data.checks && res.data.checks.attendance === 'pass');
  } catch (err) {
    check('Healthcheck: attendance = "pass"', false);
    console.log(`     Error: ${err.message}`);
  }

  // 2. GET /api/attendance — must return 200 or 401, not 500 or 404
  try {
    const res = await axios.get(`${BASE_URL}/api/attendance`, {
      params: { schoolId: 'TEST' },
      validateStatus: () => true,
    });
    const ok = res.status === 200 || res.status === 401;
    check(`GET /api/attendance → ${res.status} (expected 200 or 401)`, ok);
  } catch (err) {
    check('GET /api/attendance reachable', false);
    console.log(`     Error: ${err.message}`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('\n✅ Attendance Smoke Test Done');
  } else {
    console.log('\n❌ Attendance Smoke Test Failed');
    process.exitCode = 1;
  }
}

run();

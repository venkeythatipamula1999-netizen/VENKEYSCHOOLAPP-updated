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
  console.log('\n=== CCE Smoke Test ===\n');

  // 1. Healthcheck — cce must be "pass"
  try {
    const res = await axios.get(`${BASE_URL}/api/healthcheck`);
    check('Healthcheck: cce = "pass"', res.data && res.data.checks && res.data.checks.cce === 'pass');
  } catch (err) {
    check('Healthcheck: cce = "pass"', false);
    console.log(`     Error: ${err.message}`);
  }

  // 2. GET /api/cce/marks — must return 200 or 401, not 500 or 404
  try {
    const res = await axios.get(`${BASE_URL}/api/cce/marks`, {
      params: { schoolId: 'TEST', studentId: 'TEST', academicYear: '2025-26' },
      validateStatus: () => true,
    });
    const ok = res.status === 200 || res.status === 401;
    check(`GET /api/cce/marks → ${res.status} (expected 200 or 401)`, ok);
  } catch (err) {
    check('GET /api/cce/marks reachable', false);
    console.log(`     Error: ${err.message}`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('\n✅ CCE Smoke Test Done');
  } else {
    console.log('\n❌ CCE Smoke Test Failed');
    process.exitCode = 1;
  }
}

run();

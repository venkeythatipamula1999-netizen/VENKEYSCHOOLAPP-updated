'use strict';

const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function probe(label, fn) {
  try {
    const res = await fn();
    const status = res.status;
    const pass = status !== 500 && status !== 404;
    return { label, pass, status };
  } catch (err) {
    return { label, pass: false, status: err.response ? err.response.status : 'ERR', error: err.message };
  }
}

async function run() {
  console.log('\n=== Vidhaya Layam Health Report ===\n');

  const results = {};

  // 1. Healthcheck
  try {
    const res = await axios.get(`${BASE_URL}/api/healthcheck`, { validateStatus: () => true });
    const allPass = res.data && res.data.status === 'ok';
    results.healthcheck = { label: 'Healthcheck', pass: allPass, status: res.status };
    if (res.data && res.data.checks) {
      console.log(`Healthcheck response:`);
      Object.entries(res.data.checks).forEach(([k, v]) => {
        console.log(`  ${v === 'pass' ? '✅' : '❌'} ${k}: ${v}`);
      });
      console.log('');
    }
  } catch (err) {
    results.healthcheck = { label: 'Healthcheck', pass: false, status: 'ERR', error: err.message };
  }

  // 2. CCE Marks
  results.cce = await probe('CCE Marks', () =>
    axios.get(`${BASE_URL}/api/cce/marks`, {
      params: { schoolId: 'TEST', studentId: 'TEST', academicYear: '2025-26' },
      validateStatus: () => true,
    })
  );

  // 3. Attendance
  results.attendance = await probe('Attendance', () =>
    axios.get(`${BASE_URL}/api/attendance`, {
      params: { schoolId: 'TEST' },
      validateStatus: () => true,
    })
  );

  // 4. Bus
  results.bus = await probe('Bus', () =>
    axios.get(`${BASE_URL}/api/bus`, {
      params: { schoolId: 'TEST' },
      validateStatus: () => true,
    })
  );

  // 5. WhatsApp
  results.whatsapp = await probe('WhatsApp', () =>
    axios.get(`${BASE_URL}/api/whatsapp`, {
      validateStatus: () => true,
    })
  );

  // Final report
  const pad = (s, n) => s.padEnd(n, ' ');
  console.log('=== Vidhaya Layam Health Report ===');
  const rows = [
    ['Healthcheck',  results.healthcheck],
    ['CCE Marks',    results.cce],
    ['Attendance',   results.attendance],
    ['Bus',          results.bus],
    ['WhatsApp',     results.whatsapp],
  ];
  rows.forEach(([name, r]) => {
    const icon = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${pad(name + ':', 14)} ${icon}  (HTTP ${r.status})`);
  });
  console.log('===================================');

  const allPass = rows.every(([, r]) => r.pass);
  if (allPass) {
    console.log('All systems go. Safe to build. ✅');
  } else {
    const failedNames = rows.filter(([, r]) => !r.pass).map(([n]) => n).join(', ');
    console.log(`\n⚠️  Some checks failed: ${failedNames}`);
    process.exitCode = 1;
  }
}

run();

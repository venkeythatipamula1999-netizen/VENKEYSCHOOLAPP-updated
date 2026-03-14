'use strict';

const router = require('express').Router();
const admin  = require('firebase-admin');
const path   = require('path');

const ROUTES = {
  cce:        path.join(__dirname, 'cce.js'),
  whatsapp:   path.join(__dirname, 'whatsapp.js'),
};

const INLINE_PREFIXES = {
  attendance: '/api/attendance',
  bus:        '/api/bus',
};

function routeFileExists(filePath) {
  try {
    require.resolve(filePath);
    return 'pass';
  } catch {
    return 'fail';
  }
}

router.get('/', async (req, res) => {
  const checks = {};

  try {
    const db = admin.firestore();
    const snap = await db.collection('schools').limit(1).get();
    checks.firestore = snap !== undefined ? 'pass' : 'fail';
  } catch {
    checks.firestore = 'fail';
  }

  checks.cce      = routeFileExists(ROUTES.cce);
  checks.whatsapp = routeFileExists(ROUTES.whatsapp);

  const app = req.app;
  function isRegistered(prefix) {
    try {
      const stack = app._router && app._router.stack ? app._router.stack : [];
      return stack.some(layer =>
        layer.regexp && layer.regexp.test(prefix)
      ) ? 'pass' : 'fail';
    } catch {
      return 'fail';
    }
  }

  checks.attendance = isRegistered(INLINE_PREFIXES.attendance);
  checks.bus        = isRegistered(INLINE_PREFIXES.bus);

  const allPass = Object.values(checks).every(v => v === 'pass');

  res.status(allPass ? 200 : 207).json({
    status:    allPass ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

module.exports = router;

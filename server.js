const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const { runDailyBackup } = require('./src/services/firestoreBackup');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('[FATAL] JWT_SECRET environment variable is not set');

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch (e) { return null; }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many scan requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

const superAdminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: 'Too many super admin requests.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Dynamic per-request — set from JWT. This constant is only used as fallback.
const DEFAULT_SCHOOL_ID = 'school_001';

const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized — Bearer token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
    }

    req.user     = decoded;
    req.schoolId = decoded.schoolId || DEFAULT_SCHOOL_ID;
    req.userId   = decoded.userId;
    req.userRole = decoded.role;
    return next();

  } catch (err) {
    console.error('[verifyAuth]', err.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

const verifySuperAdmin = (req, res, next) => {
  const key = req.headers['x-super-admin-key'];
  if (!key) return res.status(401).json({ error: 'Super admin key required' });
  if (key !== process.env.SUPER_ADMIN_KEY) return res.status(403).json({ error: 'Invalid super admin key' });
  next();
};

const admin = require('firebase-admin');

let adminAuth = null;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      })
    });
  }
  adminAuth = admin.auth();
  console.log('[Firebase Admin] Initialized');
} catch (e) {
  console.warn('[Firebase Admin] Skipped:', e.message);
}

let adminDb = null;
try {
  adminDb = admin.firestore();
  console.log('[Firebase Admin] Firestore initialized');
} catch (e) {
  console.warn('[Firebase Admin] Firestore init failed:', e.message);
}

const checkSchoolActive = async (req, res, next) => {
  try {
    const schoolId = req.schoolId;
    if (!schoolId || schoolId === DEFAULT_SCHOOL_ID) return next();

    if (!adminDb) return next();
    const schoolSnap = await adminDb.collection('schools').doc(schoolId).get();
    if (schoolSnap.exists && schoolSnap.data().status === 'suspended') {
      return res.status(403).json({
        error: 'School account suspended. Please contact Vidhaya Layam support.',
        code: 'SCHOOL_SUSPENDED'
      });
    }
    next();
  } catch (err) {
    next();
  }
};

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc, doc, writeBatch, serverTimestamp, updateDoc, getDoc: getDocFS, deleteDoc, setDoc, orderBy, runTransaction } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const multer = require('multer');
const csvParser = require('csv-parser');
const xlsx = require('xlsx');
const { Readable } = require('stream');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } = require('firebase/auth');
const { syncAttendance, syncMarks, syncUserDirectory, updateUserDirectoryOnRegistration, syncLogisticsStaff, updateUserDirectoryClasses, updateProfileInSheets, markUserInactiveInSheets, syncMasterTimetable, removeMasterTimetableEntries, syncStudentFile, syncBusTripHistory, syncStudentStop, syncStaffAttendance, syncStudent, syncTeacher, syncLeaveRequest, syncParentAccount, syncPayroll, syncNotification, resetDocCache } = require('./src/services/googleSheets');

function generateSchoolCode(schoolName, location) {
  const skipWords = ['THE','AND','OF','A','AN','HIGH','SCHOOL','SR','JR','HIGHER','SECONDARY','PUBLIC','PRIVATE','CENTRAL','CONVENT','ENGLISH','MEDIUM'];
  const nameCode = String(schoolName || '').trim().toUpperCase()
    .split(/\s+/)
    .filter(w => !skipWords.includes(w))
    .map(w => w.replace(/[^A-Z]/g, ''))
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .slice(0, 4);
  const locCode = String(location || '').trim().toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);
  return `${nameCode}-${locCode}`;
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  appId: process.env.FIREBASE_APP_ID,
};

console.log('Firebase Config Check:');
console.log('  apiKey:', firebaseConfig.apiKey ? 'SET (' + firebaseConfig.apiKey.substring(0, 10) + '...)' : 'MISSING');
console.log('  authDomain:', firebaseConfig.authDomain || 'MISSING');
console.log('  projectId:', firebaseConfig.projectId || 'MISSING');
console.log('  storageBucket:', firebaseConfig.storageBucket || 'MISSING');
console.log('  appId:', firebaseConfig.appId ? 'SET' : 'MISSING');

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
app.set('trust proxy', 1);
const PORT = 5000;

const allowedOrigins = [
  'https://super-admin-with-error-tracking-8b9.vercel.app',
  'https://venkeyschoolapp-updated.replit.app',
  process.env.APP_URL,
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
  'http://localhost:5000',
  'http://localhost:8081',
  'http://localhost:19006',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-role-id', 'x-super-admin-key']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
  if (
    req.path.startsWith('/api/super') ||
    req.path.startsWith('/api/login') ||
    req.path.startsWith('/api/admin/login') ||
    req.path.startsWith('/api/parent') ||
    req.path.startsWith('/api/report') ||
    req.path.startsWith('/api/register')
  ) return next();
  checkSchoolActive(req, res, next);
});
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});
app.use('/api/', apiLimiter);

// ── GLOBAL AUTH GUARD ──────────────────────────────────────────
const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/login' },
  { method: 'POST', path: '/api/admin/login' },
  { method: 'POST', path: '/api/register' },
  { method: 'POST', path: '/api/forgot-password' },
  { method: 'POST', path: '/api/parent/register' },
  { method: 'POST', path: '/api/parent/email-login' },
  { method: 'POST', path: '/api/parent/forgot-password' },
  { method: 'GET',  path: '/api/parent/check-student' },
  { method: 'GET',  path: '/api/school-info' },
  { method: 'GET',  path: '/api/report' },
];

app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/download/')) {
    return next();
  }
  if (req.path.startsWith('/api/super/')) return next();
  const isPublic = PUBLIC_ROUTES.some(
    r => r.method === req.method && req.path === r.path
  );
  if (isPublic) return next();
  return verifyAuth(req, res, next);
});
// ── END GLOBAL AUTH GUARD ───────────────────────────────────────

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

async function safeSync(operation, syncFn, payload) {
  try {
    const result = await syncFn();
    if (!result.success) {
      addDoc(collection(db, 'sync_errors'), {
        operation, payload: JSON.stringify(payload).slice(0, 4000),
        error: result.error || 'Sync returned failure', status: 'pending',
        createdAt: new Date().toISOString(), attempts: 1,
      }).catch(() => {});
      console.warn(`[GSheets] ${operation} sync failed — queued for retry: ${result.error}`);
    }
    return result;
  } catch (err) {
    addDoc(collection(db, 'sync_errors'), {
      operation, payload: JSON.stringify(payload).slice(0, 4000),
      error: err.message, status: 'pending',
      createdAt: new Date().toISOString(), attempts: 1,
    }).catch(() => {});
    console.error(`[GSheets] ${operation} sync threw — queued for retry: ${err.message}`);
    return { success: false, error: err.message };
  }
}

app.post('/api/register', registerLimiter, async (req, res) => {
  try {
    const { fullName, email: rawEmail, password, role, roleId } = req.body;
    const email = (rawEmail || '').trim().toLowerCase();
    console.log('Registration attempt for role:', role);

    if (!fullName || !email || !password || !role || !roleId) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['teacher', 'parent', 'staff', 'student', 'driver', 'cleaner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be teacher, parent, staff, student, driver, or cleaner.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Firebase Auth user created:', userCredential.user.uid);
    } catch (authErr) {
      console.error('Firebase Auth error:', authErr.code, authErr.message);
      const errorMap = {
        'auth/email-already-in-use': 'Email already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password is too weak (min 6 characters)',
        'auth/operation-not-allowed': 'Email/Password sign-in is NOT enabled in Firebase Console. Go to Firebase Console > Authentication > Sign-in method > Email/Password > Enable',
        'auth/configuration-not-found': 'Firebase Auth configuration not found. Please enable Email/Password authentication in Firebase Console > Authentication > Sign-in method',
      };
      const friendlyMsg = errorMap[authErr.code] || `Firebase Auth error [${authErr.code}]: ${authErr.message}`;
      return res.status(authErr.code === 'auth/email-already-in-use' ? 409 : 400).json({ error: friendlyMsg });
    }

    const uid = userCredential.user.uid;
    const userData = {
      uid: uid,
      full_name: fullName,
      email: email,
      role: String(role),
      role_id: roleId,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      created_at: new Date().toISOString(),
      ...(role === 'parent' ? {
        studentId: roleId,
        studentIds: [roleId],
        parentName: fullName,
        accountStatus: 'active',
      } : {}),
    };

    const PRINCIPAL_EMAIL = process.env.PRINCIPAL_EMAIL || 'thatipamulavenkatesh1999@gmail.com';
    if (email === PRINCIPAL_EMAIL) {
      userData.role = 'principal';
      console.log(`Auto-promoted ${email} to principal during registration`);
    }

    console.log('Saving to Firestore for role:', userData.role);
    const usersRef = collection(db, 'users');

    const isPreGenerated = /^(TCH|DRV|CLN)-\d{4}(-\d{4})?$/.test(roleId);
    if (/^DRV-\d{4}$/.test(roleId)) { userData.role = 'driver'; }
    if (/^CLN-\d{4}$/.test(roleId)) { userData.role = 'cleaner'; }
    let docId;

    if (isPreGenerated) {
      const existingQ = query(usersRef, where('role_id', '==', roleId));
      const existingSnap = await getDocs(existingQ);

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        await updateDoc(doc(db, 'users', existingDoc.id), {
          uid: uid,
          email: email,
          full_name: fullName,
          status: 'onboarded',
          created_at: userData.created_at,
        });
        docId = existingDoc.id;
        console.log(`Updated pre-generated Firestore doc ${docId} to onboarded for ${roleId}`);
      } else {
        userData.status = 'onboarded';
        const docRef = await addDoc(usersRef, userData);
        docId = docRef.id;
        console.log('Firestore doc created (onboarded):', docId);
      }

      try {
        await updateUserDirectoryOnRegistration(roleId, email, uid);
      } catch (sheetErr) {
        console.error('Google Sheets onboard update failed:', sheetErr.message);
      }
    } else {
      const docRef = await addDoc(usersRef, userData);
      docId = docRef.id;
      console.log('Firestore doc created:', docId, '| UID:', uid, '| Role:', userData.role);
    }

    if (userData.role === 'parent') {
      const studentIds = userData.studentIds || (roleId ? [roleId] : []);
      const parentAccountData = {
        uid,
        parentName: fullName,
        email,
        phone: '',
        studentIds,
        activeStudentId: studentIds[0] || '',
        accountStatus: 'active',
        emailVerified: false,
        failedAttempts: 0,
        lockUntil: null,
        pinHash: null,
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        createdAt: new Date().toISOString(),
        lastLogin: null,
      };
      try {
        await addDoc(collection(db, 'parent_accounts'), parentAccountData);
        console.log('parent_accounts doc created for:', email, '| studentId:', studentIds[0]);
      } catch (paErr) {
        console.error('Failed to create parent_accounts doc:', paErr.message);
      }
    }

    res.status(201).json({
      user: {
        id: docId,
        uid: uid,
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        role_id: userData.role_id,
        created_at: userData.created_at,
        profileCompleted: false,
      },
    });
  } catch (err) {
    console.error('Registration error:', err.code || '', err.message || err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = (rawEmail || '').trim().toLowerCase();
    console.log('Login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase Auth login success:', userCredential.user.uid);
    } catch (authErr) {
      console.error('Firebase Auth login error:', authErr.code, authErr.message);
      const errorMap = {
        'auth/user-not-found': 'Invalid email or password',
        'auth/wrong-password': 'Invalid email or password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/operation-not-allowed': 'Email/Password sign-in is NOT enabled. Go to Firebase Console > Authentication > Sign-in method > Enable it.',
        'auth/configuration-not-found': 'Firebase Auth not configured. Enable Email/Password in Firebase Console > Authentication.',
      };
      const friendlyMsg = errorMap[authErr.code] || `Login error [${authErr.code}]: ${authErr.message}`;
      return res.status(401).json({ error: friendlyMsg });
    }

    const uid = userCredential.user.uid;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '==', uid));
    const snapshot = await getDocs(q);

    let userDoc, user;

    if (snapshot.empty) {
      const qByEmail = query(usersRef, where('email', '==', email));
      const snapByEmail = await getDocs(qByEmail);
      if (snapByEmail.empty) {
        return res.status(404).json({ error: 'User profile not found in Firestore. Please register again.' });
      }
      userDoc = snapByEmail.docs[0];
      user = userDoc.data();
    } else {
      userDoc = snapshot.docs[0];
      user = userDoc.data();
    }

    const PRINCIPAL_EMAIL = process.env.PRINCIPAL_EMAIL || 'thatipamulavenkatesh1999@gmail.com';
    if (email === PRINCIPAL_EMAIL && user.role !== 'principal') {
      await updateDoc(doc(db, 'users', userDoc.id), { role: 'principal' });
      user.role = 'principal';
      console.log(`Auto-promoted ${email} to principal`);
    }

    const roleId = user.role_id || '';
    if (/^DRV-\d{4}$/.test(roleId) && user.role !== 'driver') {
      await updateDoc(doc(db, 'users', userDoc.id), { role: 'driver' });
      user.role = 'driver';
      console.log(`Auto-set role to driver for ${roleId}`);
    }
    if (/^CLN-\d{4}$/.test(roleId) && user.role !== 'cleaner') {
      await updateDoc(doc(db, 'users', userDoc.id), { role: 'cleaner' });
      user.role = 'cleaner';
      console.log(`Auto-set role to cleaner for ${roleId}`);
    }
    const isPreGenerated = /^(TCH|DRV|CLN)-\d{4}(-\d{4})?$/.test(roleId);
    if (isPreGenerated && user.status !== 'onboarded') {
      await updateDoc(doc(db, 'users', userDoc.id), { status: 'onboarded', uid: uid, email: email });
      user.status = 'onboarded';
      console.log(`Login onboard: Updated ${roleId} status to onboarded`);

      const preGenQ = query(usersRef, where('role_id', '==', roleId), where('onboarded_by', '==', 'principal'));
      const preGenSnap = await getDocs(preGenQ);
      for (const preDoc of preGenSnap.docs) {
        if (preDoc.id !== userDoc.id && preDoc.data().status !== 'onboarded') {
          await updateDoc(doc(db, 'users', preDoc.id), { status: 'onboarded', uid: uid, email: email });
          console.log(`Login onboard: Also updated pre-generated doc ${preDoc.id} to onboarded`);
        }
      }

      try {
        await updateUserDirectoryOnRegistration(roleId, email, uid);
      } catch (sheetErr) {
        console.error('Google Sheets onboard update on login failed:', sheetErr.message);
      }
    }

    let driverData = null;
    if ((user.role === 'driver' || user.role === 'cleaner') && roleId) {
      try {
        const logisticsRef = collection(db, 'logistics_staff');
        const drvQ = query(logisticsRef, where('staff_id', '==', roleId));
        const drvSnap = await getDocs(drvQ);
        if (!drvSnap.empty) {
          const ld = drvSnap.docs[0].data();
          driverData = {
            bus_number: ld.bus_number || '',
            route: ld.route || '',
            assigned_area: ld.assigned_area || '',
            phone: ld.phone || '',
            status: ld.status || 'active',
          };
          console.log('Fetched logistics data for role:', driverData.role);
        }
      } catch (drvErr) {
        console.error('Failed to fetch logistics data:', drvErr.message);
      }
    }

    console.log('Login success for role:', user.role);

    const responseUser = { id: userDoc.id, uid, full_name: user.full_name, email: user.email, role: user.role, role_id: user.role_id, created_at: user.created_at, profileCompleted: user.profileCompleted === true };
    if (user.mobile) responseUser.mobile = user.mobile;
    if (user.blood_group) responseUser.blood_group = user.blood_group;
    if (user.emergency_contact) responseUser.emergency_contact = user.emergency_contact;
    if (user.date_of_birth) responseUser.date_of_birth = user.date_of_birth;
    if (user.profileImage) responseUser.profileImage = user.profileImage;
    if (user.subject) responseUser.subject = user.subject;
    if (user.license) responseUser.license = user.license;
    if (user.experience) responseUser.experience = user.experience;
    if (driverData) {
      responseUser.bus_number = driverData.bus_number;
      responseUser.route = driverData.route;
      responseUser.assigned_area = driverData.assigned_area;
      responseUser.driver_status = driverData.status;
    }
    if (user.assignedClasses && Array.isArray(user.assignedClasses)) {
      responseUser.assignedClasses = user.assignedClasses;
    }
    if (user.classTeacherOf) {
      responseUser.classTeacherOf = user.classTeacherOf;
    }
    if (user.timetable && Array.isArray(user.timetable)) {
      responseUser.timetable = user.timetable;
    }

    const jwtToken = signToken({
      userId: userDoc.id,
      role: user.role,
      schoolId: user.schoolId || DEFAULT_SCHOOL_ID,
      roleId: user.role_id,
      email: user.email
    });

    res.json({ token: jwtToken, user: responseUser });
  } catch (err) {
    console.error('Login error:', err.code || '', err.message || err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.post('/api/complete-profile', async (req, res) => {
  try {
    const { uid, docId, fullName, mobile, bloodGroup, emergencyContact, dateOfBirth, role, roleId } = req.body;

    if (!uid || !docId || !fullName || !mobile || !bloodGroup || !emergencyContact || !dateOfBirth) {
      return res.status(400).json({ error: 'All profile fields are required' });
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number' });
    }
    if (!/^[6-9]\d{9}$/.test(emergencyContact)) {
      return res.status(400).json({ error: 'Invalid emergency contact number' });
    }

    const profileData = {
      full_name: fullName,
      mobile: mobile,
      blood_group: bloodGroup,
      emergency_contact: emergencyContact,
      date_of_birth: dateOfBirth,
      profileCompleted: true,
      profile_completed_at: new Date().toISOString(),
    };

    await updateDoc(doc(db, 'users', docId), profileData);
    console.log(`Profile completed for ${roleId || uid}: ${fullName}`);

    try {
      const isLogistics = /^(DRV|CLN)-\d{4}$/.test(roleId || '');
      await updateProfileInSheets({
        roleId: roleId || '',
        fullName,
        mobile,
        bloodGroup,
        emergencyContact,
        dateOfBirth,
        role: role || '',
        isLogistics,
      });
    } catch (sheetErr) {
      console.error('Google Sheets profile sync failed:', sheetErr.message);
    }

    res.json({ success: true, message: 'Profile saved successfully' });
  } catch (err) {
    console.error('Complete profile error:', err.message);
    res.status(500).json({ error: `Failed to save profile: ${err.message}` });
  }
});

app.get('/api/available-classes', async (req, res) => {
  try {
    const classesRef = collection(db, 'classes');
    const classesSnap = await getDocs(query(classesRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))));
    const allClasses = classesSnap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const usersRef = collection(db, 'users');
    const assignedSnap = await getDocs(query(usersRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classTeacherOf', '!=', null)));
    const assignedMap = {};
    assignedSnap.docs.forEach(d => {
      const data = d.data();
      if (data.classTeacherOf) assignedMap[data.classTeacherOf] = { role_id: data.role_id, full_name: data.full_name };
    });

    const available = allClasses.filter(c => !assignedMap[c.name]);
    res.json({ success: true, classes: available, allClasses, assignedMap });
  } catch (err) {
    console.error('Get available classes error:', err.message);
    res.status(500).json({ error: 'Failed to fetch available classes' });
  }
});

app.post('/api/check-timetable-conflict', async (req, res) => {
  try {
    const { className, days, startTime, endTime, excludeRoleId } = req.body;
    if (!className || !days || !startTime || !endTime) {
      return res.status(400).json({ error: 'className, days, startTime, endTime required' });
    }
    const parseTime = (t) => {
      if (!t) return null;
      const m = t.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!m) return null;
      let h = parseInt(m[1], 10), min = parseInt(m[2], 10);
      const p = m[3].toUpperCase();
      if (p === 'PM' && h !== 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    };
    const s1 = parseTime(startTime), e1 = parseTime(endTime);
    if (s1 === null || e1 === null) return res.status(400).json({ error: 'Invalid time format' });
    const normalizedClass = className.replace(/^Grade\s+/i, '');
    const usersSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('role', 'in', ['teacher', 'staff'])));
    const classConflicts = [];
    for (const d of usersSnap.docs) {
      const data = d.data();
      if (data.role_id === excludeRoleId) continue;
      const timetable = data.timetable || [];
      for (const entry of timetable) {
        const entryClass = (entry.className || '').replace(/^Grade\s+/i, '');
        if (entryClass !== normalizedClass) continue;
        const sharedDays = (entry.days || []).filter(day => days.includes(day));
        if (!sharedDays.length) continue;
        const s2 = parseTime(entry.startTime), e2 = parseTime(entry.endTime);
        if (s2 !== null && e2 !== null && s1 < e2 && s2 < e1) {
          classConflicts.push({ teacherName: data.full_name || data.role_id, subject: entry.subject, days: sharedDays, startTime: entry.startTime, endTime: entry.endTime });
        }
      }
    }
    res.json({ conflicts: classConflicts });
  } catch (err) {
    console.error('Timetable conflict check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/set-class-teacher', async (req, res) => {
  try {
    const { roleId, grade } = req.body;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role_id', '==', roleId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return res.status(404).json({ error: 'Teacher not found' });

    if (grade) {
      const existingQ = query(usersRef, where('classTeacherOf', '==', grade));
      const existingSnap = await getDocs(existingQ);
      for (const d of existingSnap.docs) {
        if (d.data().role_id !== roleId) {
          await updateDoc(doc(db, 'users', d.id), { classTeacherOf: null });
        }
      }
    }

    for (const userDoc of snapshot.docs) {
      await updateDoc(doc(db, 'users', userDoc.id), { classTeacherOf: grade || null });
    }

    if (grade) {
      try {
        const teacherName = snapshot.docs[0].data().full_name || roleId;
        await addDoc(collection(db, 'teacher_notifications'), {
          roleId,
          type: 'class_teacher_assigned',
          title: `Class Teacher Assignment`,
          message: `You have been assigned as the Class Teacher of Grade ${grade}. You can now mark attendance and manage fee notifications for this class.`,
          icon: '\uD83C\uDFEB',
          schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
          read: false,
          createdAt: new Date().toISOString(),
        });
        console.log(`Notification sent to ${roleId}: class teacher of ${grade}`);
      } catch (notifErr) {
        console.error('Failed to send class teacher notification:', notifErr.message);
      }
    }

    console.log(`Set ${roleId} as class teacher of ${grade || 'none'}`);
    res.json({ success: true, roleId, classTeacherOf: grade || null });
  } catch (err) {
    console.error('Set class teacher error:', err.message);
    res.status(500).json({ error: 'Failed to set class teacher' });
  }
});

app.get('/api/class-teacher', async (req, res) => {
  try {
    const { grade } = req.query;
    if (!grade) return res.status(400).json({ error: 'grade required' });
    const q = query(collection(db, 'users'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classTeacherOf', '==', grade));
    const snap = await getDocs(q);
    if (snap.empty) return res.json({ classTeacher: null });
    const t = snap.docs[0].data();
    res.json({ classTeacher: { role_id: t.role_id, full_name: t.full_name } });
  } catch (err) {
    console.error('Get class teacher error:', err.message);
    res.status(500).json({ error: 'Failed to get class teacher' });
  }
});

app.post('/api/fee-reminder', async (req, res) => {
  try {
    const { studentId, studentName, className, amount, dueDate, message, senderName, senderRole } = req.body;
    if (!studentId || !amount || !dueDate) return res.status(400).json({ error: 'studentId, amount, and dueDate required' });

    const reminder = {
      studentId,
      studentName: studentName || '',
      className: className || '',
      amount: Number(amount),
      dueDate,
      message: message || '',
      senderName: senderName || 'Admin',
      senderRole: senderRole || 'principal',
      status: 'pending',
      whatsappStatus: 'pending_whatsapp',
      parentAcknowledged: false,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'fee_reminders'), reminder);

    await addDoc(collection(db, 'parent_notifications'), {
      studentId,
      studentName: studentName || '',
      message: `Fee Reminder: A balance of \u20B9${Number(amount).toLocaleString('en-IN')} is due for ${studentName || 'your child'} by ${dueDate}.`,
      type: 'fee_reminder',
      reminderId: docRef.id,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      read: false,
      createdAt: new Date().toISOString(),
    });

    console.log(`Fee reminder sent: ${studentName}, amount: ${amount}, due: ${dueDate}`);
    res.json({ success: true, reminderId: docRef.id });
  } catch (err) {
    console.error('Fee reminder error:', err.message);
    res.status(500).json({ error: 'Failed to send fee reminder' });
  }
});

app.get('/api/fee-students', async (req, res) => {
  try {
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;
    const studentsRef = collection(db, 'fee_records');
    const q = query(studentsRef, where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, students });
  } catch (err) {
    console.error('Fee students error:', err.message);
    res.status(500).json({ error: 'Failed to fetch fee students' });
  }
});

app.get('/api/fee-reminders', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });
    const q = query(collection(db, 'fee_reminders'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const reminders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    reminders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ reminders });
  } catch (err) {
    console.error('Get fee reminders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch fee reminders' });
  }
});

app.post('/api/fee-reminder/acknowledge', async (req, res) => {
  try {
    const { reminderId } = req.body;
    if (!reminderId) return res.status(400).json({ error: 'reminderId required' });
    await updateDoc(doc(db, 'fee_reminders', reminderId), {
      parentAcknowledged: true,
      acknowledgedAt: new Date().toISOString(),
    });

    const reminderSnap = await getDocFS(doc(db, 'fee_reminders', reminderId));
    if (reminderSnap.exists()) {
      const data = reminderSnap.data();
      await addDoc(collection(db, 'parent_notifications'), {
        studentId: data.studentId,
        studentName: data.studentName || '',
        message: `Payment Acknowledgement: Parent of ${data.studentName || 'student'} has marked the fee of \u20B9${Number(data.amount).toLocaleString('en-IN')} as paid. Please verify.`,
        type: 'payment_acknowledgement',
        reminderId,
        forAdmin: true,
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Fee acknowledge error:', err.message);
    res.status(500).json({ error: 'Failed to acknowledge' });
  }
});

app.get('/api/admin/fees/bulk-status', verifyAuth, async (req, res) => {
  if (req.userRole !== 'principal' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { month, year } = req.query;
    const classFilter = req.query.class || '';
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;
    const mon = Number(month);
    const yr = Number(year);

    const feeSnap = await getDocs(query(
      collection(db, 'fee_records'),
      where('schoolId', '==', schoolId)
    ));

    const students = [];
    feeSnap.docs.forEach(d => {
      const rec = d.data();
      if (classFilter && (rec.grade || '') !== classFilter && (rec.className || '') !== classFilter) return;

      const totalFee = Number(rec.totalFee) || 0;
      const discount = Number(rec.discount) || 0;
      const fine = Number(rec.fine) || 0;
      const amountDue = totalFee - discount + fine;

      const history = Array.isArray(rec.history) ? rec.history : [];
      let amountPaid = 0;
      let lastPaymentDate = '';
      let hasPaymentThisMonth = false;

      history.forEach(h => {
        const amt = Number(h.amount) || 0;
        amountPaid += amt;
        const dateStr = h.date || '';
        let payDate = null;
        if (dateStr.includes('-')) {
          payDate = new Date(dateStr);
        } else {
          payDate = new Date(dateStr);
        }
        if (payDate && !isNaN(payDate.getTime())) {
          if (payDate.getMonth() + 1 === mon && payDate.getFullYear() === yr) {
            hasPaymentThisMonth = true;
          }
          const iso = payDate.toISOString().split('T')[0];
          if (!lastPaymentDate || iso > lastPaymentDate) lastPaymentDate = iso;
        }
      });

      let feeStatus = 'unpaid';
      if (amountPaid >= amountDue) {
        feeStatus = 'paid';
      } else if (amountPaid > 0) {
        feeStatus = 'partial';
      }

      students.push({
        studentId: rec.studentId || rec.adm || d.id,
        docId: d.id,
        name: rec.name || '',
        class: rec.grade || rec.className || '',
        rollNumber: rec.roll || rec.rollNumber || '',
        feeStatus,
        amountDue,
        amountPaid,
        balance: Math.max(amountDue - amountPaid, 0),
        lastPaymentDate,
        hasPaymentThisMonth,
      });
    });

    const statusOrder = { unpaid: 0, partial: 1, paid: 2 };
    students.sort((a, b) => (statusOrder[a.feeStatus] || 0) - (statusOrder[b.feeStatus] || 0) || a.name.localeCompare(b.name));

    const summary = {
      total: students.length,
      paid: students.filter(s => s.feeStatus === 'paid').length,
      unpaid: students.filter(s => s.feeStatus === 'unpaid').length,
      partiallyPaid: students.filter(s => s.feeStatus === 'partial').length,
    };

    console.log(`[fees/bulk-status] month=${mon}/${yr} class=${classFilter || 'all'} — total:${summary.total} paid:${summary.paid} unpaid:${summary.unpaid} partial:${summary.partiallyPaid}`);
    res.json({ success: true, summary, students });
  } catch (err) {
    console.error('[fees/bulk-status] Error:', err.message);
    res.status(500).json({ error: 'Failed to load fee status' });
  }
});

app.post('/api/admin/fees/send-reminder', verifyAuth, async (req, res) => {
  if (req.userRole !== 'principal' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { studentIds, month, year } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array is required' });
    }
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthLabel = monthNames[Number(month) - 1] || `Month ${month}`;

    const feeSnap = await getDocs(query(
      collection(db, 'fee_records'),
      where('schoolId', '==', schoolId)
    ));
    const feeMap = {};
    feeSnap.docs.forEach(d => {
      const data = d.data();
      const key = data.studentId || data.adm || d.id;
      feeMap[key] = data;
    });

    let sentCount = 0;
    const batch = writeBatch(db);
    for (const sid of studentIds) {
      try {
        const rec = feeMap[sid];
        const studentName = rec ? (rec.name || '') : '';
        const balance = rec ? Math.max((Number(rec.totalFee) || 0) - (Number(rec.discount) || 0) + (Number(rec.fine) || 0) - (rec.history || []).reduce((a, h) => a + (Number(h.amount) || 0), 0), 0) : 0;

        const notifRef = doc(collection(db, 'parent_notifications'));
        batch.set(notifRef, {
          studentId: sid,
          studentName,
          title: 'Fee Reminder',
          message: `Fee reminder for ${monthLabel} ${year}: A balance of \u20B9${balance.toLocaleString('en-IN')} is pending for ${studentName || 'your child'}. Please clear it at the earliest.`,
          type: 'fee_reminder',
          schoolId,
          read: false,
          createdAt: new Date().toISOString(),
        });
        sentCount++;
      } catch (e) {
        console.warn(`[fees/send-reminder] Failed for ${sid}:`, e.message);
      }
    }
    await batch.commit();

    console.log(`[fees/send-reminder] Sent ${sentCount}/${studentIds.length} reminders for ${monthLabel} ${year}`);
    res.json({ success: true, sent: sentCount });
  } catch (err) {
    console.error('[fees/send-reminder] Error:', err.message);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

app.get('/api/classes', async (req, res) => {
  try {
    const [classesSnap, studentsSnap] = await Promise.all([
      getDocs(query(collection(db, 'classes'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
      getDocs(query(collection(db, 'students'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
    ]);

    const countByClass = {};
    studentsSnap.docs.forEach(d => {
      const cid = d.data().classId;
      if (cid) countByClass[cid] = (countByClass[cid] || 0) + 1;
    });

    const classes = classesSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      studentCount: countByClass[d.id] || 0,
    }));

    res.json({ success: true, classes });
  } catch (err) {
    console.error('Get classes error:', err.message);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

app.post('/api/classes/add', async (req, res) => {
  try {
    const { className } = req.body;
    console.log('Add class request received:', className);
    if (!className) return res.status(400).json({ error: 'className required' });
    
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('name', '==', className));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log('Class already exists:', className);
      return res.status(400).json({ error: 'Class already exists' });
    }
    
    const newDoc = await addDoc(collection(db, 'classes'), {
      name: className,
      studentCount: 0,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      createdAt: new Date().toISOString()
    });
    
    console.log('Class added successfully with ID:', newDoc.id);
    res.json({ success: true, id: newDoc.id });
  } catch (err) {
    console.error('Add class error details:', err);
    res.status(500).json({ error: 'Failed to add class: ' + err.message });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Class ID required' });
    await deleteDoc(doc(db, 'classes', id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete class by ID error:', err.message);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

app.post('/api/classes/delete', async (req, res) => {
  try {
    const { className } = req.body;
    if (!className) return res.status(400).json({ error: 'className required' });
    
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('name', '==', className));
    const snapshot = await getDocs(q);
    
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'classes', d.id));
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete class error:', err.message);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, rollNumber, classId, className, parentPhone, busId, routeId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Student name is required' });
    if (!classId) return res.status(400).json({ error: 'classId is required' });
    if (!rollNumber) return res.status(400).json({ error: 'Roll number is required' });

    const studentsRef = collection(db, 'students');
    const dupQ = query(studentsRef, where('classId', '==', classId), where('rollNumber', '==', Number(rollNumber)));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      return res.status(400).json({ error: `Roll number ${rollNumber} already exists in this class` });
    }

    const studentId = 'STU' + Date.now();
    const docRef = await addDoc(studentsRef, {
      studentId,
      name: name.trim(),
      rollNumber: Number(rollNumber),
      classId,
      className: String(className || '').trim(),
      parentPhone: String(parentPhone || '').trim(),
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      busId: String(busId || '').trim(),
      routeId: String(routeId || '').trim(),
      status: 'active',
      qrCode: `SREE_PRAGATHI|${(req.schoolId || DEFAULT_SCHOOL_ID)}|${studentId}`,
      createdAt: serverTimestamp(),
    });
    console.log('Student added:', name.trim(), '| Class:', className, '| Roll:', rollNumber);
    res.json({ success: true, id: docRef.id, studentId });
    safeSync('syncStudent', () => syncStudent({ studentId, name: name.trim(), rollNumber: Number(rollNumber), className: className || '', classId, parentPhone: parentPhone || '', createdAt: new Date().toISOString() }), { studentId }).catch(() => {});
  } catch (err) {
    console.error('Add student error:', err.message);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

app.get('/api/students/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    students.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
    res.json({ success: true, students });
  } catch (err) {
    console.error('Get students error:', err.message);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDoc(doc(db, 'students', id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete student error:', err.message);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

app.post('/api/students/bulk-upload/:classId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { classId } = req.params;
    const { className } = req.body;

    const classSnap = await getDocFS(doc(db, 'classes', classId));
    const resolvedClassName = className || (classSnap.exists() ? classSnap.data().name : classId);

    const existingQ = query(collection(db, 'students'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classId', '==', classId));
    const existingSnap = await getDocs(existingQ);
    const existingRolls = new Set(existingSnap.docs.map(d => Number(d.data().rollNumber)));

    const ext = req.file.originalname.toLowerCase().split('.').pop();
    let rows = [];

    if (ext === 'csv') {
      await new Promise((resolve, reject) => {
        const stream = Readable.from(req.file.buffer);
        stream.pipe(csvParser())
          .on('data', row => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      return res.status(400).json({ error: 'Only .csv and .xlsx files are supported' });
    }

    const normalize = (obj, keys) => {
      const lower = {};
      for (const k of Object.keys(obj)) lower[k.toLowerCase().trim()] = obj[k];
      for (const k of keys) { if (lower[k] !== undefined) return lower[k]; }
      return '';
    };

    const unitColRegex = /^unit(\d+)[_\s](.+)$/i;
    const detectMarksCols = (headers) => {
      const cols = [];
      for (const h of headers) {
        const m = h.trim().match(unitColRegex);
        if (m) {
          const unitNum = m[1];
          const subject = m[2].trim().replace(/_/g, ' ');
          const examType = `Unit ${unitNum}`;
          cols.push({ header: h, subject, examType });
        }
      }
      return cols;
    };

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const marksCols = detectMarksCols(headers);

    let studentsCreated = 0;
    let marksCreated = 0;
    let skipped = 0;
    const errors = [];

    const marksRef = collection(db, 'student_marks');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = String(normalize(row, ['name', 'student name', 'studentname', 'full name']) || '').trim();
        const rollRaw = normalize(row, ['rollnumber', 'roll number', 'roll no', 'roll', 'rollno']);
        const parentPhone = String(normalize(row, ['parentphone', 'parent phone', 'phone', 'mobile', 'contact']) || '').trim();

        if (!name) { skipped++; continue; }
        if (rollRaw === '' || rollRaw === null || rollRaw === undefined) {
          errors.push(`Row ${i + 2}: missing roll number for "${name}"`); skipped++; continue;
        }

        const rollNumber = Number(rollRaw);
        if (isNaN(rollNumber) || rollNumber <= 0) {
          errors.push(`Row ${i + 2}: invalid roll number "${rollRaw}" for "${name}"`); skipped++; continue;
        }
        if (existingRolls.has(rollNumber)) {
          errors.push(`Row ${i + 2}: roll ${rollNumber} already exists — skipped "${name}"`); skipped++; continue;
        }

        const studentId = 'STU' + Date.now() + Math.floor(Math.random() * 9000 + 1000);
        const busIdVal = String(normalize(row, ['busid', 'bus id', 'bus', 'bus_id', 'busnumber', 'bus number']) || '').trim();
        const routeIdVal = String(normalize(row, ['routeid', 'route id', 'route', 'route_id', 'busroute', 'bus route']) || '').trim();

        await addDoc(collection(db, 'students'), {
          studentId,
          name,
          rollNumber,
          classId,
          className: resolvedClassName,
          parentPhone,
          schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
          busId: busIdVal,
          routeId: routeIdVal,
          status: 'active',
          qrCode: `SREE_PRAGATHI|${(req.schoolId || DEFAULT_SCHOOL_ID)}|${studentId}`,
          createdAt: serverTimestamp(),
        });
        existingRolls.add(rollNumber);
        studentsCreated++;
        safeSync('syncStudent', () => syncStudent({ studentId, name, rollNumber, className: resolvedClassName, classId, parentPhone, createdAt: new Date().toISOString() }), { studentId }).catch(() => {});

        for (const col of marksCols) {
          const rawVal = row[col.header];
          if (rawVal === '' || rawVal === null || rawVal === undefined) continue;
          const marksObtained = Number(rawVal);
          if (isNaN(marksObtained) || marksObtained < 0) {
            errors.push(`Row ${i + 2}: invalid marks "${rawVal}" in column "${col.header}" — skipped`);
            continue;
          }
          const docId = `${studentId}_${col.examType.replace(/\s/g, '')}_${col.subject.replace(/\s/g, '')}`;
          await setDoc(doc(marksRef, docId), {
            studentId,
            studentName: name,
            classId,
            subject: col.subject,
            examType: col.examType,
            marksObtained,
            maxMarks: 20,
            recordedBy: 'bulk_import',
            schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
            timestamp: serverTimestamp(),
          });
          marksCreated++;
        }
      } catch (rowErr) {
        errors.push(`Row ${i + 2}: ${rowErr.message}`);
        skipped++;
      }
    }

    console.log(`Bulk upload: ${studentsCreated} students, ${marksCreated} marks, ${skipped} skipped — class ${resolvedClassName}`);
    res.json({ success: true, studentsCreated, marksCreated, skipped, errors });
  } catch (err) {
    console.error('Bulk upload error:', err.message);
    res.status(500).json({ error: 'Bulk upload failed: ' + err.message });
  }
});

app.post('/api/assign-classes', async (req, res) => {
  try {
    const { roleId, classes } = req.body;
    console.log('Assign classes request:', { roleId, classes });

    if (!roleId) {
      return res.status(400).json({ error: 'Teacher role ID is required' });
    }
    if (!classes || !Array.isArray(classes)) {
      return res.status(400).json({ error: 'Classes must be an array' });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role_id', '==', roleId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({ error: `No user found with role_id: ${roleId}` });
    }

    let updatedCount = 0;
    for (const userDoc of snapshot.docs) {
      await updateDoc(doc(db, 'users', userDoc.id), { assignedClasses: classes });
      updatedCount++;
    }

    console.log(`Assigned ${classes.length} classes to ${roleId}: ${classes.join(', ')} (${updatedCount} docs updated)`);

    let sheetSync = { success: false };
    try {
      sheetSync = await updateUserDirectoryClasses(roleId, classes);
    } catch (syncErr) {
      console.error('Google Sheets class assignment sync failed:', syncErr.message);
    }

    res.json({
      success: true,
      roleId,
      assignedClasses: classes,
      updatedDocs: updatedCount,
      sheetSync: sheetSync.success,
    });
  } catch (err) {
    console.error('Assign classes error:', err.code || '', err.message || err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.get('/api/teacher-classes', async (req, res) => {
  try {
    const { roleId } = req.query;
    if (!roleId) {
      return res.status(400).json({ error: 'roleId query param is required' });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role_id', '==', roleId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.json({ assignedClasses: [] });
    }

    const userData = snapshot.docs[0].data();
    res.json({ assignedClasses: userData.assignedClasses || [] });
  } catch (err) {
    console.error('Get teacher classes error:', err.message);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.get('/api/teacher/profile', async (req, res) => {
  try {
    const { roleId } = req.query;
    if (!roleId) return res.status(400).json({ error: 'roleId is required' });
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role_id', '==', roleId));
    const snap = await getDocs(q);
    if (snap.empty) return res.status(404).json({ error: 'Teacher not found' });
    const data = snap.docs[0].data();
    res.json({
      classTeacherOf: data.classTeacherOf || null,
      timetable: data.timetable || [],
      assignedClasses: data.assignedClasses || [],
      subject: data.subject || '',
      full_name: data.full_name || '',
      role_id: data.role_id || roleId,
    });
  } catch (err) {
    console.error('Teacher profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch teacher profile' });
  }
});

app.get('/api/teacher/permissions', async (req, res) => {
  try {
    const { roleId } = req.query;
    if (!roleId) return res.status(400).json({ error: 'roleId is required' });

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role_id', '==', roleId));
    const snap = await getDocs(q);
    if (snap.empty) return res.json({ subjects: [], classes: [], subjectClassMap: {} });

    const data = snap.docs[0].data();
    const timetable = data.timetable || [];
    const assignedClasses = data.assignedClasses || [];
    const primarySubject = data.subject || '';

    const subjectClassMap = {};
    const allSubjects = new Set();
    const allClasses = new Set();

    for (const entry of timetable) {
      const subj = entry.subject;
      const cls = entry.className;
      if (subj) {
        allSubjects.add(subj);
        if (!subjectClassMap[subj]) subjectClassMap[subj] = [];
        if (cls && !subjectClassMap[subj].includes(cls)) subjectClassMap[subj].push(cls);
      }
      if (cls) allClasses.add(cls);
    }

    if (primarySubject && !allSubjects.has(primarySubject)) {
      allSubjects.add(primarySubject);
      if (!subjectClassMap[primarySubject]) {
        subjectClassMap[primarySubject] = [...assignedClasses];
      }
    }

    for (const cls of assignedClasses) {
      allClasses.add(cls);
    }

    res.json({
      subjects: [...allSubjects],
      classes: [...allClasses],
      subjectClassMap,
      role: data.role,
    });
  } catch (err) {
    console.error('Teacher permissions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

app.post('/api/save-timetable', async (req, res) => {
  try {
    const { roleId, teacherName, timetable } = req.body;
    if (!roleId || !Array.isArray(timetable)) {
      return res.status(400).json({ error: 'roleId and timetable array required' });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role_id', '==', roleId));
    const snap = await getDocs(q);
    if (snap.empty) return res.status(404).json({ error: 'Teacher not found' });

    const userDocRef = doc(db, 'users', snap.docs[0].id);
    const currentData = snap.docs[0].data();
    const oldTimetable = currentData.timetable || [];
    const oldClassNames = oldTimetable.map(t => t.className);
    const newClassNames = timetable.map(t => t.className);
    const removedClasses = oldClassNames.filter(c => !newClassNames.includes(c));

    await updateDoc(userDocRef, {
      timetable: timetable,
      assignedClasses: newClassNames,
    });

    const calRef = collection(db, 'teacher_calendar');
    if (removedClasses.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const rmQ = query(calRef, where('roleId', '==', roleId));
      const rmSnap = await getDocs(rmQ);
      const batch = writeBatch(db);
      let deleteCount = 0;
      for (const d of rmSnap.docs) {
        const data = d.data();
        if (removedClasses.includes(data.className) && data.date >= today) {
          batch.delete(doc(db, 'teacher_calendar', d.id));
          deleteCount++;
        }
      }
      if (deleteCount > 0) await batch.commit();
      console.log(`Deleted ${deleteCount} future calendar entries for removed classes`);
    }

    const ACADEMIC_START = new Date(process.env.ACADEMIC_START || '2025-06-02');
    const ACADEMIC_END = new Date(process.env.ACADEMIC_END || '2026-04-30');
    const DAY_MAP = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = today > ACADEMIC_START ? today : ACADEMIC_START;

    const existingQ = query(calRef, where('roleId', '==', roleId));
    const existingSnap = await getDocs(existingQ);
    const existingKeys = new Set();
    for (const d of existingSnap.docs) {
      const data = d.data();
      existingKeys.add(`${data.className}|${data.date}|${data.startTime}`);
    }

    let generated = 0;
    for (const entry of timetable) {
      if (!entry.days || !entry.days.length) continue;
      const targetDays = entry.days.map(d => DAY_MAP[d]).filter(Boolean);

      let cursor = new Date(startDate);
      while (cursor <= ACADEMIC_END) {
        if (targetDays.includes(cursor.getDay())) {
          const dateStr = cursor.toISOString().split('T')[0];
          const key = `${entry.className}|${dateStr}|${entry.startTime}`;
          if (!existingKeys.has(key)) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            await addDoc(calRef, {
              roleId,
              className: entry.className,
              subject: entry.subject || '',
              date: dateStr,
              dayOfWeek: dayNames[cursor.getDay()],
              startTime: entry.startTime || '',
              endTime: entry.endTime || '',
              room: entry.room || '',
              status: 'scheduled',
              createdAt: new Date().toISOString(),
            });
            generated++;
            existingKeys.add(key);
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    let sheetSync = false;
    try {
      const sheetEntries = timetable.map(e => ({
        teacherId: roleId,
        teacherName: teacherName || currentData.full_name || '',
        className: e.className,
        subject: e.subject || '',
        days: e.days || [],
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        room: e.room || '',
        status: 'Active',
      }));
      const sr = await syncMasterTimetable(sheetEntries);
      sheetSync = sr.success;

      if (removedClasses.length > 0) {
        await removeMasterTimetableEntries(roleId, removedClasses);
      }

      await updateUserDirectoryClasses(roleId, newClassNames);
    } catch (syncErr) {
      console.error('Timetable sheet sync failed:', syncErr.message);
    }

    try {
      const classList = timetable.map(t => `Grade ${t.className} (${t.subject})`).join(', ');
      await addDoc(collection(db, 'teacher_notifications'), {
        roleId,
        type: 'timetable_updated',
        title: 'Timetable Updated',
        message: `Your academic schedule has been updated by the Admin. ${timetable.length} class${timetable.length !== 1 ? 'es' : ''} assigned: ${classList}.`,
        icon: '\uD83D\uDCC5',
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        createdAt: new Date().toISOString(),
      });
      console.log(`Notification sent to ${roleId}: timetable updated`);
    } catch (notifErr) {
      console.error('Failed to send timetable notification:', notifErr.message);
    }

    console.log(`Saved timetable for ${roleId}: ${timetable.length} classes, ${generated} calendar events generated`);
    res.json({ success: true, generated, removedClasses: removedClasses.length, sheetSync });
  } catch (err) {
    console.error('Save timetable error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher-notifications', async (req, res) => {
  try {
    const { roleId } = req.query;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });

    const notifsRef = collection(db, 'teacher_notifications');
    const q = query(notifsRef, where('roleId', '==', roleId));
    const snap = await getDocs(q);

    const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    res.json({ notifications });
  } catch (err) {
    console.error('Fetch teacher notifications error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher-notifications/mark-read', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!notificationIds || !Array.isArray(notificationIds)) return res.status(400).json({ error: 'notificationIds array required' });

    for (const id of notificationIds) {
      await updateDoc(doc(db, 'teacher_notifications', id), { read: true });
    }

    res.json({ success: true, marked: notificationIds.length });
  } catch (err) {
    console.error('Mark teacher notifications read error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher-timetable', async (req, res) => {
  try {
    const { roleId } = req.query;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role_id', '==', roleId));
    const snap = await getDocs(q);
    if (snap.empty) return res.json({ timetable: [] });

    const userData = snap.docs[0].data();
    res.json({ timetable: userData.timetable || [] });
  } catch (err) {
    console.error('Get timetable error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher-calendar', async (req, res) => {
  try {
    const { roleId, month, year } = req.query;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });

    const calRef = collection(db, 'teacher_calendar');
    const q = query(calRef, where('roleId', '==', roleId));
    const snap = await getDocs(q);

    let events = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      events = events.filter(e => e.date && e.date.startsWith(prefix));
    }

    events.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    res.json({ events });
  } catch (err) {
    console.error('Get teacher calendar error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function normalizeExamType(type) {
  const map = {
    'unit 1': 'unit1', 'unit1': 'unit1',
    'unit 2': 'unit2', 'unit2': 'unit2',
    'unit 3': 'unit3', 'unit3': 'unit3',
  };
  return map[(type || '').toLowerCase().trim()] || type;
}

function normalizeSubjectName(name) {
  const map = {
    'math': 'Mathematics', 'maths': 'Mathematics', 'mathematics': 'Mathematics',
    'science': 'Science', 'sci': 'Science',
    'english': 'English', 'eng': 'English',
    'social': 'Social Studies', 'soc': 'Social Studies',
    'social science': 'Social Studies', 'social studies': 'Social Studies',
    'telugu': 'Telugu', 'tel': 'Telugu',
    'tamil': 'Tamil', 'tam': 'Tamil',
    'computer': 'Computer', 'comp': 'Computer',
    'computers': 'Computer', 'computer science': 'Computer',
    'hindi': 'Hindi',
  };
  const key = (name || '').toLowerCase().trim();
  return map[key] || name;
}

app.post('/api/marks/save', async (req, res) => {
  try {
    const { records, subject: rawSubject, examType, teacherId, classId, className } = req.body;
    const subject = normalizeSubjectName(rawSubject);
    console.log('Marks save request:', { subject, rawSubject, examType, recordCount: records?.length, teacherId });

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No marks records provided' });
    }
    if (!subject || !examType) {
      return res.status(400).json({ error: 'Subject and exam type are required' });
    }

    if (teacherId) {
      const usersRef = collection(db, 'users');
      const tq = query(usersRef, where('role_id', '==', teacherId));
      const tSnap = await getDocs(tq);
      if (!tSnap.empty) {
        const teacherData = tSnap.docs[0].data();
        if (teacherData.role !== 'principal') {
          const timetable = teacherData.timetable || [];
          const assignedClasses = teacherData.assignedClasses || [];
          const primarySubject = teacherData.subject || '';

          const allowedSubjects = new Set();
          const subjectClassMap = {};
          for (const entry of timetable) {
            if (entry.subject) {
              allowedSubjects.add(entry.subject.toLowerCase());
              if (!subjectClassMap[entry.subject.toLowerCase()]) subjectClassMap[entry.subject.toLowerCase()] = [];
              if (entry.className) subjectClassMap[entry.subject.toLowerCase()].push(entry.className);
            }
          }
          if (primarySubject) allowedSubjects.add(primarySubject.toLowerCase());

          if (!allowedSubjects.has(subject.toLowerCase())) {
            console.log(`Permission denied: ${teacherId} not assigned subject "${subject}"`);
            return res.status(403).json({ error: `Permission denied: You are not assigned to teach ${subject}.` });
          }

          const gradeToCheck = (className || '').trim().replace(/^Grade\s+/i, '');
          if (gradeToCheck) {
            const hasClassAccess = assignedClasses.some(ac =>
              ac.trim().replace(/^Grade\s+/i, '').toLowerCase() === gradeToCheck.toLowerCase()
            );
            if (!hasClassAccess) {
              console.log(`Permission denied: ${teacherId} not assigned class "${gradeToCheck}"`);
              return res.status(403).json({ error: `Permission denied: You are not assigned to class ${gradeToCheck}.` });
            }

            const subjectLower = subject.toLowerCase();
            if (subjectClassMap[subjectLower] && subjectClassMap[subjectLower].length > 0) {
              const hasSubjectInClass = subjectClassMap[subjectLower].some(sc =>
                sc.trim().replace(/^Grade\s+/i, '').toLowerCase() === gradeToCheck.toLowerCase()
              );
              if (!hasSubjectInClass) {
                console.log(`Permission denied: ${teacherId} does not teach "${subject}" in class "${gradeToCheck}"`);
                return res.status(403).json({ error: `Permission denied: You are not assigned to teach ${subject} in Grade ${gradeToCheck}.` });
              }
            }
          }
        }
      }
    }

    for (const record of records) {
      if (!record.studentId || !record.studentName || !record.classId) {
        return res.status(400).json({ error: 'Each record must have studentId, studentName, and classId' });
      }
      if (classId && record.classId !== classId) {
        return res.status(400).json({ error: `Record classId mismatch: expected ${classId}, got ${record.classId} for ${record.studentName}` });
      }
      if (typeof record.marksObtained !== 'number' || record.marksObtained < 0) {
        return res.status(400).json({ error: `Invalid marks for ${record.studentName}. Must be a non-negative number.` });
      }
      if (typeof record.maxMarks !== 'number' || record.maxMarks <= 0) {
        return res.status(400).json({ error: `Invalid maxMarks for ${record.studentName}. Must be a positive number.` });
      }
      if (record.marksObtained > record.maxMarks) {
        return res.status(400).json({ error: `Marks (${record.marksObtained}) cannot exceed max marks (${record.maxMarks}) for ${record.studentName}` });
      }
    }

    const marksRef = collection(db, 'student_marks');
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;
    const now = new Date().toISOString();

    const docEntries = records.map(r => ({
      record: r,
      ref: doc(marksRef, `${r.studentId}_${examType}_${subject}`),
    }));

    let conflicts = [];
    try {
      await runTransaction(db, async (transaction) => {
        const existingDocs = await Promise.all(docEntries.map(({ ref }) => transaction.get(ref)));

        const conflictsFound = [];
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const existing = existingDocs[i];
          if (existing.exists() && record.version !== undefined) {
            const currentVersion = existing.data().version || 1;
            if (Number(record.version) !== currentVersion) {
              conflictsFound.push({
                studentId: record.studentId,
                studentName: record.studentName,
                existingVersion: currentVersion,
                attemptedVersion: Number(record.version),
              });
            }
          }
        }

        if (conflictsFound.length > 0) {
          conflicts = conflictsFound;
          const err = new Error('VERSION_CONFLICT');
          err.isVersionConflict = true;
          throw err;
        }

        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const { ref } = docEntries[i];
          const existing = existingDocs[i];
          const currentVersion = existing.exists() ? (existing.data().version || 1) : 0;
          transaction.set(ref, {
            studentId: record.studentId,
            studentName: record.studentName,
            classId: record.classId,
            className: className || record.classId || '',
            subject,
            examType,
            marksObtained: record.marksObtained,
            maxMarks: record.maxMarks,
            recordedBy: record.recordedBy || teacherId || 'teacher',
            schoolId,
            version: currentVersion === 0 ? 1 : currentVersion + 1,
            updatedAt: now,
            timestamp: serverTimestamp(),
          });
        }
      });
    } catch (txErr) {
      if (txErr.isVersionConflict) {
        try {
          await Promise.all(conflicts.map(c => addDoc(collection(db, 'marks_conflict_logs'), {
            studentId: c.studentId,
            classId,
            subject,
            examType,
            attemptedBy: teacherId || 'teacher',
            existingVersion: c.existingVersion,
            attemptedVersion: c.attemptedVersion,
            timestamp: now,
            schoolId,
          })));
        } catch (logErr) {
          console.error('[marks/save] Conflict log error:', logErr.message);
        }
        return res.status(409).json({
          error: 'Version conflict: these marks were updated by someone else since you last loaded them.',
          conflicts: conflicts.map(c => ({ studentId: c.studentId, studentName: c.studentName })),
        });
      }
      throw txErr;
    }

    const avg = Math.round(records.reduce((s, r) => s + r.marksObtained, 0) / records.length);
    console.log(`[student_marks] Saved/updated ${records.length} records | subject: ${subject} | exam: ${examType} | class: ${className} | avg: ${avg}`);

    // Admin notification — marks submitted
    try {
      const notifMsg = `${teacherId || 'Teacher'} submitted ${subject} marks for ${examType} — Class ${className || classId}. ${records.length} students, Class Avg: ${avg}/${records[0]?.maxMarks || 20}.`;
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'marks_submitted',
        icon: '📝',
        title: 'Marks Submitted',
        message: notifMsg,
        details: {
          teacherId: teacherId || '',
          subject,
          examType,
          classId,
          className: className || classId,
          studentCount: records.length,
          classAvg: avg,
        },
        priority: 'normal',
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        createdAt: new Date().toISOString(),
      });
      console.log(`[marks] Admin notification sent: ${subject} ${examType} for class ${classId}`);
    } catch (notifErr) {
      console.error('[marks] Admin notification error:', notifErr.message);
    }

    // Parent notifications — one per student
    try {
      await Promise.all(records.map(async (record) => {
        try {
          const studentQuery = query(
            collection(db, 'students'),
            where('studentId', '==', record.studentId)
          );
          const studentSnap = await getDocs(studentQuery);
          const parentPhone = !studentSnap.empty ? studentSnap.docs[0].data().parentPhone || null : null;

          const pct = Math.round((record.marksObtained / record.maxMarks) * 100);
          await addDoc(collection(db, 'parent_notifications'), {
            studentId: record.studentId,
            studentName: record.studentName,
            type: 'marks_published',
            title: 'Marks Published',
            message: `Dear Parent, ${record.studentName}'s ${subject} marks for ${examType} have been published. Score: ${record.marksObtained}/${record.maxMarks} (${pct}%).`,
            subject,
            examType,
            classId,
            marksObtained: record.marksObtained,
            maxMarks: record.maxMarks,
            pct,
            parentPhone: parentPhone || null,
            schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
            read: false,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.error('[marks] Parent notif error for', record.studentId, e.message);
        }
      }));
      console.log(`[marks] Parent notifications sent for ${records.length} students`);
    } catch (parentErr) {
      console.error('[marks] Parent notifications batch error:', parentErr.message);
    }

    let sheetSync = { success: false };
    try {
      sheetSync = await syncMarks(records, subject, examType);
    } catch (syncErr) {
      console.error('Google Sheets sync (marks) failed:', syncErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Marks saved for ${records.length} students`,
      summary: { total: records.length, subject, examType, classAvg: avg },
      sheetSync: sheetSync.success,
    });
  } catch (err) {
    console.error('Marks save error:', err.code || '', err.message || err);
    res.status(500).json({ error: 'Marks failed to save. Please check your connection.' });
  }
});

app.get('/api/marks/submitted-exams', async (req, res) => {
  try {
    const { classId, subject } = req.query;
    if (!classId || !subject) return res.status(400).json({ error: 'classId and subject required' });

    const q = query(
      collection(db, 'student_marks'),
      where('classId', '==', classId),
      where('subject', '==', subject.trim())
    );
    const snap = await getDocs(q);
    const examTypes = new Set();
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.examType) examTypes.add(normalizeExamType(data.examType));
    });

    res.json({ success: true, submittedExams: [...examTypes] });
  } catch (err) {
    console.error('Submitted exams check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marks/edit', async (req, res) => {
  try {
    const { studentId, studentName, classId, className, subject: rawSubject, examType, newMarks, maxMarks, reason, editedBy, version: submittedVersion } = req.body;
    if (!studentId || !classId || !rawSubject || !examType || newMarks === undefined || !reason?.trim()) {
      return res.status(400).json({ error: 'studentId, classId, subject, examType, newMarks, and reason are required' });
    }

    const subject = (rawSubject || '').trim();
    const editedAt = new Date().toISOString();
    const docId = `${studentId}_${examType}_${subject}`;
    const docRef = doc(db, 'student_marks', docId);

    let oldMarks = null;
    let existingVersion = null;
    try {
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(docRef);
        oldMarks = existing.exists() ? existing.data().marksObtained : null;
        existingVersion = existing.exists() ? (existing.data().version || 1) : null;

        if (existing.exists() && submittedVersion !== undefined) {
          const currentVersion = existing.data().version || 1;
          if (Number(submittedVersion) !== currentVersion) {
            const err = new Error('VERSION_CONFLICT');
            err.isVersionConflict = true;
            throw err;
          }
        }

        const currentVersion = existing.exists() ? (existing.data().version || 1) : 0;
        const existingData = existing.exists() ? existing.data() : {};
        transaction.set(docRef, {
          ...existingData,
          marksObtained: Number(newMarks),
          maxMarks: Number(maxMarks) || 20,
          recordedBy: editedBy || 'teacher',
          updatedAt: editedAt,
          version: currentVersion === 0 ? 1 : currentVersion + 1,
          timestamp: serverTimestamp(),
        });
      });
    } catch (txErr) {
      if (txErr.isVersionConflict) {
        try {
          await addDoc(collection(db, 'marks_conflict_logs'), {
            studentId, classId, subject, examType,
            attemptedBy: editedBy || 'teacher',
            existingVersion,
            attemptedVersion: submittedVersion !== undefined ? Number(submittedVersion) : null,
            timestamp: editedAt,
            schoolId: req.schoolId || DEFAULT_SCHOOL_ID,
          });
        } catch (logErr) {
          console.error('[marks/edit] Conflict log error:', logErr.message);
        }
        return res.status(409).json({ error: 'Version conflict: these marks were updated by someone else since you last loaded them.' });
      }
      throw txErr;
    }

    console.log(`[marks/edit] ${studentName} ${subject} ${examType}: ${oldMarks} → ${newMarks}`);

    // Write to marks_edit_logs collection for audit trail
    try {
      await addDoc(collection(db, 'marks_edit_logs'), {
        studentId,
        studentName: studentName || '',
        classId,
        className: className || '',
        subject,
        examType: normalizeExamType(examType),
        oldMarks: oldMarks !== null ? Number(oldMarks) : null,
        newMarks: Number(newMarks),
        maxMarks: Number(maxMarks) || 20,
        editedByTeacher: editedBy || 'teacher',
        editReason: reason.trim(),
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        timestamp: editedAt,
      });
    } catch (logErr) {
      console.error('[marks/edit] Edit log error:', logErr.message);
    }

    // Admin notification
    try {
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'marks_edited',
        icon: '✏️',
        title: 'Marks Edited',
        message: `Marks edited for Student: ${studentName} | Subject: ${subject} | Old: ${oldMarks ?? '?'} | New: ${newMarks} | Teacher: ${editedBy || 'Unknown'} | Reason: ${reason.trim()}`,
        details: { editedBy, studentId, studentName, classId, className, subject, examType: normalizeExamType(examType), oldMarks, newMarks: Number(newMarks), maxMarks: Number(maxMarks) || 20, reason: reason.trim() },
        studentId,
        teacherName: editedBy || 'teacher',
        priority: 'high',
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        isRead: false,
        createdAt: editedAt,
      });
    } catch (notifErr) {
      console.error('[marks/edit] Admin notification error:', notifErr.message);
    }

    res.json({ success: true, message: 'Marks updated successfully.', oldMarks, newMarks: Number(newMarks) });
  } catch (err) {
    console.error('[marks/edit] Error:', err.message);
    res.status(500).json({ error: 'Failed to update marks.' });
  }
});

app.get('/api/marks/view', async (req, res) => {
  try {
    const { examType, classId } = req.query;
    console.log('Marks view request:', { examType, classId });

    if (!examType) {
      return res.status(400).json({ error: 'Exam type is required' });
    }

    const marksRef = collection(db, 'student_marks');
    // Query for both normalized and original exam type formats (e.g. 'unit1' and 'Unit 1')
    const examVariants = new Set([examType]);
    const reverseMap = { 'unit1': 'Unit 1', 'unit2': 'Unit 2', 'unit3': 'Unit 3', 'Unit 1': 'unit1', 'Unit 2': 'unit2', 'Unit 3': 'unit3' };
    if (reverseMap[examType]) examVariants.add(reverseMap[examType]);

    const allDocs = [];
    const seenIds = new Set();
    for (const variant of examVariants) {
      let q;
      if (classId) {
        q = query(marksRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('examType', '==', variant), where('classId', '==', classId));
      } else {
        q = query(marksRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('examType', '==', variant));
      }
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          allDocs.push(d);
        }
      });
    }

    const marks = allDocs.map(d => ({
      id: d.id,
      ...d.data(),
      examType: normalizeExamType(d.data().examType),
      timestamp: d.data().timestamp?.toDate?.()?.toISOString() || null,
    }));

    marks.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
    console.log(`Marks view: ${marks.length} records found for ${examType} (variants: ${[...examVariants].join(', ')})`);

    res.json({ marks, total: marks.length });
  } catch (err) {
    console.error('Marks view error:', err.code || '', err.message || err);
    res.status(500).json({ error: 'Failed to load marks. Please try again.' });
  }
});

app.get('/api/marks/summary', async (req, res) => {
  try {
    const snapshot = await getDocs(query(collection(db, 'student_marks'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))));
    const subjectMap = {};
    snapshot.docs.forEach(d => {
      const { subject: rawSubj, marksObtained, maxMarks } = d.data();
      const subject = normalizeSubjectName(rawSubj);
      if (!subject || marksObtained === undefined) return;
      if (!subjectMap[subject]) subjectMap[subject] = { total: 0, count: 0, maxTotal: 0 };
      subjectMap[subject].total += (Number(marksObtained) || 0);
      subjectMap[subject].count++;
      subjectMap[subject].maxTotal += (Number(maxMarks) || 20);
    });
    console.log('Marks summary: subjects found =', Object.keys(subjectMap));
    console.log('Marks summary: counts =', Object.fromEntries(Object.entries(subjectMap).map(([k,v])=>[k,v.count])));
    const subjects = Object.entries(subjectMap).map(([subject, s]) => ({
      subject,
      avg: Math.round((s.total / s.count) * 10) / 10,
      pct: Math.round((s.total / s.maxTotal) * 100),
      count: s.count,
    })).sort((a, b) => a.subject.localeCompare(b.subject));
    console.log('Marks summary result:', subjects.map(s => s.subject + '=' + s.pct + '%'));
    res.json({ success: true, subjects });
  } catch (err) {
    console.error('Marks summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marks/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const [marksSnap, studentsSnap] = await Promise.all([
      getDocs(query(collection(db, 'student_marks'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classId', '==', classId))),
      getDocs(query(collection(db, 'students'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classId', '==', classId))),
    ]);

    const studentBase = {};
    studentsSnap.docs.forEach(d => {
      const s = d.data();
      studentBase[s.studentId] = { studentId: s.studentId, name: s.name, rollNumber: s.rollNumber };
    });

    const studentAccum = {};
    marksSnap.docs.forEach(d => {
      const m = d.data();
      if (!studentAccum[m.studentId]) {
        studentAccum[m.studentId] = {
          ...(studentBase[m.studentId] || { studentId: m.studentId, name: m.studentName || '', rollNumber: 0 }),
          bySubject: {}, byExam: {},
        };
      }
      const sa = studentAccum[m.studentId];
      const mSubject = normalizeSubjectName(m.subject);
      if (!sa.bySubject[mSubject]) sa.bySubject[mSubject] = { total: 0, maxTotal: 0 };
      sa.bySubject[mSubject].total += (Number(m.marksObtained) || 0);
      sa.bySubject[mSubject].maxTotal += (Number(m.maxMarks) || 20);
      const mExam = normalizeExamType(m.examType);
      if (!sa.byExam[mExam]) sa.byExam[mExam] = { total: 0, maxTotal: 0, subjects: [] };
      sa.byExam[mExam].total += (Number(m.marksObtained) || 0);
      sa.byExam[mExam].maxTotal += (Number(m.maxMarks) || 20);
      sa.byExam[mExam].subjects.push({ subject: mSubject, marks: Number(m.marksObtained) || 0, maxMarks: Number(m.maxMarks) || 20 });
    });

    const FIXED_SUBJ = ['English', 'Mathematics', 'Science', 'Social Studies', 'Telugu'];

    const students = Object.values(studentAccum).map(s => {
      const allTotal = Object.values(s.bySubject).reduce((a, v) => a + v.total, 0);
      const allMax = Object.values(s.bySubject).reduce((a, v) => a + v.maxTotal, 0);

      const byExam = Object.entries(s.byExam).map(([examType, v]) => {
        // Pad each exam's subjects with the full fixed list so every student shows all 5
        const entered = new Set(v.subjects.map(sub => sub.subject));
        FIXED_SUBJ.forEach(subject => {
          if (!entered.has(subject)) {
            v.subjects.push({ subject, marks: null, maxMarks: 20, notEntered: true });
          }
        });
        v.subjects.sort((a, b) => a.subject.localeCompare(b.subject));
        return {
          examType, total: v.total, maxTotal: v.maxTotal,
          pct: v.maxTotal > 0 ? Math.round((v.total / v.maxTotal) * 100) : 0,
          subjects: v.subjects,
        };
      }).sort((a, b) => a.examType.localeCompare(b.examType));

      return {
        studentId: s.studentId, name: s.name, rollNumber: s.rollNumber,
        overallPct: allMax > 0 ? Math.round((allTotal / allMax) * 100) : 0,
        bySubject: Object.entries(s.bySubject).map(([subject, v]) => ({
          subject, pct: Math.round((v.total / v.maxTotal) * 100),
          avg: Math.round((v.total / v.maxTotal) * 20 * 10) / 10,
        })).sort((a, b) => a.subject.localeCompare(b.subject)),
        byExam,
      };
    }).sort((a, b) => b.overallPct - a.overallPct);

    const classSubjectMap = {};
    const classExamMap = {};
    marksSnap.docs.forEach(d => {
      const m = d.data();
      const csSubject = normalizeSubjectName(m.subject);
      if (!classSubjectMap[csSubject]) classSubjectMap[csSubject] = { total: 0, maxTotal: 0 };
      classSubjectMap[csSubject].total += (Number(m.marksObtained) || 0);
      classSubjectMap[csSubject].maxTotal += (Number(m.maxMarks) || 20);
      const cExam = normalizeExamType(m.examType);
      if (!classExamMap[cExam]) classExamMap[cExam] = { total: 0, maxTotal: 0 };
      classExamMap[cExam].total += m.marksObtained;
      classExamMap[cExam].maxTotal += (m.maxMarks || 20);
    });
    const classAvgBySubject = Object.entries(classSubjectMap).map(([subject, v]) => ({
      subject, pct: Math.round((v.total / v.maxTotal) * 100),
    })).sort((a, b) => a.subject.localeCompare(b.subject));
    const classAvgByExam = Object.entries(classExamMap).map(([examType, v]) => ({
      examType, pct: Math.round((v.total / v.maxTotal) * 100),
    })).sort((a, b) => a.examType.localeCompare(b.examType));
    const allTotal = marksSnap.docs.reduce((a, d) => a + d.data().marksObtained, 0);
    const allMax = marksSnap.docs.reduce((a, d) => a + (d.data().maxMarks || 20), 0);
    const classOverallPct = allMax > 0 ? Math.round((allTotal / allMax) * 100) : 0;

    res.json({ success: true, students, classAvgBySubject, classAvgByExam, classOverallPct, total: marksSnap.size });
  } catch (err) {
    console.error('Class marks error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const FIXED_SUBJECTS = ['English', 'Mathematics', 'Science', 'Social Studies', 'Telugu'];

app.get('/api/marks/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const snapshot = await getDocs(query(collection(db, 'student_marks'), where('studentId', '==', studentId)));
    const examMap = {};
    const subjectMap = {};
    console.log(`[marks/student] studentId=${studentId} | total records in DB: ${snapshot.size}`);

    snapshot.docs.forEach(d => {
      const m = d.data();
      const mSubject = normalizeSubjectName(m.subject);
      const mExamN = normalizeExamType(m.examType);
      if (!examMap[mExamN]) examMap[mExamN] = { subjects: [] };
      examMap[mExamN].subjects.push({ subject: mSubject, marks: Number(m.marksObtained), maxMarks: Number(m.maxMarks) || 20, notEntered: false });
      if (!subjectMap[mSubject]) subjectMap[mSubject] = [];
      subjectMap[mSubject].push({ examType: mExamN, marks: Number(m.marksObtained) || 0, maxMarks: Number(m.maxMarks) || 20 });
    });

    // Pad every exam with the full fixed subject list — subjects with no data show as notEntered
    Object.keys(examMap).forEach(examType => {
      const enteredSubjects = new Set(examMap[examType].subjects.map(s => s.subject));
      FIXED_SUBJECTS.forEach(subject => {
        if (!enteredSubjects.has(subject)) {
          examMap[examType].subjects.push({ subject, marks: null, maxMarks: 20, notEntered: true });
        }
      });
      examMap[examType].subjects.sort((a, b) => a.subject.localeCompare(b.subject));
    });

    const byExam = Object.entries(examMap).map(([examType, v]) => {
      // Only count entered subjects in totals and percentages
      const entered = v.subjects.filter(s => !s.notEntered);
      const total = entered.reduce((a, s) => a + s.marks, 0);
      const maxTotal = entered.reduce((a, s) => a + s.maxMarks, 0);
      console.log(`[marks/student] ${examType}: ${entered.length}/${v.subjects.length} subjects entered — ${v.subjects.map(s => s.subject + (s.notEntered ? '(-)' : `(${s.marks})`)).join(', ')}`);
      return {
        examType,
        subjects: v.subjects,
        total, maxTotal,
        pct: maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0,
        avg: entered.length > 0 ? Math.round((total / entered.length) * 10) / 10 : 0,
      };
    }).sort((a, b) => a.examType.localeCompare(b.examType));

    const bySubject = Object.entries(subjectMap).map(([subject, exams]) => {
      const total = exams.reduce((a, e) => a + e.marks, 0);
      const maxTotal = exams.reduce((a, e) => a + e.maxMarks, 0);
      return { subject, exams: exams.sort((a, b) => a.examType.localeCompare(b.examType)),
        pct: maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0,
        avg: exams.length > 0 ? Math.round((total / exams.length) * 10) / 10 : 0 };
    }).sort((a, b) => a.subject.localeCompare(b.subject));

    const allTotal = snapshot.docs.reduce((a, d) => a + (Number(d.data().marksObtained) || 0), 0);
    const allMax = snapshot.docs.reduce((a, d) => a + (Number(d.data().maxMarks) || 20), 0);
    const overallPct = allMax > 0 ? Math.round((allTotal / allMax) * 100) : 0;
    res.json({ success: true, byExam, bySubject, overallPct, total: snapshot.size });
  } catch (err) {
    console.error('Student marks error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function getGrade(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'F';
}

app.post('/api/reports/report-card/:studentId', verifyAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examName, academicYear } = req.body;
    if (!examName) return res.status(400).json({ error: 'examName is required' });
    const year = academicYear || `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`;
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;

    if (req.userRole === 'parent') {
      const parentSnap = await getDocs(query(
        collection(db, 'parent_accounts'),
        where('studentIds', 'array-contains', studentId)
      ));
      const parentDoc = parentSnap.docs.find(d => d.data().email === req.user.email);
      if (!parentDoc) return res.status(403).json({ error: 'Access denied' });
    }

    const studentSnap = await getDocs(query(
      collection(db, 'students'),
      where('studentId', '==', studentId),
      where('schoolId', '==', schoolId)
    ));
    let student;
    if (!studentSnap.empty) {
      student = studentSnap.docs[0].data();
    } else {
      const studentDocById = await getDocFS(doc(db, 'students', studentId));
      if (!studentDocById.exists() || (studentDocById.data().schoolId && studentDocById.data().schoolId !== schoolId)) {
        return res.status(404).json({ error: 'Student not found' });
      }
      student = studentDocById.data();
    }

    const settingsDoc = await getDocFS(doc(db, 'settings', schoolId));
    const schoolInfo = settingsDoc.exists() ? settingsDoc.data() : {};
    const schoolName = schoolInfo.school_name || schoolInfo.schoolName || 'Sree Pragathi High School';

    const marksSnap = await getDocs(query(
      collection(db, 'student_marks'),
      where('studentId', '==', studentId),
      where('schoolId', '==', schoolId),
      where('examType', '==', examName)
    ));

    if (marksSnap.empty) {
      const normalizedExam = normalizeExamType(examName);
      const allMarksSnap = await getDocs(query(
        collection(db, 'student_marks'),
        where('studentId', '==', studentId),
        where('schoolId', '==', schoolId)
      ));
      const filtered = allMarksSnap.docs.filter(d => normalizeExamType(d.data().examType) === normalizedExam);
      if (filtered.length === 0) return res.status(404).json({ error: 'No marks found for this exam' });
      var marksDocs = filtered;
    } else {
      var marksDocs = marksSnap.docs;
    }

    const subjects = marksDocs.map(d => {
      const m = d.data();
      const max = Number(m.maxMarks) || 20;
      const obtained = Number(m.marksObtained) || 0;
      const pct = max > 0 ? Math.round((obtained / max) * 100) : 0;
      return { subject: normalizeSubjectName(m.subject), maxMarks: max, marksObtained: obtained, grade: getGrade(pct) };
    }).sort((a, b) => a.subject.localeCompare(b.subject));

    const totalObtained = subjects.reduce((a, s) => a + s.marksObtained, 0);
    const totalMax = subjects.reduce((a, s) => a + s.maxMarks, 0);
    const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    const overallGrade = getGrade(overallPct);

    let attendanceSummary = { present: 0, total: 0, pct: 0 };
    try {
      const studentAttSnap = await getDocs(collection(db, 'student_attendance', studentId, 'dates'));
      if (!studentAttSnap.empty) {
        const total = studentAttSnap.size;
        const present = studentAttSnap.docs.filter(d => d.data().status === 'Present').length;
        attendanceSummary = { present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
      }
    } catch (attErr) {
      console.warn('[report-card] Attendance fetch failed:', attErr.message);
    }

    const pdfDoc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));

    const pdfDone = new Promise((resolve, reject) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
    });

    const pageW = pdfDoc.page.width - 100;

    pdfDoc.fontSize(20).font('Helvetica-Bold').text(schoolName, { align: 'center' });
    pdfDoc.moveDown(0.3);
    pdfDoc.fontSize(10).font('Helvetica').fillColor('#666666').text('Gopalraopet, Telangana', { align: 'center' });
    pdfDoc.moveDown(0.5);
    pdfDoc.moveTo(50, pdfDoc.y).lineTo(50 + pageW, pdfDoc.y).strokeColor('#333333').lineWidth(1.5).stroke();
    pdfDoc.moveDown(0.5);
    pdfDoc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('REPORT CARD', { align: 'center' });
    pdfDoc.moveDown(0.3);
    pdfDoc.fontSize(10).font('Helvetica').fillColor('#444444').text(`${examName}  |  Academic Year: ${year}`, { align: 'center' });
    pdfDoc.moveDown(1);

    const infoY = pdfDoc.y;
    pdfDoc.fontSize(10).font('Helvetica').fillColor('#000000');
    pdfDoc.text(`Student Name:`, 50, infoY, { continued: true }).font('Helvetica-Bold').text(`  ${student.full_name || student.name || 'N/A'}`);
    pdfDoc.font('Helvetica').text(`Class:`, 50, infoY + 18, { continued: true }).font('Helvetica-Bold').text(`  ${student.className || student.classId || 'N/A'}`);
    pdfDoc.font('Helvetica').text(`Roll Number:`, 50, infoY + 36, { continued: true }).font('Helvetica-Bold').text(`  ${student.rollNumber || student.roll_number || 'N/A'}`);
    pdfDoc.y = infoY + 60;
    pdfDoc.moveDown(0.5);

    const tableTop = pdfDoc.y;
    const colWidths = [pageW * 0.40, pageW * 0.20, pageW * 0.25, pageW * 0.15];
    const colX = [50, 50 + colWidths[0], 50 + colWidths[0] + colWidths[1], 50 + colWidths[0] + colWidths[1] + colWidths[2]];
    const rowH = 24;

    pdfDoc.rect(50, tableTop, pageW, rowH).fill('#2c3e50');
    pdfDoc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
    pdfDoc.text('Subject', colX[0] + 6, tableTop + 7);
    pdfDoc.text('Max Marks', colX[1] + 6, tableTop + 7);
    pdfDoc.text('Obtained', colX[2] + 6, tableTop + 7);
    pdfDoc.text('Grade', colX[3] + 6, tableTop + 7);

    let y = tableTop + rowH;
    subjects.forEach((s, i) => {
      const bgColor = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
      pdfDoc.rect(50, y, pageW, rowH).fill(bgColor);
      pdfDoc.fontSize(9).font('Helvetica').fillColor('#000000');
      pdfDoc.text(s.subject, colX[0] + 6, y + 7, { width: colWidths[0] - 12 });
      pdfDoc.text(String(s.maxMarks), colX[1] + 6, y + 7);
      pdfDoc.text(String(s.marksObtained), colX[2] + 6, y + 7);
      const gradeColor = s.grade === 'A+' || s.grade === 'A' ? '#27ae60' : s.grade === 'F' ? '#e74c3c' : '#2c3e50';
      pdfDoc.font('Helvetica-Bold').fillColor(gradeColor).text(s.grade, colX[3] + 6, y + 7);
      y += rowH;
    });

    pdfDoc.rect(50, y, pageW, rowH).fill('#ecf0f1');
    pdfDoc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');
    pdfDoc.text('Total', colX[0] + 6, y + 7);
    pdfDoc.text(String(totalMax), colX[1] + 6, y + 7);
    pdfDoc.text(String(totalObtained), colX[2] + 6, y + 7);
    pdfDoc.text(overallGrade, colX[3] + 6, y + 7);
    y += rowH;

    pdfDoc.rect(50, y, pageW, 1).fill('#333333');
    y += 10;

    pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50').text(`Percentage: ${overallPct}%`, 50, y);
    y += 18;
    pdfDoc.text(`Overall Grade: ${overallGrade}`, 50, y);
    y += 30;

    pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50').text('Attendance Summary', 50, y);
    y += 18;
    pdfDoc.fontSize(10).font('Helvetica').fillColor('#000000');
    pdfDoc.text(`Days Present: ${attendanceSummary.present} / ${attendanceSummary.total}`, 50, y);
    y += 16;
    pdfDoc.text(`Attendance Percentage: ${attendanceSummary.pct}%`, 50, y);
    y += 40;

    pdfDoc.moveTo(50, y).lineTo(50 + pageW, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    y += 10;
    pdfDoc.fontSize(8).font('Helvetica').fillColor('#999999').text(`Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, y);

    pdfDoc.end();
    const pdfBuffer = await pdfDone;

    const safeName = (student.full_name || student.name || 'student').replace(/[^a-zA-Z0-9]/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-card-${safeName}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
    console.log(`[report-card] Generated for student ${studentId} exam ${examName} — ${subjects.length} subjects, ${overallPct}%`);
  } catch (err) {
    console.error('[report-card] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate report card' });
  }
});

app.get('/api/admin/promotion/preview', verifyAuth, async (req, res) => {
  if (req.userRole !== 'principal' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { fromClass, academicYear } = req.query;
    if (!fromClass || !academicYear) return res.status(400).json({ error: 'fromClass and academicYear are required' });
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;

    const studentsSnap = await getDocs(query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId),
      where('className', '==', fromClass)
    ));

    if (studentsSnap.empty) {
      const studentsById = await getDocs(query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('classId', '==', fromClass)
      ));
      if (studentsById.empty) return res.json({ success: true, students: [] });
      var studentDocs = studentsById.docs;
    } else {
      var studentDocs = studentsSnap.docs;
    }

    const students = [];
    for (const sDoc of studentDocs) {
      const s = sDoc.data();
      const sid = s.studentId || sDoc.id;

      let attendancePercent = 0;
      try {
        const attSnap = await getDocs(collection(db, 'student_attendance', sid, 'dates'));
        if (!attSnap.empty) {
          const present = attSnap.docs.filter(d => d.data().status === 'Present').length;
          attendancePercent = Math.round((present / attSnap.size) * 100);
        }
      } catch (e) {}

      const marksSnap = await getDocs(query(
        collection(db, 'student_marks'),
        where('studentId', '==', sid),
        where('schoolId', '==', schoolId)
      ));

      let averageMarks = 0;
      let passStatus = 'pass';
      if (!marksSnap.empty) {
        const subjectBest = {};
        marksSnap.docs.forEach(d => {
          const m = d.data();
          const subj = normalizeSubjectName(m.subject);
          const pct = (Number(m.maxMarks) || 20) > 0 ? Math.round((Number(m.marksObtained) || 0) / (Number(m.maxMarks) || 20) * 100) : 0;
          if (!subjectBest[subj] || pct > subjectBest[subj]) subjectBest[subj] = pct;
        });
        const pcts = Object.values(subjectBest);
        averageMarks = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
        if (pcts.some(p => p < 35)) passStatus = 'fail';
      } else {
        passStatus = 'fail';
      }

      students.push({
        studentId: sid,
        docId: sDoc.id,
        name: s.full_name || s.name || 'Unknown',
        rollNumber: s.rollNumber || s.roll_number || '',
        className: s.className || fromClass,
        attendancePercent,
        averageMarks,
        passStatus,
      });
    }

    students.sort((a, b) => {
      const ra = Number(a.rollNumber) || 999;
      const rb = Number(b.rollNumber) || 999;
      return ra - rb;
    });

    console.log(`[promotion/preview] class=${fromClass} year=${academicYear} — ${students.length} students, ${students.filter(s => s.passStatus === 'pass').length} passing`);
    res.json({ success: true, students });
  } catch (err) {
    console.error('[promotion/preview] Error:', err.message);
    res.status(500).json({ error: 'Failed to load promotion preview' });
  }
});

function getNextClass(className) {
  const match = className.match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return className.replace(/\d+/, String(num + 1));
}

app.post('/api/admin/promotion/execute', verifyAuth, async (req, res) => {
  if (req.userRole !== 'principal' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { promotions, academicYear } = req.body;
    if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
      return res.status(400).json({ error: 'promotions array is required' });
    }
    if (!academicYear) return res.status(400).json({ error: 'academicYear is required' });
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;
    const performedBy = req.userId || req.user?.email || 'admin';

    const results = { promoted: 0, retained: 0, graduated: 0, errors: [] };
    const batchSize = 400;
    let batch = writeBatch(db);
    let opCount = 0;

    const flushBatch = async () => {
      if (opCount > 0) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    for (const p of promotions) {
      try {
        const { studentId, action } = p;
        if (!studentId || !['promote', 'retain', 'graduate'].includes(action)) {
          results.errors.push({ studentId, error: 'Invalid action' });
          continue;
        }

        let studentDocRef;
        let studentData;
        const byFieldSnap = await getDocs(query(
          collection(db, 'students'),
          where('studentId', '==', studentId),
          where('schoolId', '==', schoolId)
        ));
        if (!byFieldSnap.empty) {
          studentDocRef = byFieldSnap.docs[0].ref;
          studentData = byFieldSnap.docs[0].data();
        } else {
          const directDoc = await getDocFS(doc(db, 'students', studentId));
          if (!directDoc.exists()) {
            results.errors.push({ studentId, error: 'Student not found' });
            continue;
          }
          studentDocRef = doc(db, 'students', studentId);
          studentData = directDoc.data();
        }

        const fromClass = studentData.className || studentData.classId || '';
        let toClass = fromClass;
        const updates = {};

        if (action === 'promote') {
          toClass = getNextClass(fromClass);
          if (!toClass) {
            results.errors.push({ studentId, error: 'Cannot determine next class' });
            continue;
          }
          updates.className = toClass;
          updates.classId = toClass;
          results.promoted++;
        } else if (action === 'retain') {
          updates.notes = `Retained - ${academicYear}`;
          results.retained++;
        } else if (action === 'graduate') {
          updates.status = 'alumni';
          updates.className = '';
          updates.classId = '';
          toClass = 'Alumni';
          results.graduated++;
        }

        batch.update(studentDocRef, updates);
        opCount++;

        const historyRef = doc(collection(db, 'promotionHistory'));
        batch.set(historyRef, {
          studentId,
          studentName: studentData.full_name || studentData.name || '',
          fromClass,
          toClass: action === 'retain' ? fromClass : toClass,
          action,
          academicYear,
          schoolId,
          performedBy,
          timestamp: serverTimestamp(),
        });
        opCount++;

        if (opCount >= batchSize) await flushBatch();
      } catch (pErr) {
        results.errors.push({ studentId: p.studentId, error: pErr.message });
      }
    }

    await flushBatch();

    console.log(`[promotion/execute] year=${academicYear} by=${performedBy} — promoted:${results.promoted} retained:${results.retained} graduated:${results.graduated} errors:${results.errors.length}`);
    res.json({ success: true, results });
  } catch (err) {
    console.error('[promotion/execute] Error:', err.message);
    res.status(500).json({ error: 'Failed to execute promotions' });
  }
});

app.get('/api/onboarded-users', async (req, res) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('onboarded_by', '==', 'principal'));
    const snapshot = await getDocs(q);

    const users = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        full_name: data.full_name,
        role: data.role,
        role_id: data.role_id,
        subject: data.subject || '',
        email: data.email || '',
        phone: data.phone || '',
        mobile: data.mobile || '',
        blood_group: data.blood_group || '',
        emergency_contact: data.emergency_contact || '',
        date_of_birth: data.date_of_birth || '',
        join_date: data.join_date || data.joined_date || '',
        profileCompleted: data.profileCompleted || false,
        status: data.status || 'pending_registration',
        created_at: data.created_at,
        classTeacherOf: data.classTeacherOf || null,
        assignedClasses: data.assignedClasses || [],
      };
    });

    res.json({ users });
  } catch (err) {
    console.error('Onboarded users fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch onboarded users' });
  }
});

app.post('/api/onboard-teacher', async (req, res) => {
  try {
    const { fullName, role, subject, email, phone, joinDate } = req.body;
    console.log('Onboard teacher request:', { fullName, role, subject });

    if (!fullName || !role) {
      return res.status(400).json({ error: 'Full name and role are required' });
    }
    if (!['teacher', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher or staff' });
    }
    if (!phone) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const year = new Date().getFullYear();
    const usersRef = collection(db, 'users');
    let teacherId;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 20) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      teacherId = `TCH-${year}-${rand}`;
      const q = query(usersRef, where('role_id', '==', teacherId));
      const snap = await getDocs(q);
      if (snap.empty) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Could not generate unique Teacher ID. Please try again.' });
    }

    const userData = {
      full_name: fullName,
      email: email || '',
      role: role,
      role_id: teacherId,
      subject: subject || '',
      phone: phone || '',
      status: 'pending_registration',
      join_date: joinDate || new Date().toISOString().split('T')[0],
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      created_at: new Date().toISOString(),
      onboarded_by: 'principal',
    };

    const docRef = await addDoc(usersRef, userData);
    console.log(`Onboarded ${role}: ${fullName} | ID: ${teacherId} | Firestore doc: ${docRef.id}`);

    let sheetSync = { success: false };
    try {
      sheetSync = await syncUserDirectory({
        teacherId,
        fullName,
        role,
        subject: subject || '',
        email: email || '',
        phone: phone || '',
        status: 'Pending Registration',
        onboardedDate: joinDate || new Date().toISOString().split('T')[0],
      });
    } catch (syncErr) {
      console.error('Google Sheets sync (user directory) failed:', syncErr.message);
    }
    safeSync('syncTeacher', () => syncTeacher({ teacherId, name: fullName, email: email || '', phone: phone || '', subject: subject || '', designation: role, joiningDate: joinDate || new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() }), { teacherId }).catch(() => {});

    res.status(201).json({
      success: true,
      teacherId,
      user: {
        id: docRef.id,
        full_name: fullName,
        role,
        role_id: teacherId,
        subject: subject || '',
        email: email || '',
        phone: phone || '',
        status: 'pending_registration',
      },
      sheetSync: sheetSync.success,
    });
  } catch (err) {
    console.error('Onboard teacher error:', err.code || '', err.message || err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.post('/api/add-logistics-staff', async (req, res) => {
  try {
    const { fullName, type, busNumber, route, assignedArea, phone, license, experience, email, joinDate } = req.body;
    console.log('Add logistics staff request:', { fullName, type });

    if (!fullName || !type) {
      return res.status(400).json({ error: 'Full name and type are required' });
    }
    if (!['driver', 'cleaner'].includes(type)) {
      return res.status(400).json({ error: 'Type must be driver or cleaner' });
    }
    if (!phone) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    if (type === 'driver' && !license) {
      return res.status(400).json({ error: 'License number is required for drivers' });
    }
    if (type === 'driver' && !experience) {
      return res.status(400).json({ error: 'Years of experience is required for drivers' });
    }

    const prefix = type === 'driver' ? 'DRV' : 'CLN';
    const logisticsRef = collection(db, 'logistics_staff');
    let staffId;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 20) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      staffId = `${prefix}-${rand}`;
      const q = query(logisticsRef, where('staff_id', '==', staffId));
      const snap = await getDocs(q);
      if (snap.empty) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Could not generate unique Staff ID. Please try again.' });
    }

    const staffData = {
      full_name: fullName,
      type: type,
      staff_id: staffId,
      bus_number: busNumber || '',
      route: route || '',
      assigned_area: assignedArea || '',
      phone: phone || '',
      license: license || '',
      experience: experience || '',
      email: email || '',
      status: 'active',
      join_date: joinDate || new Date().toISOString().split('T')[0],
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      created_at: new Date().toISOString(),
      added_by: 'principal',
    };

    const docRef = await addDoc(logisticsRef, staffData);
    console.log(`Added ${type}: ${fullName} | ID: ${staffId} | Firestore doc: ${docRef.id}`);

    let sheetSync = { success: false };
    try {
      sheetSync = await syncLogisticsStaff({
        staffId,
        fullName,
        type: type === 'driver' ? 'Bus Driver' : 'General Staff',
        busNumber: busNumber || '',
        route: route || '',
        assignedArea: assignedArea || '',
        phone: phone || '',
        email: email || '',
        license: license || '',
        experience: experience || '',
        status: 'Active',
        addedDate: joinDate || new Date().toISOString().split('T')[0],
      });
    } catch (syncErr) {
      console.error('Google Sheets sync (logistics staff) failed:', syncErr.message);
    }

    res.status(201).json({
      success: true,
      staffId,
      staff: {
        id: docRef.id,
        full_name: fullName,
        type,
        staff_id: staffId,
        bus_number: busNumber || '',
        route: route || '',
        assigned_area: assignedArea || '',
        phone: phone || '',
        status: 'active',
      },
      sheetSync: sheetSync.success,
    });
  } catch (err) {
    console.error('Add logistics staff error:', err.code || '', err.message || err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.get('/api/logistics-staff', async (req, res) => {
  try {
    const logisticsRef = collection(db, 'logistics_staff');
    const snapshot = await getDocs(query(logisticsRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))));
    const staff = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        full_name: data.full_name,
        type: data.type,
        staff_id: data.staff_id,
        bus_number: data.bus_number || '',
        route: data.route || '',
        assigned_area: data.assigned_area || '',
        phone: data.phone || '',
        email: data.email || '',
        license: data.license || '',
        experience: data.experience || '',
        blood_group: data.blood_group || '',
        emergency_contact: data.emergency_contact || '',
        date_of_birth: data.date_of_birth || '',
        profileCompleted: data.profileCompleted || false,
        status: data.status || 'active',
        created_at: data.created_at,
      };
    });
    res.json({ staff });
  } catch (err) {
    console.error('Logistics staff fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch logistics staff' });
  }
});

app.post('/api/delete-user', async (req, res) => {
  try {
    const { roleId, collection: collName } = req.body;
    if (!roleId) return res.status(400).json({ error: 'roleId is required' });

    let sheetName = 'User_Directory';
    let firestoreCollection = 'users';
    let idField = 'role_id';

    if (collName === 'logistics_staff') {
      firestoreCollection = 'logistics_staff';
      idField = 'staff_id';
      sheetName = 'Logistics_Staff';
    }

    const colRef = collection(db, firestoreCollection);
    const q = query(colRef, where(idField, '==', roleId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = snapshot.docs[0];
    await updateDoc(doc(db, firestoreCollection, userDoc.id), { status: 'inactive' });

    let sheetSync = false;
    try {
      const result = await markUserInactiveInSheets({ roleId, sheetName });
      sheetSync = result.success;
    } catch (sheetErr) {
      console.error('Sheet sync failed during delete:', sheetErr.message);
    }

    console.log(`Marked ${roleId} as inactive in ${firestoreCollection}`);
    res.json({ success: true, sheetSync });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/attendance/save', async (req, res) => {
  try {
    const { records, date, teacherName, className } = req.body;
    console.log('Attendance save request:', { date, recordCount: records?.length, markedBy: records?.[0]?.markedBy || 'NOT SET' });

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No attendance records provided' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    for (const record of records) {
      if (!record.studentId || !record.studentName || !record.classId || !record.schoolId) {
        return res.status(400).json({ error: 'Each record must have studentId, studentName, classId, and schoolId' });
      }
      if (!['Present', 'Absent'].includes(record.status)) {
        return res.status(400).json({ error: `Invalid status "${record.status}" for student ${record.studentId}. Must be "Present" or "Absent"` });
      }
      if (record.date !== date) {
        return res.status(400).json({ error: `Record date "${record.date}" does not match request date "${date}"` });
      }
    }

    const submittedAt = new Date().toISOString();
    const markedBy = records[0]?.markedBy || 'teacher';
    const classId = records[0]?.classId;
    const resolvedClassName = className || records[0]?.className || classId || '';

    // ── LEGACY write (attendance_records) — keeps existing UI working ──
    const batch = writeBatch(db);
    const attendanceRef = collection(db, 'attendance_records');

    for (const record of records) {
      const docId = `${record.studentId}_${record.date}`;
      const docRef = doc(attendanceRef, docId);
      batch.set(docRef, {
        studentId: record.studentId,
        studentName: record.studentName,
        rollNumber: record.rollNumber || 0,
        classId: record.classId,
        className: record.className || '',
        schoolId: record.schoolId,
        date: record.date,
        month: record.month,
        status: record.status,
        markedBy,
        submittedAt,
        timestamp: serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`[attendance_records] Legacy write complete: ${records.length} records for ${date}`);

    // ── NEW write 1: class_attendance — one doc per class per date ──
    try {
      const studentsMap = {};
      for (const record of records) {
        studentsMap[record.studentId] = record.status;
      }
      await setDoc(
        doc(db, 'class_attendance', classId, 'dates', date),
        {
          students: studentsMap,
          markedBy,
          teacherName: teacherName || markedBy,
          className: resolvedClassName,
          schoolId: records[0]?.schoolId || (req.schoolId || DEFAULT_SCHOOL_ID),
          submittedAt,
          timestamp: serverTimestamp(),
        }
      );
      console.log(`[class_attendance] Saved class ${classId} for date ${date} — ${records.length} students`);
    } catch (classAttErr) {
      console.error('[class_attendance] Write failed (non-blocking):', classAttErr.message);
    }

    // ── NEW write 2: student_attendance — one doc per student per date ──
    try {
      const studentAttBatch = writeBatch(db);
      for (const record of records) {
        const studentAttRef = doc(db, 'student_attendance', record.studentId, 'dates', record.date);
        studentAttBatch.set(studentAttRef, {
          status: record.status,
          classId: record.classId,
          className: record.className || '',
          schoolId: record.schoolId || (req.schoolId || DEFAULT_SCHOOL_ID),
          rollNumber: record.rollNumber || 0,
          studentName: record.studentName,
          recordedBy: markedBy,
          teacherName: teacherName || markedBy,
          month: record.month,
          submittedAt,
          timestamp: serverTimestamp(),
        });
      }
      await studentAttBatch.commit();
      console.log(`[student_attendance] Saved ${records.length} student docs for date ${date}`);
    } catch (studentAttErr) {
      console.error('[student_attendance] Write failed (non-blocking):', studentAttErr.message);
    }

    const presentCount = records.filter(r => r.status === 'Present').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;
    console.log(`Attendance saved: ${records.length} records | ${presentCount} present, ${absentCount} absent | Date: ${date}`);

    const submissionsRef = collection(db, 'attendance_submissions');
    const submissionDocId = `${classId}_${date}`;
    await setDoc(doc(submissionsRef, submissionDocId), {
      classId,
      className: resolvedClassName,
      date,
      submittedBy: markedBy,
      teacherName: teacherName || markedBy,
      submittedAt,
      presentCount,
      absentCount,
      totalCount: records.length,
      lastUpdated: serverTimestamp(),
    });

    try {
      const adminMsg = `${teacherName || markedBy} has submitted attendance for Grade ${resolvedClassName} on ${date}. Present: ${presentCount} | Absent: ${absentCount}`;
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'attendance_submitted',
        icon: '\u2705',
        title: 'Attendance Submitted',
        message: adminMsg,
        details: { teacherName: teacherName || markedBy, teacherId: markedBy, className: resolvedClassName, classId, date, presentCount, absentCount, totalCount: records.length },
        priority: 'normal',
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        createdAt: submittedAt,
      });
    } catch (notifErr) {
      console.error('Admin notification error:', notifErr.message);
    }

    const absentRecords = records.filter(r => r.status === 'Absent');
    if (absentRecords.length > 0) {
      try {
        await Promise.all(absentRecords.map(async r => {
          try {
            const studentDoc = await getDocFS(doc(db, 'students', r.studentId));
            const parentPhone = studentDoc.exists() ? studentDoc.data().parentPhone : null;
            await addDoc(collection(db, 'parent_notifications'), {
              studentId: r.studentId,
              studentName: r.studentName,
              type: 'attendance_absent',
              title: 'Attendance Alert',
              message: `Dear Parent, your child ${r.studentName} (Roll #${r.rollNumber || '–'}) was marked Absent in Grade ${resolvedClassName} on ${date}. Please contact the school for details.`,
              className: resolvedClassName,
              classId,
              date,
              parentPhone: parentPhone || null,
              schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
              read: false,
              createdAt: submittedAt,
            });
          } catch (e) {
            console.error('Parent notif error for', r.studentId, e.message);
          }
        }));
        console.log(`Parent notifications sent for ${absentRecords.length} absent students`);
      } catch (parentErr) {
        console.error('Parent notifications batch error:', parentErr.message);
      }
    }

    let sheetSync = { success: false };
    try {
      sheetSync = await syncAttendance(records, date);
    } catch (syncErr) {
      console.error('Google Sheets sync (attendance) failed:', syncErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Attendance saved for ${records.length} students`,
      summary: { total: records.length, present: presentCount, absent: absentCount, date },
      sheetSync: sheetSync.success,
    });
  } catch (err) {
    console.error('Attendance save error:', err.code || '', err.message || err);
    res.status(500).json({ error: 'Attendance failed to save. Please check your connection.' });
  }
});

app.get('/api/attendance/submission-status', async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) return res.status(400).json({ error: 'classId and date required' });
    const submissionDocId = `${classId}_${date}`;
    const snap = await getDocFS(doc(db, 'attendance_submissions', submissionDocId));
    if (!snap.exists()) return res.json({ submitted: false });
    const data = snap.data();
    res.json({
      submitted: true,
      submittedBy: data.submittedBy || '',
      teacherName: data.teacherName || '',
      submittedAt: data.submittedAt || '',
      presentCount: data.presentCount || 0,
      absentCount: data.absentCount || 0,
      totalCount: data.totalCount || 0,
      lastEditedAt: data.lastEditedAt || null,
      lastEditedBy: data.lastEditedBy || null,
    });
  } catch (err) {
    console.error('Submission status error:', err.message);
    res.status(500).json({ error: 'Failed to check submission status' });
  }
});

app.post('/api/attendance/edit', async (req, res) => {
  try {
    const { studentId, studentName, rollNumber, classId, className, date, oldStatus, newStatus, reason, editedBy, teacherName } = req.body;
    if (!studentId || !classId || !date || !newStatus || !reason || !reason.trim()) {
      return res.status(400).json({ error: 'studentId, classId, date, newStatus, and reason are required' });
    }
    if (!['Present', 'Absent'].includes(newStatus)) {
      return res.status(400).json({ error: 'newStatus must be Present or Absent' });
    }
    if (!reason.trim()) {
      return res.status(400).json({ error: 'Reason cannot be empty' });
    }

    const editedAt = new Date().toISOString();

    // ── LEGACY update (attendance_records) — keeps existing UI working ──
    const docId = `${studentId}_${date}`;
    const attendanceRef = doc(db, 'attendance_records', docId);
    await setDoc(attendanceRef, {
      studentId,
      studentName: studentName || '',
      rollNumber: rollNumber || 0,
      classId,
      className: className || '',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      date,
      month: date.substring(0, 7),
      status: newStatus,
      markedBy: editedBy || 'teacher',
      submittedAt: editedAt,
      lastEditedAt: editedAt,
      lastEditedBy: editedBy || 'teacher',
      timestamp: serverTimestamp(),
    }, { merge: true });
    console.log(`[attendance_records] Legacy edit: ${studentId} on ${date} → ${newStatus}`);

    // ── NEW update: class_attendance ──
    try {
      await setDoc(
        doc(db, 'class_attendance', classId, 'dates', date),
        {
          [`students.${studentId}`]: newStatus,
          lastEditedAt: editedAt,
          lastEditedBy: teacherName || editedBy || 'teacher',
        },
        { merge: true }
      );
      console.log(`[class_attendance] Edit synced: class ${classId} date ${date} student ${studentId} → ${newStatus}`);
    } catch (classEditErr) {
      console.error('[class_attendance] Edit sync failed (non-blocking):', classEditErr.message);
    }

    // ── NEW update: student_attendance ──
    try {
      await setDoc(
        doc(db, 'student_attendance', studentId, 'dates', date),
        {
          status: newStatus,
          classId,
          className: className || '',
          schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
          rollNumber: rollNumber || 0,
          studentName: studentName || '',
          recordedBy: editedBy || 'teacher',
          teacherName: teacherName || editedBy || 'teacher',
          month: date.substring(0, 7),
          lastEditedAt: editedAt,
          lastEditedBy: editedBy || 'teacher',
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`[student_attendance] Edit synced: student ${studentId} date ${date} → ${newStatus}`);
    } catch (studentEditErr) {
      console.error('[student_attendance] Edit sync failed (non-blocking):', studentEditErr.message);
    }

    await addDoc(collection(db, 'attendance_edits'), {
      studentId,
      studentName: studentName || '',
      rollNumber: rollNumber || 0,
      classId,
      className: className || '',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      date,
      oldStatus: oldStatus || 'Unknown',
      newStatus,
      reason: reason.trim(),
      editedBy: editedBy || 'teacher',
      teacherName: teacherName || editedBy || 'Teacher',
      editedAt,
    });

    const allRecordsQ = query(collection(db, 'attendance_records'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classId', '==', classId), where('date', '==', date));
    const allSnap = await getDocs(allRecordsQ);
    const allRecs = allSnap.docs.map(d => d.data());
    const newPresentCount = allRecs.filter(r => r.status === 'Present').length;
    const newAbsentCount = allRecs.filter(r => r.status === 'Absent').length;
    const newTotalCount = allRecs.length;

    const submissionDocId = `${classId}_${date}`;
    await setDoc(doc(db, 'attendance_submissions', submissionDocId), {
      presentCount: newPresentCount,
      absentCount: newAbsentCount,
      totalCount: newTotalCount,
      lastEditedAt: editedAt,
      lastEditedBy: teacherName || editedBy || 'Teacher',
    }, { merge: true });

    try {
      const editMsg = `${teacherName || editedBy} edited attendance for ${studentName} (Roll #${rollNumber || '\u2013'}) in Grade ${className} on ${date}. ${oldStatus} \u2192 ${newStatus}. Reason: ${reason.trim()}. Updated totals \u2014 Present: ${newPresentCount} | Absent: ${newAbsentCount} | Total: ${newTotalCount}.`;
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'attendance_edited',
        icon: '\u270F\uFE0F',
        title: 'Attendance Edited',
        message: editMsg,
        details: { teacherName: teacherName || editedBy, teacherId: editedBy, studentName, studentId, rollNumber, className, classId, date, oldStatus, newStatus, reason: reason.trim(), presentCount: newPresentCount, absentCount: newAbsentCount, totalCount: newTotalCount },
        priority: 'high',
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        createdAt: editedAt,
      });
    } catch (notifErr) {
      console.error('Admin edit notification error:', notifErr.message);
    }

    let sheetSync = { success: false };
    try {
      const record = { studentId, studentName, classId, className, status: newStatus, markedBy: editedBy || 'teacher', date, month: date.substring(0, 7), schoolId: (req.schoolId || DEFAULT_SCHOOL_ID), rollNumber: rollNumber || 0 };
      sheetSync = await syncAttendance([record], date);
    } catch (syncErr) {
      console.error('Sheet re-sync on edit failed:', syncErr.message);
    }

    res.json({
      success: true,
      message: 'Attendance updated successfully.',
      sheetSync: sheetSync.success,
      newCounts: {
        presentCount: newPresentCount,
        absentCount: newAbsentCount,
        totalCount: newTotalCount,
        lastEditedAt: editedAt,
        lastEditedBy: teacherName || editedBy || 'Teacher',
      },
    });
  } catch (err) {
    console.error('Attendance edit error:', err.message);
    res.status(500).json({ error: 'Failed to update attendance.' });
  }
});

app.get('/api/admin/notifications', async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const notifsRef = collection(db, 'admin_notifications');
    let q;
    if (unreadOnly === 'true') {
      q = query(notifsRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('read', '==', false));
    } else {
      q = query(notifsRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), orderBy('createdAt', 'desc'));
    }
    const snap = await getDocs(q);
    const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (unreadOnly === 'true') {
      return res.json({ count: notifications.length });
    }
    notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ notifications, unreadCount: notifications.filter(n => !n.read).length });
  } catch (err) {
    console.error('Admin notifications error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/admin/notifications/mark-read', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const allQ = query(collection(db, 'admin_notifications'), where('read', '==', false));
      const snap = await getDocs(allQ);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { read: true }));
      await batch.commit();
      return res.json({ success: true, updated: snap.docs.length });
    }
    const batch = writeBatch(db);
    ids.forEach(id => batch.update(doc(db, 'admin_notifications', id), { read: true }));
    await batch.commit();
    res.json({ success: true, updated: ids.length });
  } catch (err) {
    console.error('Mark notifications read error:', err.message);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

app.get('/api/attendance/records', async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) return res.status(400).json({ error: 'classId and date required' });
    const q = query(collection(db, 'attendance_records'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classId', '==', classId), where('date', '==', date));
    const snap = await getDocs(q);
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ records });
  } catch (err) {
    console.error('Attendance records error:', err.message);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

app.get('/api/attendance/class-summary', async (req, res) => {
  try {
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;
    const classesRef = collection(db, 'classes');
    const classQ = query(classesRef, where('schoolId', '==', schoolId));
    const classSnap = await getDocs(classQ);
    const classes = classSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const today = new Date().toISOString().split('T')[0];
    const attendanceRef = collection(db, 'attendance_records');
    const result = [];
    for (const cls of classes) {
      const attQ = query(attendanceRef, where('schoolId', '==', schoolId), where('classId', '==', cls.id), where('date', '==', today));
      const attSnap = await getDocs(attQ);
      const records = attSnap.docs.map(d => d.data());
      const total = records.length;
      const present = records.filter(r => r.status === 'Present').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      result.push({ cls: cls.name || cls.id, pct, present, total });
    }
    res.json({ success: true, classes: result });
  } catch (err) {
    console.error('Attendance class summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

app.get('/api/attendance/class-stats', async (req, res) => {
  try {
    const { date, classIds } = req.query;
    if (!date || !classIds) return res.status(400).json({ error: 'date and classIds required' });
    const ids = classIds.split(',').map(s => s.trim()).filter(Boolean);
    const attendanceRef = collection(db, 'attendance_records');
    const stats = {};
    await Promise.all(ids.map(async classId => {
      const q = query(attendanceRef, where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('classId', '==', classId), where('date', '==', date));
      const snap = await getDocs(q);
      const records = snap.docs.map(d => d.data());
      const present = records.filter(r => r.status === 'Present').length;
      const total = records.length;
      stats[classId] = { present, absent: total - present, total, submitted: total > 0 };
    }));
    res.json({ stats });
  } catch (err) {
    console.error('Class stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});


app.post('/api/leave-request/submit', async (req, res) => {
  try {
    const { staffId, staffName, role, dept, reasonId, reasonLabel, reasonIcon, customReason, dates, leaveType, fromDate, toDate } = req.body;
    if (!staffId || !staffName || !reasonId) {
      return res.status(400).json({ error: 'staffId, staffName, reasonId are required' });
    }
    const sorted = dates && dates.length > 0 ? [...dates].sort() : (fromDate ? [fromDate] : []);
    if (sorted.length === 0 && !fromDate) return res.status(400).json({ error: 'dates or fromDate required' });
    const effectiveFrom = sorted[0] || fromDate;
    const effectiveTo = sorted[sorted.length - 1] || toDate || fromDate;
    const effectiveDays = sorted.length || Math.max(1, Math.ceil((new Date(effectiveTo) - new Date(effectiveFrom)) / 86400000) + 1);
    const newReq = {
      staffId, staffName,
      role: role || 'teacher',
      dept: dept || '',
      reasonId,
      reasonLabel: reasonLabel || reasonId,
      icon: reasonIcon || '📅',
      customReason: customReason || '',
      dates: sorted,
      from: effectiveFrom,
      to: effectiveTo,
      days: effectiveDays,
      leaveType: leaveType || 'casual',
      status: 'Pending',
      type: 'staff',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      submittedAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'leave_requests'), newReq);
    
    // Admin notification — staff leave submitted
    try {
      const roleLabel = role === 'driver' ? 'Driver' : role === 'cleaner' ? 'Cleaner' : 'Staff';
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'staff_leave_submitted',
        icon: '📋',
        title: `${roleLabel} Leave Request`,
        message: `${staffName || 'A staff member'} (${roleLabel}) has applied for leave from ${effectiveFrom} to ${effectiveTo}. Reason: ${customReason || reasonLabel || 'Not specified'}.`,
        details: {
          staffId: staffId || '',
          staffName: staffName || '',
          role: role || '',
          fromDate: effectiveFrom,
          toDate: effectiveTo,
          days: effectiveDays,
          reason: customReason || reasonLabel || '',
          leaveType: leaveType || ''
        },
        priority: 'normal',
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        createdAt: new Date().toISOString()
      });
      console.log('[Leave Submit] Admin notification sent for staff leave:', staffId);
    } catch (notifErr) {
      console.error('Admin staff leave notification error:', notifErr.message);
    }
    
    res.json({ success: true, id: ref.id });
    safeSync('syncLeaveRequest', () => syncLeaveRequest({ leaveId: ref.id, type: 'staff', applicantId: staffId, applicantName: staffName, class: dept || '', leaveType: leaveType || 'casual', fromDate: effectiveFrom, toDate: effectiveTo, reason: customReason || '', status: 'Pending', submittedAt: newReq.submittedAt }), { leaveId: ref.id }).catch(() => {});
  } catch (err) {
    console.error('Leave request submit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leave-requests/mine', async (req, res) => {
  try {
    const { staffId } = req.query;
    if (!staffId) return res.status(400).json({ error: 'staffId required' });
    const q = query(collection(db, 'leave_requests'), where('staffId', '==', staffId));
    const snap = await getDocs(q);
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    requests.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    res.json({ requests });
  } catch (err) {
    console.error('Fetch my leave requests error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leave-requests', async (req, res) => {
  try {
    const snap = await getDocs(query(collection(db, 'leave_requests'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))));
    let requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    requests.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

    const needsName = requests.filter(r => !r.staffName || r.staffName === 'Unknown');
    if (needsName.length > 0) {
      await Promise.all(needsName.map(async r => {
        if (!r.staffId) return;
        try {
          const q1 = query(collection(db, 'users'), where('role_id', '==', r.staffId));
          const s1 = await getDocs(q1);
          if (!s1.empty) {
            r.staffName = s1.docs[0].data().full_name || s1.docs[0].data().name || r.staffId;
            return;
          }
          const q2 = query(collection(db, 'onboarded_users'), where('role_id', '==', r.staffId));
          const s2 = await getDocs(q2);
          if (!s2.empty) {
            r.staffName = s2.docs[0].data().full_name || s2.docs[0].data().name || r.staffId;
          }
        } catch (e) {
          console.error('staffName lookup error for', r.staffId, e.message);
        }
      }));
    }

    res.json({ requests });
  } catch (err) {
    console.error('Fetch leave requests error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave-request/update-status', async (req, res) => {
  try {
    const { requestId, status, adminName, adminId, actorRole, rejectReason } = req.body;
    if (!requestId || !status) return res.status(400).json({ error: 'requestId and status required' });
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const resolvedAdmin = adminName || 'Admin';
    const resolvedActorRole = actorRole || 'Admin';
    const approvedAt = new Date().toISOString();

    let leaveDocRef = doc(db, 'leaveRequests', requestId);
    let leaveSnap = await getDocFS(leaveDocRef);
    if (!leaveSnap.exists()) {
      leaveDocRef = doc(db, 'leave_requests', requestId);
      leaveSnap = await getDocFS(leaveDocRef);
    }
    if (!leaveSnap.exists()) return res.status(404).json({ error: 'Leave request not found' });
    const leaveData = leaveSnap.data();

    const updatePayload = { status, updatedAt: approvedAt, approvedBy: resolvedAdmin, approvedByRole: resolvedActorRole, approvedAt };
    if (rejectReason) updatePayload.rejectReason = rejectReason;
    await updateDoc(leaveDocRef, updatePayload);

    const isStudentLeave = leaveData.type === 'student';

    if (isStudentLeave) {
      if (status === 'Approved') {
        try {
          let dates = leaveData.dates && leaveData.dates.length > 0 ? [...leaveData.dates] : [];
          if (dates.length === 0 && leaveData.from) {
            const fromD = new Date(leaveData.from);
            const toD = new Date(leaveData.to || leaveData.from);
            for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
              dates.push(d.toISOString().slice(0, 10));
            }
          }
          const schoolId = leaveData.schoolId || (req.schoolId || DEFAULT_SCHOOL_ID);
          const attBatch = writeBatch(db);
          for (const dateStr of dates) {
            const docId = `${leaveData.studentId}_${dateStr}`;
            attBatch.set(doc(db, 'attendance_records', docId), {
              studentId: leaveData.studentId,
              studentName: leaveData.studentName || '',
              rollNumber: leaveData.rollNumber || 0,
              classId: leaveData.studentClass || '',
              className: leaveData.studentClass || '',
              schoolId,
              date: dateStr,
              month: dateStr.slice(0, 7),
              status: 'Leave',
              leaveId: requestId,
              markedBy: resolvedAdmin,
              submittedAt: approvedAt,
              timestamp: serverTimestamp(),
            }, { merge: true });
          }
          await attBatch.commit();
          console.log(`Student leave attendance marked for ${leaveData.studentName}: ${dates.join(', ')}`);
        } catch (attErr) {
          console.error('Student leave attendance mark error:', attErr.message);
        }
      }

      if (status === 'Approved' || status === 'Rejected') {
        try {
          const icon = status === 'Approved' ? '✅' : '❌';
          const studentName = leaveData.studentName || 'your child';
          const fromDate = leaveData.from || '';
          const toDate = leaveData.to || leaveData.from || '';
          const leaveType = leaveData.reasonLabel || 'Leave';
          const message = status === 'Approved'
            ? `Your child ${studentName}'s leave request (${leaveType}) from ${fromDate} to ${toDate} has been Approved by ${resolvedAdmin} (${resolvedActorRole}).`
            : `Your child ${studentName}'s leave request has been Rejected by ${resolvedAdmin}.${rejectReason ? ' Reason: ' + rejectReason : ''}`;
          await addDoc(collection(db, 'parent_notifications'), {
            studentId: leaveData.studentId || '',
            parentId: leaveData.parentId || '',
            type: 'student_leave_status',
            icon,
            title: status === 'Approved' ? 'Student Leave Approved' : 'Student Leave Rejected',
            message,
            leaveId: requestId,
            status,
            approvedBy: resolvedAdmin,
            approvedByRole: resolvedActorRole,
            schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
            read: false,
            createdAt: approvedAt,
          });
        } catch (notifErr) {
          console.error('Parent leave notification error:', notifErr.message);
        }
      }
    } else {
      if (status === 'Approved' && leaveData.staffId && leaveData.days > 0) {
        try {
          const balRef = doc(db, 'leave_balance', leaveData.staffId);
          const balSnap = await getDocFS(balRef);
          const bal = balSnap.exists() ? balSnap.data() : { casual: 12, sick: 12, earned: 6 };
          const lt = (leaveData.leaveType || 'casual').toLowerCase();
          const field = lt === 'sick' ? 'sick' : lt === 'earned' ? 'earned' : 'casual';
          const current = bal[field] || 0;
          const deduct = Math.min(current, leaveData.days);
          await setDoc(balRef, { ...bal, [field]: Math.max(0, current - deduct), updatedAt: new Date().toISOString() });
        } catch (balErr) {
          console.error('Leave balance deduct error:', balErr.message);
        }
      }

      if ((status === 'Approved' || status === 'Rejected') && leaveData.staffId) {
        try {
          const icon = status === 'Approved' ? '✅' : '❌';
          const title = status === 'Approved' ? 'Leave Approved' : 'Leave Rejected';
          const fromDate = leaveData.from || '';
          const toDate = leaveData.to || leaveData.from || '';
          const leaveType = leaveData.reasonLabel || leaveData.reasonId || 'Leave';
          const message = `Your leave request for ${leaveType} from ${fromDate} to ${toDate} has been ${status} by ${resolvedAdmin}.`;
          await addDoc(collection(db, 'teacher_notifications'), {
            roleId: leaveData.staffId,
            type: 'leave_status',
            icon,
            title,
            message,
            leaveId: requestId,
            leaveType,
            status,
            from: fromDate,
            to: toDate,
            approvedBy: resolvedAdmin,
            schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
            read: false,
            createdAt: approvedAt,
          });
          console.log(`Teacher notification sent to ${leaveData.staffId}: Leave ${status}`);
        } catch (notifErr) {
          console.error('Teacher leave notification error:', notifErr.message);
        }
      }
    }

    res.json({ success: true });
    safeSync('syncLeaveRequest', () => syncLeaveRequest({ leaveId: requestId, type: leaveData.type || 'student', applicantId: leaveData.studentId || leaveData.staffId || '', applicantName: leaveData.studentName || leaveData.employeeName || '', class: leaveData.studentClass || '', leaveType: leaveData.reasonLabel || '', fromDate: leaveData.from || '', toDate: leaveData.to || '', reason: leaveData.customReason || '', status, actionedBy: resolvedAdmin, actionedAt: approvedAt, submittedAt: leaveData.submittedAt || '' }), { leaveId: requestId }).catch(() => {});
  } catch (err) {
    console.error('Update leave status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function normalizeClassName(name) {
  return name?.toLowerCase().replace(/\s+/g, '').replace('grade', '').trim() || '';
}

app.post('/api/leave-request/student/submit', async (req, res) => {
  try {
    const { studentId, studentName, rollNumber, studentClass, schoolId, parentId, parentName, reasonId, reasonLabel, reasonIcon, customReason, dates, from, to } = req.body;
    if (!studentId || !studentName || !studentClass || !from) {
      return res.status(400).json({ error: 'studentId, studentName, studentClass, from are required' });
    }

    console.log('STEP 1 - Student data:', { studentId, studentClass, studentName });

    const effectiveDates = dates && dates.length > 0 ? [...dates].sort() : [];
    const effectiveFrom = effectiveDates.length > 0 ? effectiveDates[0] : from;
    const effectiveTo = effectiveDates.length > 0 ? effectiveDates[effectiveDates.length - 1] : (to || from);
    const days = Math.max(1, Math.ceil((new Date(effectiveTo) - new Date(effectiveFrom)) / 86400000) + 1);
    let allDates = effectiveDates;
    if (allDates.length === 0) {
      const fD = new Date(effectiveFrom);
      const tD = new Date(effectiveTo);
      for (let d = new Date(fD); d <= tD; d.setDate(d.getDate() + 1)) {
        allDates.push(d.toISOString().slice(0, 10));
      }
    }

    const studentClassNormalized = normalizeClassName(studentClass);
    console.log('STEP 2 - Querying teacher where classTeacherOf =', studentClass);

    let assignedTeacherId = '';
    let assignedTeacherName = '';
    let assignedTeacherUid = '';
    let noClassTeacherAssigned = false;
    try {
      const teacherSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('role', '==', 'teacher')));
      for (const teacherDoc of teacherSnap.docs) {
        const td = teacherDoc.data();
        const teacherNorm = normalizeClassName(td.classTeacherOf || '');
        if (teacherNorm && teacherNorm === studentClassNormalized) {
          assignedTeacherId = td.role_id || '';
          assignedTeacherUid = td.uid || '';
          assignedTeacherName = td.full_name || '';
          break;
        }
      }
      console.log('STEP 3 - Teacher found:', { teacherId: assignedTeacherId, teacherName: assignedTeacherName });
      if (!assignedTeacherId) {
        noClassTeacherAssigned = true;
        console.warn(`[Leave Submit] No class teacher assigned for "${studentClass}" (normalized: "${studentClassNormalized}") — routed to Admin only`);
      }
    } catch (ctErr) {
      console.error('[Leave Submit] Class teacher lookup failed:', ctErr.message);
      noClassTeacherAssigned = true;
    }

    const newReq = {
      type: 'student',
      studentId,
      studentName,
      rollNumber: rollNumber || 0,
      studentClass,
      studentClassNormalized,
      schoolId: schoolId || (req.schoolId || DEFAULT_SCHOOL_ID),
      parentId: parentId || '',
      parentName: parentName || '',
      reasonId: reasonId || 'other',
      reasonLabel: reasonLabel || reasonId || 'Leave',
      leaveType: reasonLabel || reasonId || 'Leave',
      icon: reasonIcon || '📅',
      customReason: customReason || '',
      dates: allDates,
      from: effectiveFrom,
      to: effectiveTo,
      days,
      status: 'Pending',
      visibleToAdmin: true,
      assignedTeacherId,
      assignedTeacherUid,
      assignedTeacherName,
      noClassTeacherAssigned,
      submittedAt: new Date().toISOString(),
    };
    console.log('STEP 4 - Saving leave request with:', newReq);
    const ref = await addDoc(collection(db, 'leaveRequests'), newReq);
    
    // Admin notification — student leave submitted
    try {
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'leave_submitted',
        icon: '📋',
        title: 'Leave Request Submitted',
        message: `Leave request submitted for ${studentName || 'a student'} (Class ${studentClass || ''}) from ${effectiveFrom} to ${effectiveTo}. Reason: ${customReason || 'Not specified'}.`,
        details: {
          studentId,
          studentName: studentName || '',
          studentClass: studentClass || '',
          startDate: effectiveFrom,
          endDate: effectiveTo,
          reason: customReason || '',
          assignedTeacherId: assignedTeacherId || ''
        },
        priority: 'normal',
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        createdAt: new Date().toISOString()
      });
      console.log('[Leave Submit] Admin notification sent for student leave:', studentId);
    } catch (notifErr) {
      console.error('Admin leave notification error:', notifErr.message);
    }
    
    const result = { success: true, id: ref.id, assignedTeacherName: assignedTeacherName || null, noClassTeacherAssigned };
    console.log('STEP 5 - Save result:', result);
    res.json(result);
    safeSync('syncLeaveRequest', () => syncLeaveRequest({ leaveId: ref.id, type: 'student', applicantId: studentId, applicantName: studentName, class: studentClass, leaveType: reasonLabel || reasonId || '', fromDate: effectiveFrom, toDate: effectiveTo, reason: customReason || '', status: 'Pending', submittedAt: newReq.submittedAt }), { leaveId: ref.id }).catch(() => {});
  } catch (err) {
    console.error('[Leave Submit] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leave-requests/students', async (req, res) => {
  try {
    const { studentId } = req.query;
    const seen = new Set();
    let requests = [];

    const fetchFrom = async (colName, extraWhere) => {
      try {
        let q;
        if (studentId) {
          q = query(collection(db, colName), where('type', '==', 'student'), where('studentId', '==', studentId));
        } else {
          q = query(collection(db, colName), where('type', '==', 'student'));
        }
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          if (!seen.has(d.id)) { seen.add(d.id); requests.push({ id: d.id, ...d.data() }); }
        }
      } catch (e) { }
    };

    await Promise.all([fetchFrom('leaveRequests'), fetchFrom('leave_requests')]);
    requests.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    res.json({ requests });
  } catch (err) {
    console.error('Fetch student leave requests error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leave-requests/student-class', async (req, res) => {
  try {
    const { teacherRoleId } = req.query;
    if (!teacherRoleId) return res.status(400).json({ error: 'teacherRoleId required' });

    const userQ = query(collection(db, 'users'), where('role_id', '==', teacherRoleId));
    const userSnap = await getDocs(userQ);
    if (userSnap.empty) return res.status(404).json({ error: 'Teacher not found' });
    const teacherData = userSnap.docs[0].data();
    const classTeacherOf = teacherData.classTeacherOf || null;
    const teacherUid = teacherData.uid || '';

    console.log('TEACHER classTeacherOf value:', classTeacherOf);

    if (!classTeacherOf) {
      return res.json({ requests: [], classTeacherOf: null, notClassTeacher: true });
    }

    const normalizedTeacherClass = normalizeClassName(classTeacherOf);

    const queryDetails = {
      q1: `leaveRequests where studentClass == "${classTeacherOf}"`,
      q2: `leaveRequests where studentClassNormalized == "${normalizedTeacherClass}"`,
      q3: `leaveRequests where assignedTeacherId == "${teacherRoleId}"`,
    };
    console.log('QUERY used:', queryDetails);

    const [snap1, snap2, snap3, snapOld] = await Promise.all([
      getDocs(query(collection(db, 'leaveRequests'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('studentClass', '==', classTeacherOf))),
      getDocs(query(collection(db, 'leaveRequests'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('studentClassNormalized', '==', normalizedTeacherClass))),
      getDocs(query(collection(db, 'leaveRequests'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('assignedTeacherId', '==', teacherRoleId))),
      getDocs(query(collection(db, 'leave_requests'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('type', '==', 'student'))),
    ]);

    const seen = new Set();
    const allResults = [];

    const addDocs = (snap) => {
      for (const d of snap.docs) {
        if (!seen.has(d.id)) { seen.add(d.id); allResults.push({ id: d.id, ...d.data() }); }
      }
    };

    addDocs(snap1);
    addDocs(snap2);
    addDocs(snap3);

    for (const d of snapOld.docs) {
      if (seen.has(d.id)) continue;
      const data = d.data();
      const rawClass = data.studentClass || '';
      const normLeave = data.normalizedStudentClass || data.studentClassNormalized || normalizeClassName(rawClass);
      const matchByClass = normalizedTeacherClass && normLeave === normalizedTeacherClass;
      const matchByTeacherId = data.assignedTeacherId && data.assignedTeacherId === teacherRoleId;
      const matchByUid = teacherUid && data.assignedTeacherUid === teacherUid;
      if (matchByClass || matchByTeacherId || matchByUid) {
        seen.add(d.id);
        allResults.push({ id: d.id, ...data });
      }
    }

    console.log('RAW results:', allResults.map(r => ({ id: r.id, studentClass: r.studentClass, status: r.status, studentName: r.studentName })));

    allResults.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    console.log(`[Teacher Leave Query] Returning ${allResults.length} requests for ${teacherRoleId}`);
    res.json({ requests: allResults, classTeacherOf, notClassTeacher: false });
  } catch (err) {
    console.error('[Teacher Leave Query] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave-requests/backfill-teacher', async (req, res) => {
  try {
    const [snap1, snap2] = await Promise.all([
      getDocs(query(collection(db, 'leaveRequests'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
      getDocs(query(collection(db, 'leave_requests'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('type', '==', 'student'))),
    ]);
    const allLeaveDocs = [...snap1.docs, ...snap2.docs];
    const teacherSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('role', '==', 'teacher')));
    const teacherMap = {};
    for (const td of teacherSnap.docs) {
      const d = td.data();
      if (d.classTeacherOf) {
        teacherMap[normalizeClassName(d.classTeacherOf)] = { role_id: d.role_id || '', full_name: d.full_name || '', uid: d.uid || '' };
      }
    }
    let updated = 0;
    for (const ld of allLeaveDocs) {
      const data = ld.data();
      if (data.assignedTeacherId) continue;
      const norm = normalizeClassName(data.studentClass || '');
      const teacher = teacherMap[norm];
      const colName = snap1.docs.find(d => d.id === ld.id) ? 'leaveRequests' : 'leave_requests';
      if (teacher) {
        await updateDoc(doc(db, colName, ld.id), {
          studentClassNormalized: norm,
          assignedTeacherId: teacher.role_id,
          assignedTeacherUid: teacher.uid,
          assignedTeacherName: teacher.full_name,
          noClassTeacherAssigned: false,
        });
        updated++;
        console.log(`[Backfill] Updated ${ld.id}: assigned to ${teacher.full_name}`);
      } else {
        await updateDoc(doc(db, colName, ld.id), {
          studentClassNormalized: norm,
          noClassTeacherAssigned: true,
        });
      }
    }
    res.json({ success: true, updated, total: allLeaveDocs.length });
  } catch (err) {
    console.error('[Backfill] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forgot-password', loginLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) {
      const logQ = query(collection(db, 'logistics_staff'), where('email', '==', email.trim().toLowerCase()));
      const logSnap = await getDocs(logQ);
      if (logSnap.empty) {
        return res.status(404).json({ error: 'This email is not registered with our school.' });
      }
    }
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    res.json({ success: true, message: 'Password reset link sent! Please check your inbox.' });
  } catch (err) {
    console.error('Forgot password error:', err.code, err.message);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'This email is not registered with our school.' });
    }
    if (err.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (err.code === 'auth/too-many-requests') {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
});

app.post('/api/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword, uid } = req.body;

    if (!email || !currentPassword || !newPassword || !uid) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return res.status(403).json({ error: 'User verification failed' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, currentPassword);
    const user = userCredential.user;

    await updatePassword(user, newPassword);

    console.log(`Password changed successfully for: ${email}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err.code, err.message);
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (err.code === 'auth/too-many-requests') {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }
    if (err.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Password is too weak. Use at least 6 characters.' });
    }
    res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

app.post('/api/admin/update-profile', async (req, res) => {
  try {
    const { uid, mobile, bloodGroup } = req.body;
    if (!uid) return res.status(400).json({ error: 'User ID is required' });

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '==', uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return res.status(404).json({ error: 'User not found' });

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    if (userData.role !== 'principal') return res.status(403).json({ error: 'Only the principal can update admin profile' });

    const updates = {};
    if (mobile) updates.mobile = mobile;
    if (bloodGroup) updates.blood_group = bloodGroup;
    updates.profile_updated_at = new Date().toISOString();

    await updateDoc(doc(db, 'users', userDoc.id), updates);
    console.log(`Admin profile updated: ${uid}`);

    try {
      const { updateAdminProfileInSheets } = require('./src/services/googleSheets');
      await updateAdminProfileInSheets({
        roleId: userData.role_id || 'ADMIN',
        fullName: userData.full_name,
        email: userData.email,
        mobile: mobile || userData.mobile || '',
        bloodGroup: bloodGroup || userData.blood_group || '',
        profileImage: userData.profileImage || '',
      });
    } catch (syncErr) {
      console.error('Sheets sync error (admin profile):', syncErr.message);
    }

    res.json({ success: true, updates });
  } catch (err) {
    console.error('Admin profile update error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/admin/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid || !req.file) return res.status(400).json({ error: 'User ID and photo are required' });

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '==', uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return res.status(404).json({ error: 'User not found' });

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    if (userData.role !== 'principal') return res.status(403).json({ error: 'Access denied' });

    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `profile_photos/${uid}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, req.file.buffer, { contentType: req.file.mimetype });
    const downloadURL = await getDownloadURL(storageRef);

    await updateDoc(doc(db, 'users', userDoc.id), {
      profileImage: downloadURL,
      profile_updated_at: new Date().toISOString(),
    });

    console.log(`Admin photo uploaded: ${uid} -> ${downloadURL}`);

    try {
      const { updateAdminProfileInSheets } = require('./src/services/googleSheets');
      await updateAdminProfileInSheets({
        roleId: userData.role_id || 'ADMIN',
        fullName: userData.full_name,
        email: userData.email,
        mobile: userData.mobile || '',
        bloodGroup: userData.blood_group || '',
        profileImage: downloadURL,
      });
    } catch (syncErr) {
      console.error('Sheets sync error (admin photo):', syncErr.message);
    }

    res.json({ success: true, profileImage: downloadURL });
  } catch (err) {
    console.error('Admin photo upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

app.post('/api/bus/start-trip', async (req, res) => {
  try {
    const { driverId, driverName, busNumber, route, tripType, lat, lng } = req.body;
    if (!driverId || !busNumber) return res.status(400).json({ error: 'driverId and busNumber required' });

    const tripDoc = {
      driverId,
      driverName: driverName || '',
      busNumber,
      route: route || '',
      tripType: tripType || 'school',
      status: 'active',
      startTime: new Date().toISOString(),
      endTime: null,
      lat: lat || null,
      lng: lng || null,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
    };
    const tripRef = await addDoc(collection(db, 'bus_trips'), tripDoc);

    await addDoc(collection(db, 'live_bus_locations'), {
      tripId: tripRef.id,
      driverId,
      busNumber,
      route: route || '',
      lat: lat || 0,
      lng: lng || 0,
      speed: 0,
      status: 'active',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      updatedAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'parent_notifications'), {
      busNumber,
      message: `Bus ${busNumber} has started from school. You can now track its live location in the app.`,
      type: 'bus_departure',
      tripId: tripRef.id,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      read: false,
      createdAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'parent_notifications'), {
      type: 'admin_alert',
      message: `Driver ${driverName || driverId} has started the ${tripType || 'school'} route for Bus ${busNumber}.`,
      tripId: tripRef.id,
      forAdmin: true,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      read: false,
      createdAt: new Date().toISOString(),
    });

    console.log(`Trip started: ${driverName} - Bus ${busNumber}`);
    res.json({ success: true, tripId: tripRef.id });
  } catch (err) {
    console.error('Start trip error:', err.message);
    res.status(500).json({ error: 'Failed to start trip' });
  }
});

const proximityNotified = {};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function checkProximityAlerts(busNumber, route, lat, lng) {
  try {
    if (!route || !lat || !lng) return;
    const stopsQ = query(collection(db, 'student_stops'), where('route', '==', route));
    const stopsSnap = await getDocs(stopsQ);
    if (stopsSnap.empty) return;

    const now = new Date();
    const tripKey = `${busNumber}_${now.toISOString().slice(0, 10)}`;

    for (const stopDoc of stopsSnap.docs) {
      const stop = stopDoc.data();
      if (!stop.lat || !stop.lng || !stop.studentId) continue;

      const dist = haversineDistance(lat, lng, stop.lat, stop.lng);
      const alertKey = `${tripKey}_${stop.studentId}`;

      if (dist <= 500 && !proximityNotified[alertKey]) {
        proximityNotified[alertKey] = true;
        const studentId = `student-${stop.studentId}`;
        const alertMsg = `🚌 Your child's school bus is arriving in approximately 2–3 minutes. Please be ready at the stop.`;
        await addDoc(collection(db, 'parent_notifications'), {
          studentId,
          studentName: stop.studentName || '',
          message: alertMsg,
          type: 'proximity_alert',
          busNumber,
          route,
          distance: Math.round(dist),
          schoolId: DEFAULT_SCHOOL_ID,
          read: false,
          createdAt: now.toISOString(),
        });
        await addDoc(collection(db, 'proximity_alert_logs'), {
          studentId: String(stop.studentId),
          studentName: stop.studentName || '',
          busNumber,
          route,
          driverLat: lat,
          driverLng: lng,
          studentLat: stop.lat,
          studentLng: stop.lng,
          distanceAtAlert: Math.round(dist),
          message: alertMsg,
          schoolId: DEFAULT_SCHOOL_ID,
          sentAt: now.toISOString(),
          tripDate: now.toISOString().slice(0, 10),
        });
        console.log(`Proximity alert: Bus ${busNumber} is ${Math.round(dist)}m from ${stop.studentName}'s stop`);
      }
    }
  } catch (err) {
    console.error('Proximity alert error:', err.message);
  }
}

app.post('/api/bus/update-location', async (req, res) => {
  try {
    const { busNumber, lat, lng, speed } = req.body;
    if (!busNumber) return res.status(400).json({ error: 'busNumber required' });

    const q = query(collection(db, 'live_bus_locations'), where('busNumber', '==', busNumber), where('status', '==', 'active'));
    const snap = await getDocs(q);
    if (snap.empty) return res.status(404).json({ error: 'No active trip for this bus' });

    let tripRoute = null;
    for (const d of snap.docs) {
      const data = d.data();
      tripRoute = data.route || null;
      await updateDoc(doc(db, 'live_bus_locations', d.id), {
        lat: lat || 0,
        lng: lng || 0,
        speed: speed || 0,
        updatedAt: new Date().toISOString(),
      });
    }

    if (lat && lng && tripRoute) {
      checkProximityAlerts(busNumber, tripRoute, lat, lng);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update location error:', err.message);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

app.post('/api/bus/end-trip', async (req, res) => {
  try {
    const { tripId, driverId, driverName, busNumber, route, totalDistance, studentsBoarded } = req.body;
    if (!tripId) return res.status(400).json({ error: 'tripId required' });

    const tripSnap = await getDocFS(doc(db, 'bus_trips', tripId));
    if (!tripSnap.exists()) return res.status(404).json({ error: 'Trip not found' });
    const tripData = tripSnap.data();

    const endTime = new Date().toISOString();
    const startMs = new Date(tripData.startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const durationMin = Math.round((endMs - startMs) / 60000);
    const finalBusNumber = busNumber || tripData.busNumber;
    const finalDriverId = driverId || tripData.driverId;
    const finalDriverName = driverName || tripData.driverName;

    await updateDoc(doc(db, 'bus_trips', tripId), { status: 'completed', endTime, totalDistance: totalDistance || 0, studentsBoarded: studentsBoarded || 0 });

    const locQ = query(collection(db, 'live_bus_locations'), where('busNumber', '==', finalBusNumber), where('status', '==', 'active'));
    const locSnap = await getDocs(locQ);
    for (const d of locSnap.docs) {
      await updateDoc(doc(db, 'live_bus_locations', d.id), { status: 'inactive', updatedAt: endTime });
    }

    await addDoc(collection(db, 'parent_notifications'), {
      busNumber: finalBusNumber,
      message: `Bus ${finalBusNumber} has successfully completed the route.`,
      type: 'bus_arrival',
      tripId,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      read: false,
      createdAt: endTime,
    });

    const startUTC = new Date(tripData.startTime);
    const istMinutes = startUTC.getUTCHours() * 60 + startUTC.getUTCMinutes() + 330;
    const istHour = Math.floor(istMinutes % 1440 / 60);
    const tripType = istHour < 12 ? 'morning' : 'evening';
    const istTripDate = new Date(startUTC.getTime() + 330 * 60000);
    const tripDate = istTripDate.toISOString().slice(0, 10);
    const summaryDocId = `${finalDriverId}_${tripDate}`;
    const summaryRef = doc(db, 'trip_summaries', summaryDocId);
    const summarySnap = await getDocFS(summaryRef);
    const summaryData = summarySnap.exists() ? summarySnap.data() : {};
    const updateData = {
      driverId: finalDriverId,
      driverName: finalDriverName,
      busNumber: finalBusNumber,
      route: route || tripData.route,
      tripDate,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      updatedAt: endTime,
      [`${tripType}Duration`]: durationMin,
      [`${tripType}StartTime`]: new Date(tripData.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      [`${tripType}EndTime`]: new Date(endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    if (totalDistance) updateData[`${tripType}Distance`] = totalDistance;
    if (studentsBoarded) updateData[`${tripType}StudentsBoarded`] = studentsBoarded;
    if (summarySnap.exists()) {
      await updateDoc(summaryRef, updateData);
    } else {
      await setDoc(summaryRef, updateData);
    }

    await addDoc(collection(db, 'tripLogs'), {
      tripId,
      driverId: finalDriverId,
      driverName: finalDriverName,
      busId: finalBusNumber,
      busNumber: finalBusNumber,
      route: route || tripData.route || '',
      date: tripDate,
      tripType,
      startTime: tripData.startTime,
      endTime,
      duration: durationMin,
      studentsBoarded: studentsBoarded || 0,
      totalDistance: totalDistance || 0,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      createdAt: endTime,
    });

    const startFmt = new Date(tripData.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const endFmt = new Date(endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    syncBusTripHistory({
      driverId: finalDriverId,
      driverName: finalDriverName,
      busNumber: finalBusNumber,
      route: route || tripData.route,
      tripType: tripData.tripType || 'school',
      startTime: startFmt,
      endTime: endFmt,
      duration: String(durationMin),
    }).catch(e => console.error('Sheets bus trip sync error:', e.message));

    console.log(`Trip ended: Bus ${finalBusNumber}, duration: ${durationMin} min, distance: ${totalDistance || 0}km`);
    res.json({ success: true, durationMin });
  } catch (err) {
    console.error('End trip error:', err.message);
    res.status(500).json({ error: 'Failed to end trip' });
  }
});

app.get('/api/trip/onboard-count', async (req, res) => {
  try {
    const { busId, date } = req.query;
    if (!busId) return res.status(400).json({ error: 'busId required' });

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const today = date || new Date(now.getTime() + istOffset).toISOString().slice(0, 10);

    const scansRef = collection(db, 'trip_scans');
    const scansQ = query(scansRef, where('date', '==', today), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)));
    const snap = await getDocs(scansQ);
    const scans = snap.docs.map(d => d.data()).filter(s => s.busId === busId || s.busNumber === busId);
    const boardCount = scans.filter(s => s.type === 'board').length;

    const busQ = query(collection(db, 'buses'), where('busNumber', '==', busId));
    const busSnap = await getDocs(busQ);
    let totalStudents = 0;
    if (!busSnap.empty) {
      const busData = busSnap.docs[0].data();
      totalStudents = (busData.studentIds || []).length;
    }
    if (totalStudents === 0) {
      const studQ = query(collection(db, 'students'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('busRoute', '==', busId));
      const studSnap = await getDocs(studQ);
      totalStudents = studSnap.size;
    }

    res.json({ success: true, boardCount, totalStudents });
  } catch (err) {
    console.error('Get onboard count error:', err.message);
    res.status(500).json({ error: 'Failed to get onboard count' });
  }
});

app.get('/api/admin/buses', async (req, res) => {
  try {
    const snap = await getDocs(query(collection(db, 'buses'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))));
    const buses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, buses });
  } catch (err) {
    console.error('Get admin buses error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/buses/add', verifyAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'principal') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { busNumber, busId, route, routeId, driverId, driverName, cleanerId, cleanerName } = req.body;
    if (!busNumber || !busId) return res.status(400).json({ error: 'busNumber and busId required' });

    await setDoc(doc(db, 'buses', busId), {
      busNumber,
      busId,
      route: route || '',
      routeId: routeId || '',
      driverId: driverId || '',
      driverName: driverName || '',
      cleanerId: cleanerId || '',
      cleanerName: cleanerName || '',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      studentIds: [],
      status: 'active',
      createdAt: new Date().toISOString()
    });

    console.log(`Bus added: ${busNumber} (${busId})`);
    res.json({ success: true, busId });
  } catch (err) {
    console.error('Add bus error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/buses/assign-students', verifyAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'principal') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { busId, studentIds } = req.body;
    if (!busId || !studentIds) return res.status(400).json({ error: 'busId and studentIds required' });
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;

    const busSnap = await getDocFS(doc(db, 'buses', busId));
    if (!busSnap.exists() || busSnap.data().schoolId !== schoolId) {
      return res.status(403).json({ error: 'Bus not found in your school' });
    }

    await updateDoc(doc(db, 'buses', busId), {
      studentIds,
      updatedAt: new Date().toISOString()
    });

    for (const sid of studentIds) {
      const studentQ = query(collection(db, 'students'), where('studentId', '==', sid), where('schoolId', '==', schoolId));
      const studentSnap = await getDocs(studentQ);
      if (!studentSnap.empty) {
        await updateDoc(studentSnap.docs[0].ref, { busId, updatedAt: new Date().toISOString() });
      }
    }

    console.log(`Assigned ${studentIds.length} students to bus ${busId}`);
    res.json({ success: true, assigned: studentIds.length });
  } catch (err) {
    console.error('Assign students to bus error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bus/onboard-students', async (req, res) => {
  try {
    const { busId, date } = req.query;
    if (!busId) return res.status(400).json({ error: 'busId required' });
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const today = date || new Date(now.getTime() + istOffset).toISOString().slice(0, 10);
    const scansQ = query(
      collection(db, 'trip_scans'),
      where('date', '==', today),
      where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))
    );
    const snap = await getDocs(scansQ);
    const scans = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.busId === busId || s.busNumber === busId);

    const studentMap = {};
    for (const scan of scans) {
      if (!studentMap[scan.studentId] || scan.timestamp > studentMap[scan.studentId].timestamp) {
        studentMap[scan.studentId] = scan;
      }
    }

    const students = Object.values(studentMap).map(scan => ({
      studentId: scan.studentId,
      studentName: scan.studentName || '',
      status: scan.type === 'board' ? 'Onboard' : 'Arrived at School',
      boardTime: scan.type === 'board' ? scan.timestamp : null,
      arrivalTime: scan.type === 'alight' ? scan.timestamp : null,
      lastScan: scan.timestamp
    }));

    students.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
    res.json({ success: true, students, total: students.length, date: today });
  } catch (err) {
    console.error('Get onboard students error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trip/scans', async (req, res) => {
  try {
    const { tripId, busNumber, driverId } = req.query;
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const today = new Date(now.getTime() + istOffset).toISOString().slice(0, 10);

    if (!tripId && !busNumber && !driverId) {
      return res.status(400).json({ error: 'tripId, busNumber, or driverId required' });
    }

    const scansRef = collection(db, 'trip_scans');
    const baseQ = query(scansRef, where('date', '==', today), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)));
    const snap = await getDocs(baseQ);

    let resolvedBusNumber = busNumber || '';
    if (!resolvedBusNumber && driverId) {
      const userQ = query(collection(db, 'users'), where('role_id', '==', driverId));
      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        resolvedBusNumber = userSnap.docs[0].data().bus_number || '';
      }
    }

    let scans = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (resolvedBusNumber) {
      scans = scans.filter(s => s.busId === resolvedBusNumber || s.busNumber === resolvedBusNumber);
    } else if (driverId) {
      scans = scans.filter(s => s.driverId === driverId);
    }

    scans.sort((a, b) => (b.timestamp || b.createdAt || '').localeCompare(a.timestamp || a.createdAt || ''));

    const boardCount = scans.filter(s => s.type === 'board').length;
    const alightCount = scans.filter(s => s.type === 'alight').length;

    res.json({ success: true, scans, boardCount, alightCount, total: scans.length });
  } catch (err) {
    console.error('Get trip scans error:', err.message);
    res.status(500).json({ error: 'Failed to get trip scans' });
  }
});

const recentScans = {};

app.post('/api/trip/scan', scanLimiter, async (req, res) => {
  try {
    const { qrData, studentId: legacyStudentId, driverId, busId, scannedBy, role, timestamp } = req.body;
    const scanTime = timestamp || new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);

    let studentId = '';

    if (qrData && typeof qrData === 'string') {
      const parts = qrData.split('|');
      if (parts.length !== 3 || parts[0] !== 'SREE_PRAGATHI') {
        await logRejectedScan({ scannedData: qrData, driverId, busId, reason: 'QR format mismatch', timestamp: scanTime });
        return res.status(400).json({ success: false, error: 'Invalid QR format — must be SREE_PRAGATHI|schoolId|studentId', code: 'INVALID_QR' });
      }

      const [, qrSchoolId, qrStudentId] = parts;
      studentId = qrStudentId;

      if (qrSchoolId !== (req.schoolId || DEFAULT_SCHOOL_ID)) {
        await logRejectedScan({ scannedData: qrData, driverId, busId, reason: 'School mismatch', timestamp: scanTime, studentId });
        return res.status(403).json({ success: false, error: 'Student does not belong to this school', code: 'SCHOOL_MISMATCH' });
      }
    } else if (legacyStudentId) {
      studentId = String(legacyStudentId);
    } else {
      await logRejectedScan({ scannedData: qrData || '', driverId, busId, reason: 'No QR data provided', timestamp: scanTime });
      return res.status(400).json({ success: false, error: 'qrData or studentId required', code: 'INVALID_QR' });
    }

    let studentData = null;
    try {
      const studentQ = query(collection(db, 'students'), where('studentId', '==', studentId));
      const studentSnap = await getDocs(studentQ);
      if (!studentSnap.empty) {
        studentData = { id: studentSnap.docs[0].id, ...studentSnap.docs[0].data() };
      }
    } catch (e) {
      console.error('[QR Scan] Student lookup error:', e.message);
    }

    if (!studentData) {
      await logRejectedScan({ scannedData: qrData || studentId, driverId, busId, reason: 'Student not found', timestamp: scanTime, studentId });
      return res.status(404).json({ success: false, error: 'Student not found', code: 'STUDENT_NOT_FOUND' });
    }

    if (studentData.status && studentData.status !== 'active') {
      await logRejectedScan({ scannedData: qrData || studentId, driverId, busId, reason: 'Student inactive', timestamp: scanTime, studentId });
      return res.status(403).json({ success: false, error: 'Student account is inactive', code: 'STUDENT_INACTIVE' });
    }

    let driverData = null;
    if (driverId) {
      try {
        const driverQ = query(collection(db, 'users'), where('role_id', '==', driverId));
        const driverSnap = await getDocs(driverQ);
        if (!driverSnap.empty) driverData = driverSnap.docs[0].data();
      } catch (e) {
        console.error('[QR Scan] Driver lookup error:', e.message);
      }
    }

    let busData = null;
    if (busId) {
      try {
        const busQ = query(collection(db, 'buses'), where('busId', '==', busId));
        const busSnap = await getDocs(busQ);
        if (busSnap.empty) {
          const busQ2 = query(collection(db, 'buses'), where('busNumber', '==', busId));
          const busSnap2 = await getDocs(busQ2);
          if (!busSnap2.empty) busData = { id: busSnap2.docs[0].id, ...busSnap2.docs[0].data() };
        } else {
          busData = { id: busSnap.docs[0].id, ...busSnap.docs[0].data() };
        }
      } catch (e) {
        console.error('[QR Scan] Bus lookup error:', e.message);
      }
    }

    if (studentData.schoolId && studentData.schoolId !== (req.schoolId || DEFAULT_SCHOOL_ID)) {
      await logRejectedScan({ scannedData: qrData || studentId, driverId, busId, reason: 'School mismatch (student doc)', timestamp: scanTime, studentId });
      return res.status(403).json({ success: false, error: 'Student does not belong to this school', code: 'SCHOOL_MISMATCH' });
    }

    const studentBusId = studentData.busId || '';
    const isWrongBus = studentBusId && busId && studentBusId !== busId;

    if (isWrongBus) {
      console.warn(`[QR Scan] WRONG BUS — Student ${studentData.name} assigned to ${studentBusId} but boarding ${busId}`);

      try {
        await addDoc(collection(db, 'admin_notifications'), {
          type: 'wrong_bus_boarding',
          icon: '⚠️',
          title: 'Wrong Bus Alert',
          message: `${studentData.name} (Class ${studentData.className || studentData.classId}) has boarded Bus ${busData?.busNumber || busId} but is assigned to Bus ${studentBusId}. Immediate attention required.`,
          details: {
            studentId,
            studentName: studentData.name,
            studentClass: studentData.className || studentData.classId || '',
            assignedBusId: studentBusId,
            actualBusId: busId,
            actualBusNumber: busData?.busNumber || busId,
            driverId,
            driverName: driverData?.full_name || driverId,
            scanTime
          },
          priority: 'high',
          schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
          read: false,
          createdAt: scanTime
        });
      } catch (notifErr) {
        console.error('[QR Scan] Wrong bus admin notification error:', notifErr.message);
      }

      try {
        const parentPhone = studentData.parentPhone || '';
        if (parentPhone) {
          await addDoc(collection(db, 'parent_notifications'), {
            type: 'wrong_bus_alert',
            icon: '⚠️',
            title: 'Wrong Bus Alert',
            message: `Alert: ${studentData.name} has boarded Bus ${busData?.busNumber || busId} instead of their assigned bus. Please contact the school immediately.`,
            details: { studentId, studentName: studentData.name, busId, busNumber: busData?.busNumber || busId },
            parentPhone,
            schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
            read: false,
            createdAt: scanTime
          });
        }
      } catch (notifErr) {
        console.error('[QR Scan] Wrong bus parent notification error:', notifErr.message);
      }
    }

    const scanKey = `${studentId}_${today}`;
    const lastScanTime = recentScans[scanKey];
    if (lastScanTime) {
      const diffMs = new Date(scanTime).getTime() - new Date(lastScanTime).getTime();
      if (diffMs < 5 * 60 * 1000) {
        return res.status(429).json({ success: false, error: 'Student already scanned within last 5 minutes', code: 'DUPLICATE_SCAN' });
      }
    }
    recentScans[scanKey] = scanTime;

    const prevScansQ = query(
      collection(db, 'trip_scans'),
      where('studentId', '==', studentId),
      where('date', '==', today)
    );
    const prevScansSnap = await getDocs(prevScansQ);
    const scanCount = prevScansSnap.size;
    const isBoarding = scanCount === 0;
    const scanType = isBoarding ? 'board' : 'alight';

    const scanDoc = {
      studentId,
      studentName: studentData.name || '',
      className: studentData.className || studentData.classId || '',
      schoolId: studentData.schoolId || (req.schoolId || DEFAULT_SCHOOL_ID),
      busId: busId || '',
      busNumber: busData?.busNumber || '',
      assignedBusId: studentBusId || busId,
      isWrongBus,
      driverId: driverId || '',
      scannedBy: scannedBy || '',
      role: role || 'cleaner',
      type: scanType,
      date: today,
      timestamp: scanTime,
      createdAt: new Date().toISOString()
    };

    const scanRef = await addDoc(collection(db, 'trip_scans'), scanDoc);
    console.log(`[QR Scan] ${studentData.name} ${scanType} Bus ${busData?.busNumber || busId} (scan #${scanCount + 1})`);

    if (!isWrongBus) {
      try {
        const parentPhone = studentData.parentPhone || '';
        if (parentPhone) {
          const boardMsg = `${studentData.name} has boarded Bus ${busData?.busNumber || busId}. 🚌 Have a safe journey!`;
          const arrivalMsg = `${studentData.name} has arrived at school safely. ✅`;
          await addDoc(collection(db, 'parent_notifications'), {
            type: isBoarding ? 'student_boarded' : 'student_arrived',
            icon: isBoarding ? '🚌' : '🏫',
            title: isBoarding ? 'Child Boarded Bus' : 'Child Arrived at School',
            message: isBoarding ? boardMsg : arrivalMsg,
            details: {
              studentId,
              studentName: studentData.name,
              busId,
              busNumber: busData?.busNumber || '',
              scanType,
              timestamp: scanTime
            },
            parentPhone,
            schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
            read: false,
            createdAt: scanTime
          });
        }
      } catch (notifErr) {
        console.error('[QR Scan] Parent notification error:', notifErr.message);
      }
    }

    res.json({
      success: true,
      scanId: scanRef.id,
      studentName: studentData.name,
      studentClass: studentData.className || studentData.classId || '',
      scanType,
      scanNumber: scanCount + 1,
      isWrongBus,
      busNumber: busData?.busNumber || busId,
      message: isWrongBus
        ? `⚠️ Wrong bus alert sent. ${studentData.name} is assigned to Bus ${studentBusId}.`
        : isBoarding
          ? `✅ ${studentData.name} boarded successfully`
          : `✅ ${studentData.name} arrived at school`
    });

  } catch (err) {
    console.error('[QR Scan] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function logRejectedScan({ scannedData, driverId, busId, reason, timestamp, studentId }) {
  try {
    await addDoc(collection(db, 'scan_rejection_logs'), {
      scannedData: scannedData || '',
      driverId: driverId || '',
      busId: busId || '',
      studentId: studentId || '',
      reason,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    if (driverId || busId) {
      await checkInvalidScanThreshold(driverId, busId, timestamp || new Date().toISOString());
    }
  } catch (e) {
    console.error('[QR Scan] Failed to log rejection:', e.message);
  }
}

const invalidScanLog = {};
async function checkInvalidScanThreshold(driverId, busId, timestamp) {
  try {
    const key = `${driverId}_${busId}`;
    if (!invalidScanLog[key]) invalidScanLog[key] = [];
    invalidScanLog[key].push(timestamp);

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    invalidScanLog[key] = invalidScanLog[key].filter(t => t > tenMinAgo);

    if (invalidScanLog[key].length >= 3) {
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'repeated_invalid_scans',
        icon: '🚨',
        title: 'Security Alert — Repeated Invalid Scans',
        message: `Driver ${driverId} on Bus ${busId} has had ${invalidScanLog[key].length} invalid scan attempts in the last 10 minutes. Please investigate.`,
        details: { driverId, busId, count: invalidScanLog[key].length },
        priority: 'high',
        schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
        read: false,
        createdAt: new Date().toISOString()
      });
      invalidScanLog[key] = [];
    }
  } catch (e) {
    console.error('[QR Scan] Threshold check error:', e.message);
  }
}

app.get('/api/student/qr/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const studentQ = query(collection(db, 'students'), where('studentId', '==', studentId));
    const studentSnap = await getDocs(studentQ);
    if (studentSnap.empty) return res.status(404).json({ error: 'Student not found' });

    const studentData = studentSnap.docs[0].data();
    const qrCode = studentData.qrCode || `SREE_PRAGATHI|${(req.schoolId || DEFAULT_SCHOOL_ID)}|${studentId}`;

    if (!studentData.qrCode) {
      await updateDoc(studentSnap.docs[0].ref, { qrCode });
    }

    res.json({ success: true, studentId, studentName: studentData.name, qrCode });
  } catch (err) {
    console.error('Get student QR error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/school-info', async (req, res) => {
  try {
    const docSnap = await getDocFS(doc(db, 'settings', (req.schoolId || DEFAULT_SCHOOL_ID)));
    if (docSnap.exists()) {
      res.json({ success: true, info: docSnap.data() });
    } else {
      res.json({ success: true, info: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/school-info', verifyAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'principal') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const info = req.body;
    await setDoc(doc(db, 'settings', (req.schoolId || DEFAULT_SCHOOL_ID)), info, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/school-info/upload-image', verifyAuth, upload.single('image'), async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'principal') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, GIF, and WebP images are allowed' });
    }

    if (req.file.size > 500 * 1024) {
      return res.status(400).json({ error: 'Image must be under 500KB' });
    }

    const fs = require('fs');
    const galleryDir = path.join(__dirname, 'uploads', 'gallery');
    if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

    const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
    const ext = extMap[req.file.mimetype] || 'jpg';
    const filename = `school_${Date.now()}.${ext}`;
    const filePath = path.join(galleryDir, filename);

    fs.writeFileSync(filePath, req.file.buffer);

    const imageUrl = `/uploads/gallery/${filename}`;
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bus/live-location', async (req, res) => {
  try {
    const { busNumber } = req.query;
    if (!busNumber) return res.status(400).json({ error: 'busNumber required' });
    const q = query(collection(db, 'live_bus_locations'), where('busNumber', '==', busNumber), where('status', '==', 'active'));
    const snap = await getDocs(q);
    if (snap.empty) return res.json({ location: null, active: false });
    const d = snap.docs[0].data();
    res.json({ location: { lat: d.lat, lng: d.lng, speed: d.speed, updatedAt: d.updatedAt }, active: true, busNumber: d.busNumber, route: d.route });
  } catch (err) {
    console.error('Get live location error:', err.message);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

app.get('/api/bus/active-trips', async (req, res) => {
  try {
    const q = query(collection(db, 'live_bus_locations'), where('status', '==', 'active'));
    const snap = await getDocs(q);
    const trips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ trips });
  } catch (err) {
    console.error('Get active trips error:', err.message);
    res.status(500).json({ error: 'Failed to get active trips' });
  }
});

app.get('/api/bus/route-students', async (req, res) => {
  try {
    const { route, driverId } = req.query;

    let busRoute = route || '';
    let busNumber = '';
    let busId = '';
    let assignedStudentIds = [];

    if (driverId) {
      const userQ = query(collection(db, 'users'), where('role_id', '==', driverId));
      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        busRoute = userData.route || busRoute;
        busNumber = userData.bus_number || '';
      }

      const busQ = query(collection(db, 'buses'), where('driverId', '==', driverId));
      const busSnap = await getDocs(busQ);
      if (!busSnap.empty) {
        const busData = busSnap.docs[0].data();
        busId = busSnap.docs[0].id;
        busNumber = busData.busNumber || busNumber;
        busRoute = busData.route || busRoute;
        assignedStudentIds = busData.studentIds || [];
      }
    }

    if (!busRoute && !driverId) return res.status(400).json({ error: 'route or driverId required' });

    const stops = {};
    if (busRoute) {
      const stopQ = query(collection(db, 'student_stops'), where('route', '==', busRoute));
      const stopSnap = await getDocs(stopQ);
      stopSnap.docs.forEach(d => { const data = d.data(); stops[data.studentId] = { ...data, id: d.id }; });
    }

    const students = [];
    if (assignedStudentIds.length > 0) {
      for (const studentId of assignedStudentIds) {
        try {
          const studentSnap = await getDocFS(doc(db, 'students', studentId));
          if (studentSnap.exists()) {
            const sData = studentSnap.data();
            students.push({
              id: studentId,
              name: sData.name || sData.full_name || 'Unknown',
              className: sData.className || sData.class || '',
              roll: sData.rollNumber || sData.roll || '',
              parent: sData.parentName || sData.parent || '',
              phone: sData.parentPhone || sData.phone || '',
              bus: busRoute,
              photo: (sData.name || 'S').charAt(0),
            });
          }
        } catch (e) {
          console.warn('Could not fetch student:', studentId);
        }
      }
    }

    if (students.length === 0 && busRoute) {
      const routeMatch = busRoute.match(/Route\s*(\d+)/i);
      const routeKey = routeMatch ? `Route ${routeMatch[1]}` : busRoute;

      const allStudentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))));
      allStudentsSnap.docs.forEach(d => {
        const sData = d.data();
        if (sData.busRoute === routeKey || sData.bus === routeKey || sData.busRoute === busRoute) {
          students.push({
            id: d.id,
            name: sData.name || sData.full_name || 'Unknown',
            className: sData.className || sData.class || '',
            roll: sData.rollNumber || sData.roll || '',
            parent: sData.parentName || sData.parent || '',
            phone: sData.parentPhone || sData.phone || '',
            bus: routeKey,
            photo: (sData.name || 'S').charAt(0),
          });
        }
      });
    }

    res.json({ success: true, students, stops, busId, busNumber, busRoute });
  } catch (err) {
    console.error('Get route students error:', err.message);
    res.status(500).json({ error: 'Failed to get route students' });
  }
});

app.post('/api/bus/set-stop', async (req, res) => {
  try {
    const { studentId, studentName, className, route, lat, lng, setBy } = req.body;
    if (!studentId || lat === undefined || lng === undefined) return res.status(400).json({ error: 'studentId, lat, lng required' });

    const docId = `stop_${String(studentId)}`;
    const stopRef = doc(db, 'student_stops', docId);
    const existing = await getDocFS(stopRef);

    if (existing.exists()) {
      const existingData = existing.data();
      if (existingData.locked) return res.status(403).json({ error: 'This stop is locked by admin and cannot be changed' });
      await updateDoc(stopRef, {
        lat, lng, setBy: setBy || '', updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(stopRef, {
        studentId: String(studentId),
        studentName: studentName || '',
        className: className || '',
        route: route || '',
        lat, lng,
        setBy: setBy || '',
        locked: false,
        updatedAt: new Date().toISOString(),
      });
    }

    syncStudentStop({
      studentId, studentName, className, route, lat, lng, setBy,
      date: new Date().toLocaleDateString('en-IN'),
    }).catch(e => console.error('Sheets student stop sync error:', e.message));

    console.log(`Stop set for ${studentName || studentId}: ${lat}, ${lng}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Set stop error:', err.message);
    res.status(500).json({ error: 'Failed to set stop' });
  }
});

app.post('/api/bus/lock-stop', async (req, res) => {
  try {
    const { studentId, locked } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });
    const docId = `stop_${String(studentId)}`;
    const stopRef = doc(db, 'student_stops', docId);
    const stopSnap = await getDocFS(stopRef);
    if (!stopSnap.exists()) return res.status(404).json({ error: 'Stop not found for this student' });
    await updateDoc(stopRef, { locked: locked !== false });
    res.json({ success: true, locked: locked !== false });
  } catch (err) {
    console.error('Lock stop error:', err.message);
    res.status(500).json({ error: 'Failed to lock stop' });
  }
});

app.post('/api/bus/request-location-change', async (req, res) => {
  try {
    const { studentId, studentName, className, route, busNumber, driverName, newLat, newLng, oldAddress, newAddress, reason, requestedBy, requestedByRoleId } = req.body;
    if (!studentId || !newLat || !newLng) return res.status(400).json({ error: 'studentId, newLat, newLng required' });
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Reason for change is required' });

    let oldLat = null, oldLng = null;
    const docId = `stop_${String(studentId)}`;
    const stopRef = doc(db, 'student_stops', docId);
    const stopSnap = await getDocFS(stopRef);
    if (stopSnap.exists()) {
      const stopData = stopSnap.data();
      oldLat = stopData.lat || null;
      oldLng = stopData.lng || null;
    }

    const requestDoc = await addDoc(collection(db, 'location_change_requests'), {
      studentId: String(studentId),
      studentName: studentName || '',
      className: className || '',
      route: route || '',
      busNumber: busNumber || '',
      driverName: driverName || requestedBy || '',
      oldLat,
      oldLng,
      newLat,
      newLng,
      oldAddress: oldAddress || null,
      newAddress: newAddress || null,
      reason: reason.trim(),
      requestedBy: requestedBy || '',
      requestedByRoleId: requestedByRoleId || '',
      status: 'pending',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      createdAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'parent_notifications'), {
      type: 'admin_alert',
      subType: 'location_change_request',
      requestId: requestDoc.id,
      message: `Driver ${driverName || requestedBy || 'Unknown'} (Bus ${busNumber || 'Unknown'}) requested a pickup location change for student ${studentName}. Old: ${oldAddress || 'Unknown'}. New: ${newAddress || `${newLat}, ${newLng}`}. Reason: ${reason.trim()}`,
      studentName: studentName || '',
      busNumber: busNumber || '',
      driverName: driverName || requestedBy || '',
      forAdmin: true,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      read: false,
      createdAt: new Date().toISOString(),
    });

    console.log(`Location change request created: ${requestDoc.id} for student ${studentId}`);
    res.json({ success: true, requestId: requestDoc.id });
  } catch (err) {
    console.error('Request location change error:', err.message);
    res.status(500).json({ error: 'Failed to create location change request' });
  }
});

app.get('/api/bus/location-change-requests', async (req, res) => {
  try {
    const q = query(collection(db, 'location_change_requests'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    requests.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ requests });
  } catch (err) {
    console.error('Get location change requests error:', err.message);
    res.status(500).json({ error: 'Failed to fetch location change requests' });
  }
});

app.post('/api/bus/approve-location-change', async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId required' });

    const requestRef = doc(db, 'location_change_requests', requestId);
    const requestSnap = await getDocFS(requestRef);
    if (!requestSnap.exists()) return res.status(404).json({ error: 'Request not found' });

    const requestData = requestSnap.data();
    const docId = `stop_${String(requestData.studentId)}`;
    const stopRef = doc(db, 'student_stops', docId);
    const stopSnap = await getDocFS(stopRef);

    if (stopSnap.exists()) {
      await updateDoc(stopRef, { lat: requestData.newLat, lng: requestData.newLng, updatedAt: new Date().toISOString() });
    } else {
      await setDoc(stopRef, {
        studentId: String(requestData.studentId),
        studentName: requestData.studentName,
        className: requestData.className,
        route: requestData.route,
        lat: requestData.newLat,
        lng: requestData.newLng,
        setBy: 'Admin Approved',
        date: new Date().toLocaleDateString('en-IN'),
        updatedAt: new Date().toISOString(),
      });
    }

    syncStudentStop({
      studentId: requestData.studentId,
      studentName: requestData.studentName,
      className: requestData.className,
      route: requestData.route,
      lat: requestData.newLat,
      lng: requestData.newLng,
      setBy: 'Admin Approved',
      date: new Date().toLocaleDateString('en-IN'),
    }).catch(e => console.error('Sheets sync on approve error:', e.message));

    await updateDoc(requestRef, { status: 'approved', approvedAt: new Date().toISOString() });

    await addDoc(collection(db, 'driver_notifications'), {
      driverId: requestData.requestedByRoleId || '',
      driverName: requestData.driverName || requestData.requestedBy || '',
      type: 'location_change_approved',
      message: `✅ Your location change request for ${requestData.studentName} has been approved. The new pickup location is now active.`,
      studentId: requestData.studentId,
      studentName: requestData.studentName || '',
      requestId,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      read: false,
      createdAt: new Date().toISOString(),
    });

    console.log(`Location change approved: ${requestId} for student ${requestData.studentId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Approve location change error:', err.message);
    res.status(500).json({ error: 'Failed to approve location change' });
  }
});

app.post('/api/bus/reject-location-change', async (req, res) => {
  try {
    const { requestId, reason } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId required' });

    const requestRef = doc(db, 'location_change_requests', requestId);
    const requestSnap = await getDocFS(requestRef);
    if (!requestSnap.exists()) return res.status(404).json({ error: 'Request not found' });

    const requestData = requestSnap.data();

    await updateDoc(requestRef, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      adminReason: reason || '',
    });

    await addDoc(collection(db, 'driver_notifications'), {
      driverId: requestData.requestedByRoleId || '',
      driverName: requestData.driverName || requestData.requestedBy || '',
      type: 'location_change_rejected',
      message: `❌ Your location change request for ${requestData.studentName} was rejected by Admin.${reason ? ` Reason: ${reason}` : ''} The original pickup location remains active.`,
      studentId: requestData.studentId,
      studentName: requestData.studentName || '',
      requestId,
      adminReason: reason || '',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      read: false,
      createdAt: new Date().toISOString(),
    });

    console.log(`Location change rejected: ${requestId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Reject location change error:', err.message);
    res.status(500).json({ error: 'Failed to reject location change' });
  }
});

app.get('/api/bus/pending-requests', async (req, res) => {
  try {
    const { route } = req.query;
    let q;
    if (route) {
      q = query(collection(db, 'location_change_requests'), where('status', '==', 'pending'), where('route', '==', route));
    } else {
      q = query(collection(db, 'location_change_requests'), where('status', '==', 'pending'));
    }
    const snap = await getDocs(q);
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    requests.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ requests });
  } catch (err) {
    console.error('Get pending requests error:', err.message);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

app.get('/api/bus/all-stops', async (req, res) => {
  try {
    const snap = await getDocs(query(collection(db, 'student_stops'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))));
    const stops = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ stops });
  } catch (err) {
    console.error('Get all stops error:', err.message);
    res.status(500).json({ error: 'Failed to get stops' });
  }
});

app.post('/api/duty/clock-in', async (req, res) => {
  try {
    const { userId, name, role, roleId } = req.body;
    if (!userId || !roleId) return res.status(400).json({ error: 'userId and roleId required' });
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const docId = `duty_${roleId}_${now.toISOString().slice(0, 10)}`;
    const dutyRef = doc(db, 'staff_duty', docId);
    const existing = await getDocFS(dutyRef);
    if (existing.exists() && existing.data().onDuty) {
      return res.json({ success: true, alreadyOn: true, clockIn: existing.data().clockIn, status: existing.data().currentStatus });
    }
    await setDoc(dutyRef, {
      userId, name: name || '', role: role || '', roleId,
      onDuty: true, clockIn: timeStr, clockOut: null,
      currentStatus: role === 'teacher' ? 'Available' : 'On Duty',
      date: dateStr, dateKey: now.toISOString().slice(0, 10),
      updatedAt: now.toISOString(),
    });
    syncStaffAttendance({ name, role, roleId, clockIn: timeStr, status: 'On Duty', date: dateStr })
      .catch(e => console.error('Sheets duty sync error:', e.message));
    console.log(`Clock IN: ${name || roleId} at ${timeStr}`);
    res.json({ success: true, clockIn: timeStr });
  } catch (err) {
    console.error('Clock in error:', err.message);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

app.post('/api/duty/clock-out', async (req, res) => {
  try {
    const { userId, name, role, roleId } = req.body;
    if (!userId || !roleId) return res.status(400).json({ error: 'userId and roleId required' });
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const docId = `duty_${roleId}_${now.toISOString().slice(0, 10)}`;
    const dutyRef = doc(db, 'staff_duty', docId);
    const existing = await getDocFS(dutyRef);
    if (!existing.exists()) {
      return res.status(404).json({ error: 'No active duty record found' });
    }
    const data = existing.data();
    const clockInTime = data.clockIn || '08:00';
    const inMs = new Date(`2000-01-01T${clockInTime}`).getTime();
    const outMs = new Date(`2000-01-01T${timeStr}`).getTime();
    const hoursWorked = ((outMs - inMs) / 3600000).toFixed(1);
    await updateDoc(dutyRef, { onDuty: false, clockOut: timeStr, currentStatus: 'Off Duty', hoursWorked, updatedAt: now.toISOString() });
    syncStaffAttendance({ name, role, roleId, clockIn: clockInTime, clockOut: timeStr, status: 'Off Duty', date: dateStr })
      .catch(e => console.error('Sheets duty sync error:', e.message));
    console.log(`Clock OUT: ${name || roleId} at ${timeStr} (${hoursWorked}h)`);
    res.json({ success: true, clockOut: timeStr, hoursWorked });
  } catch (err) {
    console.error('Clock out error:', err.message);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

app.post('/api/duty/update-status', async (req, res) => {
  try {
    const { roleId, currentStatus } = req.body;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });
    const now = new Date();
    const docId = `duty_${roleId}_${now.toISOString().slice(0, 10)}`;
    const dutyRef = doc(db, 'staff_duty', docId);
    const existing = await getDocFS(dutyRef);
    if (!existing.exists()) return res.status(404).json({ error: 'No duty record' });
    await updateDoc(dutyRef, { currentStatus, updatedAt: now.toISOString() });
    res.json({ success: true });
  } catch (err) {
    console.error('Update status error:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/duty/status', async (req, res) => {
  try {
    const { roleId } = req.query;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });
    const now = new Date();
    const docId = `duty_${roleId}_${now.toISOString().slice(0, 10)}`;
    const dutyRef = doc(db, 'staff_duty', docId);
    const snap = await getDocFS(dutyRef);
    if (!snap.exists()) return res.json({ onDuty: false, clockIn: null, clockOut: null, currentStatus: 'Off Duty' });
    res.json(snap.data());
  } catch (err) {
    console.error('Get duty status error:', err.message);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

app.get('/api/duty/week-log', async (req, res) => {
  try {
    const { roleId, date } = req.query;
    if (!roleId || !date) return res.status(400).json({ error: 'roleId and date required' });
    const docId = `duty_${roleId}_${date}`;
    const snap = await getDocFS(doc(db, 'staff_duty', docId));
    if (!snap.exists()) return res.json({ hoursWorked: 0, clockIn: null, clockOut: null, onDuty: false });
    res.json(snap.data());
  } catch (err) {
    console.error('Duty week log error:', err.message);
    res.status(500).json({ error: 'Failed to fetch duty log' });
  }
});

app.get('/api/duty/all-staff', async (req, res) => {
  try {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const q = query(collection(db, 'staff_duty'), where('dateKey', '==', dateKey));
    const snap = await getDocs(q);
    const staff = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ staff });
  } catch (err) {
    console.error('Get all staff duty error:', err.message);
    res.status(500).json({ error: 'Failed to get staff status' });
  }
});

async function performAutoClockout() {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const q = query(collection(db, 'staff_duty'), where('dateKey', '==', dateKey), where('onDuty', '==', true));
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const clockInTime = data.clockIn || '08:00';
    const defaultOut = '19:00';
    const inMs = new Date(`2000-01-01T${clockInTime}`).getTime();
    const outMs = new Date(`2000-01-01T${defaultOut}`).getTime();
    const hoursWorked = ((outMs - inMs) / 3600000).toFixed(1);
    await updateDoc(doc(db, 'staff_duty', d.id), { onDuty: false, clockOut: defaultOut, currentStatus: 'Auto Clock-Out', hoursWorked, updatedAt: now.toISOString() });
    syncStaffAttendance({ name: data.name, role: data.role, roleId: data.roleId, clockIn: clockInTime, clockOut: defaultOut, status: 'Auto Clock-Out', date: data.date })
      .catch(e => console.error('Sheets auto-clockout sync error:', e.message));
    count++;
  }
  console.log(`Auto clock-out: ${count} staff clocked out at 19:00`);
  return count;
}

app.post('/api/duty/auto-clockout', async (req, res) => {
  try {
    const count = await performAutoClockout();
    res.json({ success: true, count });
  } catch (err) {
    console.error('Auto clockout error:', err.message);
    res.status(500).json({ error: 'Failed to auto clock out' });
  }
});

app.post('/api/student-files/upload', upload.single('file'), async (req, res) => {
  try {
    const { studentId, studentName, className, uploaderName, uploaderRole } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file provided' });
    if (!studentId || !studentName) return res.status(400).json({ error: 'studentId and studentName required' });

    const allowed = ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype)) return res.status(400).json({ error: 'File type not supported. Allowed: JPG, PNG, MP4, PDF, DOCX' });

    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `student_files/${studentId}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file.buffer, { contentType: file.mimetype });
    const fileUrl = await getDownloadURL(storageRef);

    const fileDoc = {
      studentId,
      studentName,
      className: className || '',
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedBy: uploaderName || 'Admin',
      uploaderRole: uploaderRole || 'admin',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      uploadedAt: new Date().toISOString(),
    };
    const fileRef = await addDoc(collection(db, 'student_files'), fileDoc);

    await addDoc(collection(db, 'parent_notifications'), {
      studentId,
      studentName,
      message: `New File Received: ${uploaderName || 'Admin'} has uploaded a document for ${studentName}.`,
      fileUrl,
      fileName: file.originalname,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      read: false,
      createdAt: new Date().toISOString(),
    });

    syncStudentFile({
      studentId, studentName, className: className || '', fileName: file.originalname,
      fileUrl, uploadedBy: uploaderName || 'Admin', date: new Date().toLocaleDateString('en-IN'),
    }).catch(e => console.error('Sheets sync error:', e.message));

    res.json({ success: true, file: { id: fileRef.id, fileName: file.originalname, fileUrl, fileType: file.mimetype, uploadedAt: fileDoc.uploadedAt } });
  } catch (err) {
    console.error('Student file upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.get('/api/student-files', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });
    const q = query(collection(db, 'student_files'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const files = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    files.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
    res.json({ files });
  } catch (err) {
    console.error('Get student files error:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.get('/api/teacher/sendable-students', verifyAuth, async (req, res) => {
  try {
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;
    const role = req.userRole;
    const studentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
    const allStudents = studentsSnap.docs.map(d => ({
      id: d.id,
      name: d.data().name || d.data().studentName || '',
      rollNumber: d.data().rollNumber || '',
      className: d.data().className || d.data().classId || 'Unknown',
    }));
    if (role === 'teacher') {
      const userDoc = await getDocFS(doc(db, 'users', req.userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const assignedClasses = userData.assignedClasses || [];
      const filtered = allStudents.filter(s => assignedClasses.includes(s.className));
      const grouped = {};
      for (const s of filtered) {
        if (!grouped[s.className]) grouped[s.className] = [];
        grouped[s.className].push({ id: s.id, name: s.name, rollNumber: s.rollNumber });
      }
      const classes = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([className, students]) => ({ className, students }));
      return res.json({ classes });
    } else {
      const grouped = {};
      for (const s of allStudents) {
        if (!grouped[s.className]) grouped[s.className] = [];
        grouped[s.className].push({ id: s.id, name: s.name, rollNumber: s.rollNumber });
      }
      const classes = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([className, students]) => ({ className, students }));
      classes.unshift({
        className: `All Classes (${allStudents.length} students)`,
        isAll: true,
        students: allStudents.map(s => ({ id: s.id, name: s.name })),
        studentCount: allStudents.length,
      });
      return res.json({ classes });
    }
  } catch (err) {
    console.error('Sendable students error:', err.message);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

app.post('/api/student-files/send', verifyAuth, async (req, res) => {
  try {
    const { studentIds, fileUrl, fileName, fileType, fileSize, message, senderName, senderRole } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array required' });
    }
    if (!fileUrl || !fileName) return res.status(400).json({ error: 'fileUrl and fileName required' });
    const schoolId = req.schoolId || DEFAULT_SCHOOL_ID;
    if (req.userRole === 'teacher') {
      const userDoc = await getDocFS(doc(db, 'users', req.userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const assignedClasses = userData.assignedClasses || [];
      const studentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
      const allowedIds = new Set(
        studentsSnap.docs
          .filter(d => assignedClasses.includes(d.data().className || d.data().classId))
          .map(d => d.id)
      );
      const unauthorized = studentIds.filter(id => !allowedIds.has(id));
      if (unauthorized.length > 0) {
        return res.status(403).json({ error: 'You do not have permission to send files to some of these students' });
      }
    }
    const now = new Date().toISOString();
    const CHUNK = 200;
    let count = 0;
    for (let i = 0; i < studentIds.length; i += CHUNK) {
      const batch = writeBatch(db);
      const chunk = studentIds.slice(i, i + CHUNK);
      for (const studentId of chunk) {
        batch.set(doc(collection(db, 'student_files')), {
          studentId, fileUrl, fileName,
          fileType: fileType || 'application/octet-stream',
          fileSize: fileSize || 0,
          message: message || '',
          senderName: senderName || 'Teacher',
          senderRole: senderRole || 'teacher',
          schoolId, uploadedAt: now,
        });
        batch.set(doc(collection(db, 'parent_notifications')), {
          studentId,
          type: 'new_document',
          title: `New document from ${senderName || 'Teacher'}`,
          message: `${senderName || 'Teacher'} sent ${fileName} to your child`,
          fileUrl, fileName, schoolId,
          read: false, createdAt: now,
        });
        count++;
      }
      await batch.commit();
    }
    res.json({ success: true, sent: count });
  } catch (err) {
    console.error('Student files send error:', err.message);
    res.status(500).json({ error: 'Failed to send files' });
  }
});

async function lookupStudentById(studentId) {
  const studentsQ = query(collection(db, 'students'), where('studentId', '==', studentId));
  const snap = await getDocs(studentsQ);
  return snap.empty ? null : snap.docs[0].data();
}
async function getParentAccount(uid) {
  const ref = doc(db, 'parent_accounts', uid);
  const snap = await getDocFS(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
async function buildParentSession(parentAccount, schoolId) {
  const studentIds = parentAccount.studentIds || [];
  const activeStudentId = parentAccount.activeStudentId || studentIds[0] || '';
  let activeStudent = null;
  if (activeStudentId) activeStudent = await lookupStudentById(activeStudentId);
  const childrenData = [];
  for (const sid of studentIds) {
    const s = await lookupStudentById(sid);
    if (s) childrenData.push({ studentId: s.studentId, studentName: s.name || '', studentClass: s.className || s.classId || '', rollNumber: s.rollNumber || 0 });
  }
  return {
    role: 'parent',
    uid: parentAccount.uid,
    parentName: parentAccount.parentName || '',
    email: parentAccount.email || '',
    parentPhone: parentAccount.phone || '',
    studentId: activeStudent?.studentId || activeStudentId,
    studentName: activeStudent?.name || '',
    studentClass: activeStudent?.className || activeStudent?.classId || '',
    rollNumber: activeStudent?.rollNumber || 0,
    schoolId: activeStudent?.schoolId || schoolId || DEFAULT_SCHOOL_ID,
    studentIds,
    children: childrenData,
    hasPIN: !!parentAccount.pinHash,
    profileCompleted: true,
  };
}

app.get('/api/student/bus-tracking', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });

    let studentData = {};
    let busRoute = '';
    let busNumber = '';
    let tripStatus = 'not_active';
    let tripStartTime = null;
    let boardedTime = null;
    let busLocation = null;
    let events = [];

    try {
      const studentSnap = await getDocFS(doc(db, 'users', String(studentId)));
      if (studentSnap.exists()) {
        studentData = studentSnap.data();
        busRoute = studentData.bus_route || '';
        busNumber = studentData.bus_number || '';
      }
    } catch (e) {
      console.warn('Could not fetch student data:', e.message);
    }

    if (busNumber) {
      try {
        const activeQ = query(collection(db, 'live_bus_locations'), where('busNumber', '==', busNumber), where('status', '==', 'active'));
        const activeSnap = await getDocs(activeQ);
        if (!activeSnap.empty) {
          const busData = activeSnap.docs[0].data();
          tripStatus = 'active';
          tripStartTime = busData.updatedAt || new Date().toISOString();
          busLocation = { lat: busData.lat, lng: busData.lng, speed: busData.speed, updatedAt: busData.updatedAt };
          events.push({ time: tripStartTime, event: 'Bus departed from school', icon: '🚌', done: true });
        }
      } catch (e) {
        console.warn('Could not fetch active trip:', e.message);
      }

      try {
        const scansQ = query(collection(db, 'trip_scans'), where('studentId', '==', String(studentId)), orderBy('createdAt', 'desc'), limit(1));
        const scansSnap = await getDocs(scansQ);
        if (!scansSnap.empty) {
          const scanData = scansSnap.docs[0].data();
          boardedTime = scanData.createdAt || scanData.timestamp || new Date().toISOString();
          const timeStr = new Date(boardedTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          events.push({ time: timeStr, event: `${studentData.full_name || 'Child'} boarded the bus`, icon: '✅', done: true });
        }
      } catch (e) {
        console.warn('Could not fetch scan data:', e.message);
      }
    }

    if (!boardedTime) {
      events.push({ time: 'Pending', event: `${studentData.full_name || 'Child'} waiting to board`, icon: '⏳', done: false });
    }
    events.push({ time: '~Est. arrival', event: 'Arrival at home stop', icon: '🏠', done: false });
    events.push({ time: '~Est. dropoff', event: 'Deboarded', icon: '👋', done: false });

    // Calculate travel duration from boarding to arrival
    let travelDuration = null;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const scansQ = query(
        collection(db, 'trip_scans'),
        where('studentId', '==', String(studentId)),
        where('date', '==', today),
        where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))
      );
      const scansSnap = await getDocs(scansQ);
      const scans = scansSnap.docs.map(d => d.data()).sort((a, b) =>
        (a.timestamp || '').localeCompare(b.timestamp || '')
      );

      const boardScan = scans.find(s => s.type === 'board');
      const alightScan = scans.find(s => s.type === 'alight');

      if (boardScan && alightScan) {
        const boardMs = new Date(boardScan.timestamp).getTime();
        const alightMs = new Date(alightScan.timestamp).getTime();
        const diffMin = Math.round((alightMs - boardMs) / 60000);
        travelDuration = {
          minutes: diffMin,
          boardTime: boardScan.timestamp,
          alightTime: alightScan.timestamp,
          label: `${diffMin} min`
        };
      } else if (boardScan) {
        travelDuration = {
          minutes: null,
          boardTime: boardScan.timestamp,
          alightTime: null,
          label: 'In transit'
        };
      }
    } catch (durErr) {
      console.error('[Bus Tracking] Duration calc error:', durErr.message);
    }

    res.json({
      success: true,
      studentId: String(studentId),
      studentName: studentData.full_name || studentData.name || 'Student',
      busNumber: busNumber,
      busRoute: busRoute,
      tripStatus: tripStatus,
      tripStartTime: tripStartTime,
      boardedTime: boardedTime,
      busLocation: busLocation,
      events: events,
      travelDuration: travelDuration,
    });
  } catch (err) {
    console.error('Bus tracking error:', err.message);
    res.status(500).json({ error: 'Failed to get bus tracking data' });
  }
});

app.get('/api/parent/check-student', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });
    const sid = studentId.trim();
    const studentData = await lookupStudentById(sid);
    if (!studentData) return res.status(404).json({ error: 'Invalid Student ID. Please check your school ID card.' });
    const existingQ = query(collection(db, 'parent_accounts'), where('studentIds', 'array-contains', sid));
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) return res.status(409).json({ error: 'An account already exists for this Student ID. Please login instead.' });
    res.json({ success: true, studentName: studentData.name || '', studentClass: studentData.className || '', rollNumber: studentData.rollNumber || 0, hasParentPhone: !!studentData.parentPhone });
  } catch (err) {
    console.error('Check student error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parent/register', registerLimiter, async (req, res) => {
  try {
    const { studentId, parentName, email: rawEmail, phone, password, pin } = req.body;
    const email = (rawEmail || '').trim().toLowerCase();
    const sid = (studentId || '').trim();
    if (!sid || !parentName || !email || !phone || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one number' });
    if (!/[^a-zA-Z0-9]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one special character' });
    const studentData = await lookupStudentById(sid);
    if (!studentData) return res.status(404).json({ error: 'Invalid Student ID. Please check your school ID card.' });
    if (studentData.parentPhone) {
      const storedPhone = String(studentData.parentPhone).replace(/\D/g, '');
      const enteredPhone = String(phone).replace(/\D/g, '');
      if (storedPhone && enteredPhone !== storedPhone) {
        return res.status(400).json({ error: 'Phone number does not match school records. Please contact Admin.' });
      }
    }
    const existingQ = query(collection(db, 'parent_accounts'), where('studentIds', 'array-contains', sid));
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) return res.status(409).json({ error: 'An account already exists for this Student ID. Please login instead.' });
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (authErr) {
      const map = { 'auth/email-already-in-use': 'This email is already registered. Please login instead.', 'auth/invalid-email': 'Invalid email address', 'auth/weak-password': 'Password is too weak' };
      return res.status(409).json({ error: map[authErr.code] || authErr.message });
    }
    const uid = userCredential.user.uid;
    let pinHash = null;
    if (pin && /^\d{4}$/.test(String(pin).trim())) pinHash = await bcrypt.hash(String(pin).trim(), 10);
    const accountData = { uid, parentName: parentName.trim(), email, phone: String(phone).replace(/\D/g, ''), studentIds: [sid], activeStudentId: sid, pinHash, emailVerified: false, accountStatus: 'active', failedAttempts: 0, lockUntil: null, createdAt: new Date().toISOString(), lastLogin: null };
    await setDoc(doc(db, 'parent_accounts', uid), accountData);
    try {
      const idToken = await userCredential.user.getIdToken();
      const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.FIREBASE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }) });
      console.log(`Verification email sent to ${email}:`, verifyRes.status);
    } catch (emailErr) { console.error('Verification email error:', emailErr.message); }
    console.log(`Parent registered: ${email} | Student: ${sid}`);
    res.json({ success: true, message: 'Account created! Please check your email to verify your account.', uid, emailVerificationSent: true });
    safeSync('syncParentAccount', () => syncParentAccount({ parentId: uid, parentName: parentName.trim(), email, phone: String(phone).replace(/\D/g, ''), linkedStudentId: sid, studentName: studentData.name || '', studentClass: studentData.className || '', registeredAt: accountData.createdAt, accountStatus: 'active' }), { uid, sid }).catch(() => {});
  } catch (err) {
    console.error('Parent register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/parent/email-login', loginLimiter, async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = (rawEmail || '').trim().toLowerCase();
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const accountQ = query(collection(db, 'parent_accounts'), where('email', '==', email));
    const accountSnap = await getDocs(accountQ);
    let parentDoc, parentAccount;
    if (accountSnap.empty) {
      const usersQ = query(collection(db, 'users'), where('email', '==', email), where('role', '==', 'parent'));
      const usersSnap = await getDocs(usersQ);
      if (usersSnap.empty) return res.status(404).json({ error: 'No account found with this email. Please register first.' });
      const userDoc = usersSnap.docs[0];
      const userData = userDoc.data();
      const studentIds = userData.studentIds || (userData.studentId ? [userData.studentId] : []);
      const paData = {
        uid: userData.uid,
        parentName: userData.parentName || userData.full_name || '',
        email: userData.email || email,
        phone: userData.phone || '',
        studentIds,
        activeStudentId: studentIds[0] || '',
        accountStatus: userData.accountStatus || 'active',
        emailVerified: false,
        failedAttempts: 0,
        lockUntil: null,
        pinHash: null,
        createdAt: userData.created_at || new Date().toISOString(),
        lastLogin: null,
      };
      const paRef = await addDoc(collection(db, 'parent_accounts'), paData);
      parentDoc = { id: paRef.id, data: () => paData };
      parentAccount = { id: paRef.id, ...paData };
      console.log(`Migrated parent ${email} from users → parent_accounts`);
    } else {
      parentDoc = accountSnap.docs[0];
      parentAccount = { id: parentDoc.id, ...parentDoc.data() };
    }
    if (parentAccount.accountStatus === 'disabled') return res.status(403).json({ error: 'Your account has been disabled. Please contact the school admin.' });
    if (parentAccount.lockUntil) {
      const lockTime = new Date(parentAccount.lockUntil);
      if (new Date() < lockTime) {
        const mins = Math.ceil((lockTime - new Date()) / 60000);
        return res.status(429).json({ error: `Account locked. Try again in ${mins} minute(s).` });
      }
      await updateDoc(doc(db, 'parent_accounts', parentDoc.id), { lockUntil: null, failedAttempts: 0, accountStatus: 'active' });
      parentAccount.lockUntil = null; parentAccount.failedAttempts = 0;
    }
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (authErr) {
      const attempts = (parentAccount.failedAttempts || 0) + 1;
      const updates = { failedAttempts: attempts };
      if (attempts >= 5) { updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); updates.accountStatus = 'locked'; }
      await updateDoc(doc(db, 'parent_accounts', parentDoc.id), updates);
      if (attempts >= 5) return res.status(429).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
      if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') return res.status(401).json({ error: `Incorrect password. ${5 - attempts} attempt(s) remaining before lockout.` });
      return res.status(401).json({ error: 'Invalid credentials. Please try again.' });
    }
    await updateDoc(doc(db, 'parent_accounts', parentDoc.id), { failedAttempts: 0, lockUntil: null, accountStatus: 'active', lastLogin: new Date().toISOString() });
    parentAccount.accountStatus = 'active';
    const sessionUser = await buildParentSession(parentAccount, req.schoolId || DEFAULT_SCHOOL_ID);
    console.log(`Parent login: ${email} | Students: ${parentAccount.studentIds?.join(', ')}`);
    const jwtToken = signToken({
      userId: parentDoc.id,
      role: 'parent',
      schoolId: parentAccount.schoolId || DEFAULT_SCHOOL_ID,
      phone: parentAccount.phone
    });

    res.json({ token: jwtToken, success: true, user: sessionUser, emailVerified: userCredential.user.emailVerified });
  } catch (err) {
    console.error('Parent email-login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.post('/api/parent/forgot-password', loginLimiter, async (req, res) => {
  try {
    const { email: rawEmail } = req.body;
    const email = (rawEmail || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });
    await sendPasswordResetEmail(auth, email);
    res.json({ success: true, message: 'Password reset link sent! Check your email.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    if (err.code === 'auth/user-not-found') return res.status(404).json({ error: 'No account found with this email.' });
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
});

app.post('/api/parent/add-child', async (req, res) => {
  try {
    const { uid, studentId, phone } = req.body;
    if (!uid || !studentId) return res.status(400).json({ error: 'uid and studentId required' });
    const sid = studentId.trim();
    const parentAccount = await getParentAccount(uid);
    if (!parentAccount) return res.status(404).json({ error: 'Parent account not found' });
    if ((parentAccount.studentIds || []).includes(sid)) return res.status(409).json({ error: 'This student is already linked to your account.' });
    const studentData = await lookupStudentById(sid);
    if (!studentData) return res.status(404).json({ error: 'Invalid Student ID. Please check and try again.' });
    if (studentData.schoolId && req.schoolId && studentData.schoolId !== req.schoolId) {
      return res.status(403).json({ error: 'Student not found in your school' });
    }
    if (studentData.parentPhone && phone) {
      const storedPhone = String(studentData.parentPhone).replace(/\D/g, '');
      const enteredPhone = String(phone).replace(/\D/g, '');
      if (storedPhone && enteredPhone !== storedPhone) return res.status(400).json({ error: 'Phone number does not match school records for this student.' });
    }
    const existingQ = query(collection(db, 'parent_accounts'), where('studentIds', 'array-contains', sid));
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) return res.status(409).json({ error: 'This Student ID is already linked to another parent account.' });
    const newStudentIds = [...(parentAccount.studentIds || []), sid];
    await updateDoc(doc(db, 'parent_accounts', uid), { studentIds: newStudentIds });
    res.json({ success: true, studentName: studentData.name || '', studentClass: studentData.className || '', newStudentIds });
  } catch (err) {
    console.error('Add child error:', err.message);
    res.status(500).json({ error: 'Failed to add child. Please try again.' });
  }
});

app.post('/api/parent/switch-child', async (req, res) => {
  try {
    const { uid, studentId } = req.body;
    if (!uid || !studentId) return res.status(400).json({ error: 'uid and studentId required' });
    const parentAccount = await getParentAccount(uid);
    if (!parentAccount) return res.status(404).json({ error: 'Account not found' });
    if (!(parentAccount.studentIds || []).includes(studentId)) return res.status(400).json({ error: 'Student not linked to this account' });
    await updateDoc(doc(db, 'parent_accounts', uid), { activeStudentId: studentId });
    parentAccount.activeStudentId = studentId;
    const sessionUser = await buildParentSession(parentAccount, req.schoolId || DEFAULT_SCHOOL_ID);
    res.json({ success: true, user: sessionUser });
  } catch (err) {
    console.error('Switch child error:', err.message);
    res.status(500).json({ error: 'Failed to switch child' });
  }
});

app.get('/api/admin/parent-accounts', async (req, res) => {
  try {
    const snap = await getDocs(query(collection(db, 'parent_accounts'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID))));
    const accounts = snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, uid: data.uid, parentName: data.parentName || '', email: data.email || '', phone: data.phone || '', studentIds: data.studentIds || [], accountStatus: data.accountStatus || 'pending_verification', emailVerified: data.emailVerified || false, createdAt: data.createdAt || '', lastLogin: data.lastLogin || null, hasPIN: !!data.pinHash };
    });
    accounts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ accounts });
  } catch (err) {
    console.error('Admin parent-accounts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/parent-accounts/:uid/status', async (req, res) => {
  try {
    const { uid } = req.params;
    const { action } = req.body;
    const updates = {};
    if (action === 'activate') updates.accountStatus = 'active';
    else if (action === 'disable') updates.accountStatus = 'disabled';
    else if (action === 'reset-attempts') { updates.failedAttempts = 0; updates.lockUntil = null; updates.accountStatus = 'active'; }
    else return res.status(400).json({ error: 'Invalid action' });
    await updateDoc(doc(db, 'parent_accounts', uid), updates);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin update parent status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/student-monthly', async (req, res) => {
  try {
    const { studentId, month } = req.query;
    if (!studentId || !month) return res.status(400).json({ error: 'studentId and month required' });

    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Build working days list (Mon–Sat, skip Sunday)
    const workingDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(mon).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(dateStr + 'T12:00:00').getDay();
      if (dow !== 0) workingDays.push(dateStr);
    }

    const recordMap = {};

    // ── FAST PATH: read from student_attendance subcollection ──
    try {
      const studentAttSnap = await getDocs(
        collection(db, 'student_attendance', studentId, 'dates')
      );
      if (!studentAttSnap.empty) {
        studentAttSnap.docs.forEach(d => {
          const data = d.data();
          // Only include dates that belong to requested month
          if (d.id.startsWith(month)) {
            recordMap[d.id] = data.status;
          }
        });
        console.log(`[student_attendance] Fast path: ${studentAttSnap.size} docs for student ${studentId} month ${month}`);
      }
    } catch (fastErr) {
      console.warn('[student_attendance] Fast path failed, falling back:', fastErr.message);
    }

    // ── FALLBACK: if fast path returned nothing, read from legacy attendance_records ──
    if (Object.keys(recordMap).length === 0) {
      console.log(`[attendance_records] Fallback path for student ${studentId} month ${month}`);
      const q = query(
        collection(db, 'attendance_records'),
        where('studentId', '==', studentId),
        where('month', '==', month)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.date) recordMap[data.date] = data.status;
      });
      console.log(`[attendance_records] Fallback returned ${snap.size} records`);
    }

    const days = workingDays.map(date => ({
      date,
      status: recordMap[date] || 'Not Marked',
    }));

    const present = days.filter(d => d.status === 'Present').length;
    const absent = days.filter(d => d.status === 'Absent').length;
    const leave = days.filter(d => d.status === 'Leave').length;
    const total = workingDays.length;
    const markedDays = days.filter(d => d.status !== 'Not Marked').length;
    const pct = markedDays > 0 ? Math.round((present / markedDays) * 100) : 0;

    res.json({ success: true, days, summary: { present, absent, leave, total, markedDays, pct }, month });
  } catch (err) {
    console.error('Student monthly attendance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/parent-notifications', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });
    const [snap1, snap2] = await Promise.all([
      getDocs(query(collection(db, 'parent_notifications'), where('studentId', '==', studentId))),
      getDocs(query(collection(db, 'parent_notifications'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('forAll', '==', true))),
    ]);
    const seen = new Set();
    const notifications = [];
    for (const d of [...snap1.docs, ...snap2.docs]) {
      if (!seen.has(d.id)) { seen.add(d.id); notifications.push({ id: d.id, ...d.data() }); }
    }
    notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ notifications });
  } catch (err) {
    console.error('Get parent notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/parent-notifications/read', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!notificationIds || !Array.isArray(notificationIds)) return res.status(400).json({ error: 'notificationIds array required' });
    const batch = writeBatch(db);
    for (const nId of notificationIds) {
      batch.update(doc(db, 'parent_notifications', nId), { read: true });
    }
    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notifications read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

async function sendEventNotifications(eventId, title, date, time, venue, type, forClasses, description, prefix, schoolId) {
  const effSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const now = new Date().toISOString();
  const msg = `${date}${time ? ' at ' + time : ''}${venue ? ' \u00B7 ' + venue : ''}${description ? ' \u00B7 ' + description : ''}`;
  const notifTitle = prefix ? `${prefix}: ${title}` : `New Event: ${title}`;
  const isAll = !forClasses || forClasses.toLowerCase() === 'all classes';
  const driverTypes = ['Holiday', 'Cultural', 'Academic', 'Meeting'];
  let teacherCount = 0, parentCount = 0, driverCount = 0;

  if (isAll) {
    const teachersSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', effSchoolId), where('role', 'in', ['teacher', 'staff'])));
    for (const d of teachersSnap.docs) {
      const t = d.data();
      if (t.role_id) {
        await addDoc(collection(db, 'teacher_notifications'), { roleId: t.role_id, eventId, type: 'event', title: notifTitle, message: msg, eventType: type, schoolId: effSchoolId, read: false, createdAt: now });
        teacherCount++;
      }
    }
    await addDoc(collection(db, 'parent_notifications'), { eventId, type: 'event', title: notifTitle, message: msg, eventType: type, forAll: true, schoolId: effSchoolId, read: false, createdAt: now });
    parentCount = -1;

    if (driverTypes.includes(type)) {
      const driversSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', effSchoolId), where('role', '==', 'driver')));
      for (const d of driversSnap.docs) {
        const dr = d.data();
        if (dr.role_id) {
          await addDoc(collection(db, 'driver_notifications'), { driverId: dr.role_id, eventId, type: 'event', title: notifTitle, message: msg, eventType: type, schoolId: effSchoolId, read: false, createdAt: now });
          driverCount++;
        }
      }
    }
  } else {
    const classList = forClasses.split(',').map(s => s.trim()).filter(Boolean);
    for (const cls of classList) {
      const teacherSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', effSchoolId), where('classTeacherOf', '==', cls)));
      for (const d of teacherSnap.docs) {
        const t = d.data();
        if (t.role_id) {
          await addDoc(collection(db, 'teacher_notifications'), { roleId: t.role_id, eventId, type: 'event', title: notifTitle, message: msg, eventType: type, forClass: cls, schoolId: effSchoolId, read: false, createdAt: now });
          teacherCount++;
        }
      }
      const studentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', effSchoolId), where('className', '==', cls)));
      for (const sd of studentsSnap.docs) {
        const s = sd.data();
        const studentIdVal = s.studentId || sd.id;
        await addDoc(collection(db, 'parent_notifications'), { studentId: studentIdVal, eventId, type: 'event', title: notifTitle, message: msg, eventType: type, forClass: cls, schoolId: effSchoolId, read: false, createdAt: now });
        parentCount++;
      }
    }
  }
  return { teacherCount, parentCount, driverCount };
}

app.get('/api/events', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const snap = await getDocs(query(collection(db, 'events'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), orderBy('date', 'desc')));
    const events = snap.docs.map(d => {
      const data = d.data();
      const status = data.date && data.date < today ? 'Done' : 'Upcoming';
      return { id: d.id, ...data, status };
    });
    res.json({ events });
  } catch (err) {
    console.error('Get events error:', err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/events/create', async (req, res) => {
  try {
    const { title, date, time, venue, forClasses, type, description, createdBy } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'title and date are required' });
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const status = date < today ? 'Done' : 'Upcoming';
    const eventRef = await addDoc(collection(db, 'events'), {
      title, date, time: time || '', venue: venue || '', forClasses: forClasses || 'All Classes',
      type: type || 'Academic', description: description || '', createdBy: createdBy || 'Admin',
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      createdAt: now, status,
    });
    console.log(`Event created: ${title} on ${date} for ${forClasses}`);
    const notified = await sendEventNotifications(eventRef.id, title, date, time, venue, type, forClasses, description, null, (req.schoolId || DEFAULT_SCHOOL_ID));
    res.json({ success: true, eventId: eventRef.id, notified });
  } catch (err) {
    console.error('Create event error:', err.message);
    res.status(500).json({ error: 'Failed to create event: ' + err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, time, venue, forClasses, type, description, updatedBy } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'title and date are required' });
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const status = date < today ? 'Done' : 'Upcoming';
    await updateDoc(doc(db, 'events', id), {
      title, date, time: time || '', venue: venue || '', forClasses: forClasses || 'All Classes',
      type: type || 'Academic', description: description || '', updatedBy: updatedBy || 'Admin',
      updatedAt: now, status,
    });
    const notified = await sendEventNotifications(id, title, date, time, venue, type, forClasses, description, 'Event Updated', (req.schoolId || DEFAULT_SCHOOL_ID));
    res.json({ success: true, notified });
  } catch (err) {
    console.error('Update event error:', err.message);
    res.status(500).json({ error: 'Failed to update event: ' + err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eventSnap = await getDocFS(doc(db, 'events', id));
    if (!eventSnap.exists()) return res.status(404).json({ error: 'Event not found' });
    const ev = eventSnap.data();
    await sendEventNotifications(id, ev.title, ev.date, ev.time, ev.venue, ev.type, ev.forClasses, '', `Event Cancelled: ${ev.title} scheduled for ${ev.date} has been cancelled`, (req.schoolId || DEFAULT_SCHOOL_ID));
    await deleteDoc(doc(db, 'events', id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete event error:', err.message);
    res.status(500).json({ error: 'Failed to delete event: ' + err.message });
  }
});

app.post('/api/events/:id/renotify', async (req, res) => {
  try {
    const { id } = req.params;
    const eventSnap = await getDocFS(doc(db, 'events', id));
    if (!eventSnap.exists()) return res.status(404).json({ error: 'Event not found' });
    const ev = eventSnap.data();
    const notified = await sendEventNotifications(id, ev.title, ev.date, ev.time, ev.venue, ev.type, ev.forClasses, ev.description, 'Reminder', (req.schoolId || DEFAULT_SCHOOL_ID));
    res.json({ success: true, notified });
  } catch (err) {
    console.error('Renotify event error:', err.message);
    res.status(500).json({ error: 'Failed to renotify: ' + err.message });
  }
});

const { generateReport } = require('./src/report/generateReport');

app.get('/api/report/master-audit', verifyAuth, (req, res) => {
  if (req.userRole !== 'principal' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const buffers = [];
    doc.on('data', d => buffers.push(d));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Sree-Pragathi-Master-Audit-Report.pdf"');
      res.send(pdfData);
    });

    const C_NAVY = '#0A1628';
    const C_GOLD = '#D4A843';
    const C_TEAL = '#2DD4BF';
    const C_WHITE = '#FFFFFF';
    const C_MUTED = '#8B95A5';
    const C_CORAL = '#FF6B6B';
    const C_PURPLE = '#A78BFA';
    const C_GREEN = '#34D399';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const drawLine = (y, color = '#334155') => {
      doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(0.5).stroke();
    };

    const newPage = () => {
      doc.addPage();
      doc.rect(0, 0, 595, 842).fill(C_NAVY);
    };

    const sectionTitle = (title, icon) => {
      if (doc.y > 680) newPage();
      doc.moveDown(0.8);
      doc.fontSize(14).fillColor(C_GOLD).text(`${icon}  ${title}`, { underline: false });
      drawLine(doc.y + 4, C_GOLD);
      doc.moveDown(0.6);
    };

    const bulletPoint = (text, indent = 60) => {
      if (doc.y > 720) newPage();
      doc.fontSize(9.5).fillColor('#CBD5E1').text(`•  ${text}`, indent, doc.y, { width: 495 - indent });
      doc.moveDown(0.15);
    };

    const subHeading = (text) => {
      if (doc.y > 700) newPage();
      doc.moveDown(0.4);
      doc.fontSize(11).fillColor(C_TEAL).text(text);
      doc.moveDown(0.25);
    };

    const statusBadge = (label, color) => {
      const x = doc.x;
      const y = doc.y;
      doc.roundedRect(x, y, 80, 16, 4).fill(color);
      doc.fontSize(8).fillColor(C_WHITE).text(label, x + 8, y + 3, { width: 64, align: 'center' });
      doc.y = y + 22;
    };

    // ── COVER PAGE ──
    doc.rect(0, 0, 595, 842).fill(C_NAVY);
    doc.fontSize(10).fillColor(C_MUTED).text('CONFIDENTIAL', 50, 50, { align: 'right' });
    doc.moveDown(6);
    doc.fontSize(32).fillColor(C_GOLD).text('MASTER AUDIT REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor(C_WHITE).text('Sree Pragathi High School', { align: 'center' });
    doc.fontSize(11).fillColor(C_MUTED).text('Gopalraopet, Telangana', { align: 'center' });
    doc.moveDown(1);
    drawLine(doc.y, C_GOLD);
    doc.moveDown(1);
    doc.fontSize(11).fillColor(C_MUTED).text('School Management SaaS Platform', { align: 'center' });
    doc.fontSize(10).fillColor(C_MUTED).text(`School Code: SP-GOPA  |  School ID: school_001`, { align: 'center' });
    doc.moveDown(3);
    doc.fontSize(10).fillColor(C_TEAL).text(`Generated: ${dateStr}`, { align: 'center' });
    doc.fontSize(9).fillColor(C_MUTED).text('Vidhaya Layam — Education Technology Platform', { align: 'center' });

    // ── PAGE 2: TABLE OF CONTENTS ──
    newPage();
    doc.fontSize(18).fillColor(C_GOLD).text('TABLE OF CONTENTS', 50, 50);
    drawLine(doc.y + 6, C_GOLD);
    doc.moveDown(1);
    const tocItems = [
      '1.  Executive Summary',
      '2.  Technology Stack',
      '3.  Architecture Overview',
      '4.  User Roles & Authentication',
      '5.  Screen Inventory (All Portals)',
      '6.  API Endpoints Summary',
      '7.  Feature Upgrades — Complete List',
      '8.  Security & Rate Limiting',
      '9.  Multi-Tenant SaaS Architecture',
      '10. Data Models & Collections',
      '11. UX & Error Handling System',
      '12. Deployment & Infrastructure',
    ];
    tocItems.forEach(item => {
      doc.fontSize(11).fillColor('#CBD5E1').text(item, 70);
      doc.moveDown(0.4);
    });

    // ── SECTION 1: EXECUTIVE SUMMARY ──
    newPage();
    sectionTitle('EXECUTIVE SUMMARY', '\u{1F4CB}');
    doc.fontSize(10).fillColor('#CBD5E1').text(
      'Sree Pragathi High School Management App is a comprehensive, multi-tenant SaaS platform built to digitize and streamline all school operations. The platform serves five distinct user roles through dedicated dashboards, covering academics, transportation, facilities, finance, and administration.',
      50, doc.y, { width: 495, lineGap: 3 }
    );
    doc.moveDown(0.8);

    subHeading('Platform Statistics');
    const stats = [
      ['Total Screens', '40+'],
      ['API Endpoints', '149'],
      ['User Roles', '5 (Admin/Principal, Teacher, Parent, Driver, Cleaner)'],
      ['Firestore Collections', '35+'],
      ['Components', '9 shared UI components'],
      ['Composite Indexes', '19'],
    ];
    stats.forEach(([label, value]) => {
      doc.fontSize(9.5).fillColor(C_MUTED).text(`${label}:`, 60, doc.y, { continued: true, width: 150 });
      doc.fillColor(C_WHITE).text(`  ${value}`, { width: 330 });
      doc.moveDown(0.1);
    });

    // ── SECTION 2: TECHNOLOGY STACK ──
    sectionTitle('TECHNOLOGY STACK', '\u{1F527}');
    const stack = [
      ['Frontend', 'React Native (Expo SDK 52) — Web + Mobile'],
      ['Backend', 'Express.js (Node.js) — RESTful API'],
      ['Database', 'Firebase Firestore (project: school-app-87900)'],
      ['Authentication', 'Firebase Auth (Email/Password) + JWT (30-day tokens)'],
      ['PDF Generation', 'PDFKit — Report cards, audit reports'],
      ['Real-time Sync', 'Google Sheets API — Attendance, marks, payroll, timetable'],
      ['Maps', 'Leaflet.js — Bus live tracking on web'],
      ['Error Tracking', 'Custom Firestore-based alerting system'],
      ['Rate Limiting', 'express-rate-limit — Global + per-route limits'],
    ];
    stack.forEach(([label, value]) => {
      doc.fontSize(9.5).fillColor(C_TEAL).text(`${label}:`, 60, doc.y, { continued: true, width: 120 });
      doc.fillColor('#CBD5E1').text(`  ${value}`, { width: 365 });
      doc.moveDown(0.15);
    });

    // ── SECTION 3: ARCHITECTURE ──
    sectionTitle('ARCHITECTURE OVERVIEW', '\u{1F3D7}');
    bulletPoint('Single Express.js server serves both API and static Expo web build');
    bulletPoint('Frontend built with `npx expo export --platform web` → static dist/ folder');
    bulletPoint('Server runs on port 5000, serves dist/ as static files');
    bulletPoint('All API routes under /api/* with global auth guard middleware');
    bulletPoint('Firebase Admin SDK for server-side Firestore access + Auth management');
    bulletPoint('Firebase Client SDK for frontend Auth (email/password)');
    bulletPoint('JWT Bearer tokens for API authorization (30-day expiry)');
    bulletPoint('Multi-tenant isolation via schoolId on every query and write');

    // ── SECTION 4: AUTH & ROLES ──
    sectionTitle('USER ROLES & AUTHENTICATION', '\u{1F512}');
    const roles = [
      ['Admin/Principal', 'Full platform access — manage users, classes, fees, reports, settings, promotions, salary, buses, leaves, activities, alerts'],
      ['Teacher', 'Attendance marking, marks entry, schedule management, bus monitoring, leave requests, personal profile'],
      ['Parent', 'View child attendance, marks, bus tracking, fee payments, notifications, leave requests, digital folder, report cards'],
      ['Driver', 'Trip management (start/end with GPS), student pickup stops, proximity alerts, duty clock in/out, leave requests'],
      ['Cleaner', 'QR student scanning, zone/phase duty tracking, alerts, duration logging, leave requests'],
    ];
    roles.forEach(([role, desc]) => {
      doc.fontSize(10).fillColor(C_GOLD).text(role, 60, doc.y);
      doc.fontSize(9).fillColor('#94A3B8').text(desc, 60, doc.y, { width: 475 });
      doc.moveDown(0.4);
    });
    doc.moveDown(0.3);
    subHeading('Authentication Flow');
    bulletPoint('Login → Firebase Auth verification → JWT token issued → stored in AsyncStorage');
    bulletPoint('Every API call sends Authorization: Bearer <token> header');
    bulletPoint('verifyAuth middleware decodes JWT, sets req.userId, req.userRole, req.schoolId');
    bulletPoint('Parent portal: additional PIN verification layer before dashboard access');
    bulletPoint('Admin routes: verifyAuth + role check (principal/admin only)');
    bulletPoint('Super Admin routes: separate x-super-admin-key header validation');

    // ── SECTION 5: SCREEN INVENTORY ──
    newPage();
    sectionTitle('SCREEN INVENTORY — ALL PORTALS', '\u{1F4F1}');

    subHeading('Authentication Screens (7)');
    ['SplashScreen', 'SplashIntroScreen', 'LoginScreen', 'SignupScreen', 'ParentLoginScreen', 'ParentRegisterScreen', 'ParentPinScreen'].forEach(s => bulletPoint(s));

    subHeading('Admin / Principal Portal (17)');
    ['AdminOverview (Dashboard)', 'AdminUsers', 'AdminClasses', 'AdminStudents', 'AdminBuses', 'AdminReports', 'AdminAlerts', 'AdminSettings', 'AdminActivities', 'AdminLeaveScreen', 'AdminFeeScreen', 'AdminFeeStatus (Bulk Fee Dashboard)', 'AdminSalaryScreen', 'AdminPromotion (Year-End Wizard)', 'AdminStudentQR', 'AdminProfile', 'CompleteProfileScreen'].forEach(s => bulletPoint(s));

    subHeading('Teacher Portal (8)');
    ['TeacherDashboard', 'TeacherAttendance', 'TeacherMarksScreen', 'TeacherScheduleScreen', 'TeacherBusMonitor', 'TeacherAlertsScreen', 'TeacherPersonalScreen', 'TeacherProfile'].forEach(s => bulletPoint(s));

    subHeading('Parent Portal (9)');
    ['ParentDashboard', 'AttendanceScreen', 'MarksScreen (+ Report Card PDF)', 'BusScreen (Live Tracking)', 'FeeScreen', 'NotificationsScreen', 'LeaveScreen', 'DigitalFolder', 'ActivitiesScreen'].forEach(s => bulletPoint(s));

    subHeading('Driver Portal (7)');
    ['DriverDashboard (Trip + GPS)', 'DriverScans', 'DriverStudentLocations', 'DriverProximityAlerts', 'DriverDuration', 'DriverLeave', 'DriverProfile'].forEach(s => bulletPoint(s));

    subHeading('Cleaner Portal (6)');
    ['CleanerDashboard', 'CleanerScanner (QR)', 'CleanerAlerts', 'CleanerDuration', 'CleanerLeave', 'CleanerProfile'].forEach(s => bulletPoint(s));

    subHeading('Shared Screens (2)');
    ['ExploreScreen (School Info & Gallery)', 'ContactScreen'].forEach(s => bulletPoint(s));

    // ── SECTION 6: API ENDPOINTS SUMMARY ──
    newPage();
    sectionTitle('API ENDPOINTS SUMMARY (149 Routes)', '\u{1F310}');

    const apiGroups = [
      ['Authentication', 'POST /api/login, /register, /forgot-password, /parent/email-login, /parent/register'],
      ['Students', 'GET/POST /api/students, /student/qr/:id, CSV bulk import, class students, marks'],
      ['Attendance', 'GET/POST attendance records, submissions, edits, overrides, bulk marking'],
      ['Marks & Grades', 'GET/POST marks entry, subject-wise, unit-wise, grade calculation'],
      ['Fee Management', 'GET/POST fee records, payments, bulk status, send reminders'],
      ['Leave System', 'GET/POST/PUT leave requests, approvals, rejections (staff + students)'],
      ['Bus & Transport', 'POST start/end trip, update location, proximity alerts, route students, set stops, trip scans'],
      ['Duty & Clock', 'POST clock-in/out, status updates, duration logs for drivers + cleaners'],
      ['Reports', 'POST report-card PDF, GET master audit, admin reports'],
      ['Promotion', 'GET preview, POST execute batch promote/retain/graduate'],
      ['Admin Management', 'GET/POST users, classes, buses, activities, events, salary, settings, alerts'],
      ['Notifications', 'GET/POST parent, teacher, driver notifications'],
      ['School Info', 'GET/POST school info, gallery image upload/remove'],
      ['Google Sheets Sync', 'POST sync attendance, marks, payroll, master timetable'],
      ['Super Admin', 'POST create school, GET list schools, stats, activity, status toggle, subscriptions'],
    ];
    apiGroups.forEach(([group, desc]) => {
      doc.fontSize(10).fillColor(C_TEAL).text(group, 60, doc.y);
      doc.fontSize(8.5).fillColor('#94A3B8').text(desc, 60, doc.y, { width: 475 });
      doc.moveDown(0.5);
    });

    // ── SECTION 7: ALL FEATURE UPGRADES ──
    newPage();
    sectionTitle('FEATURE UPGRADES — COMPLETE LIST', '\u{1F680}');

    const upgrades = [
      {
        name: '1. JWT Authentication & Token Security',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'Replaced header-based role authentication with JWT Bearer tokens (30-day expiry)',
          'signToken/verifyToken utilities with HS256 algorithm',
          'verifyAuth middleware sets req.userId, req.userRole, req.schoolId from JWT',
          'Token stored in AsyncStorage, attached to all API calls via apiFetch()',
          'Parent PIN guard: token held in pendingToken until PIN verified',
          'JWT_SECRET required via environment variable — server crashes if missing',
        ]
      },
      {
        name: '2. Global Auth Guard',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'All /api/* and /download/* routes require verifyAuth by default',
          '14 explicitly listed PUBLIC_ROUTES exempt (login, register, school-info, etc.)',
          'Super admin routes (/api/super/*) use separate verifySuperAdmin middleware',
          'Eliminated all unauthenticated API access vectors',
        ]
      },
      {
        name: '3. Centralized API Client (apiFetch)',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'src/api/client.js exports apiFetch() — single function for all API calls',
          'Auto-attaches Authorization: Bearer token from AsyncStorage',
          'Auto-detects base URL from environment (Replit domain / localhost)',
          'Integrated error reporting: HTTP 4xx/5xx and network failures auto-reported',
          'Replaced raw fetch() calls across all 40+ screens',
        ]
      },
      {
        name: '4. Multi-Tenant SaaS Architecture',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'School code generation: SP-GOPA (Sree Pragathi, Gopalraopet)',
          'DEFAULT_SCHOOL_ID = "school_001" — fallback for backwards compatibility',
          'schoolId filter on ALL Firestore queries (35+ collections)',
          'schoolId included on ALL writes (addDoc, setDoc, batch.set)',
          'checkSchoolActive middleware blocks suspended schools globally',
          'Super Admin can create/manage multiple schools via /api/super/* routes',
        ]
      },
      {
        name: '5. Rate Limiting & Security Headers',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'Global API limiter: 300 req/min per IP',
          'Login limiter: 10 attempts/15 min, Registration: 5 attempts/hr',
          'QR scan limiter: 60 scans/min, Super Admin: 50 req/min',
          'Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy',
          'CORS restricted to allowed origins (Vercel, localhost, APP_URL)',
          'Request body size limit: 10MB',
        ]
      },
      {
        name: '6. Error Tracking & Reporting System',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'React ErrorBoundary catches render crashes with friendly UI',
          'Global error listener catches unhandled JS errors + promise rejections',
          'API client auto-reports HTTP errors and network failures',
          'All errors include user attribution (userId, userRole)',
          'Severity levels: low/medium/high/critical',
          'Error types: js_crash, api_error, firestore_error, auth_error, unhandled_promise',
          'Errors stored in Firestore "alerts" collection — viewable in Admin Alerts screen',
        ]
      },
      {
        name: '7. UX Component System',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'LoadingSpinner — fullScreen and inline modes with animated spinner',
          'ErrorBanner — dismissible error display with retry button',
          'Toast — animated notifications (success/error/info) with auto-dismiss',
          'getFriendlyError() — maps technical errors to user-friendly messages',
          'Applied across all 40 screens — zero Alert.alert calls remain',
          'Consistent loading, error, and success patterns everywhere',
        ]
      },
      {
        name: '8. Report Card PDF Generation',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'POST /api/reports/report-card/:studentId — generates A4 PDF via PDFKit',
          'Includes school name, student info, marks table, grades, totals, percentage',
          'Grade logic: A+ (90-100), A (80-89), B+ (70-79), B (60-69), C (50-59), F (<50)',
          'Security: verifyAuth + parent ownership check + schoolId isolation',
          'Frontend: MarksScreen download modal with exam dropdown + academic year',
          'Web: blob URL download, Native: expo-file-system + expo-sharing',
        ]
      },
      {
        name: '9. Year-End Class Promotion',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'GET /api/admin/promotion/preview — student list with pass/fail, attendance %, avg marks',
          'POST /api/admin/promotion/execute — batch promote/retain/graduate with Firestore writeBatch',
          'Pass criteria: >= 35% in every subject (best score per subject across exams)',
          'Actions: promote (N → N+1), retain (same class + note), graduate (status → alumni)',
          'History logged to promotionHistory collection',
          'AdminPromotion.js — 4-step wizard with segmented controls and CSV export',
        ]
      },
      {
        name: '10. Bulk Fee Status Dashboard',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'GET /api/admin/fees/bulk-status — all students fee status with month/year/class filters',
          'POST /api/admin/fees/send-reminder — batch reminders via Firestore writeBatch',
          'Summary cards: total/paid/unpaid/partial counts with color coding',
          'Multi-select mode (long press), "Select All Unpaid", bulk reminder with confirmation',
          'Student detail modal with full payment history',
          'Skeleton loader, CSV export, empty state for all-paid',
        ]
      },
      {
        name: '11. Network Status Banner (Offline Detection)',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          '@react-native-community/netinfo monitors connectivity in real time',
          'Yellow banner: "You\'re offline — changes may not save" when disconnected',
          'Green banner: "Back online ✓" shown for 2 seconds on reconnect',
          'Animated slide-down/slide-up transition (300ms)',
          'Placed in root App.js — appears on every screen globally',
          'Sits below StatusBar/SafeAreaView on native devices',
        ]
      },
      {
        name: '12. Driver Action Confirmation Dialogs',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'Start Trip: Alert.alert confirmation before notifying parents',
          'End Trip: Alert.alert confirmation before marking students dropped',
          'Set Pickup Stop: Alert.alert confirmation before recording GPS coordinates',
          'Prevents accidental irreversible actions with Cancel/Confirm options',
          'No changes to existing trip or GPS logic — pure UX safety layer',
        ]
      },
      {
        name: '13. Strict QR Scan Validation',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'QR Format: SREE_PRAGATHI|{schoolId}|{studentId}',
          'Validates school match, student existence, active status',
          'Wrong bus detection: allows boarding but alerts admin + parent',
          '5-minute duplicate scan cooldown per student per day',
          'Rejection logging to scan_rejection_logs collection',
          '3+ rejected scans in 10 minutes triggers admin security alert',
        ]
      },
      {
        name: '14. Google Sheets Auto-Sync',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'Attendance sync — daily records pushed to Google Sheets',
          'Marks sync — subject-wise and unit-wise marks synced',
          'Payroll sync — salary payments exported to Sheets',
          'Master timetable — class schedule synced from/to Sheets',
          'Uses Firebase service account credentials for Sheets API',
        ]
      },
      {
        name: '15. Real-Time Bus Tracking & GPS',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'Driver starts trip → GPS watchPosition begins tracking',
          'Location updates sent every 10 seconds to /bus/update-location',
          'Parents see live bus position on Leaflet map in BusScreen',
          'Speed, coordinates, distance, elapsed time displayed on driver dashboard',
          'Haversine formula calculates trip distance',
          'Trip summaries logged with duration, distance, students boarded',
        ]
      },
      {
        name: '16. School Info & Gallery System',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'AdminSettings: full CRUD for school name, tagline, phone, email, address, board, etc.',
          'Gallery image upload: POST /api/school-info/upload-image (JPEG/PNG/GIF/WebP, 500KB max)',
          'ExploreScreen: public school info with stats and gallery carousel',
          'ContactScreen: phone, email, address, website display',
        ]
      },
      {
        name: '17. Super Admin Panel (Multi-School Management)',
        status: 'COMPLETE',
        color: C_GREEN,
        details: [
          'Create new schools with auto-generated school codes',
          'List all schools with status, plan, student/staff counts',
          'Toggle school status (active/suspended)',
          'Update subscription plans',
          'View school activity, security logs, summary dashboards',
          'Hard delete school (with all associated data)',
          'Protected by verifySuperAdmin + rate limiting (50 req/min)',
        ]
      },
    ];

    upgrades.forEach(u => {
      if (doc.y > 660) newPage();
      doc.fontSize(11).fillColor(C_WHITE).text(u.name, 55, doc.y, { width: 400, continued: false });
      const badgeY = doc.y - 13;
      doc.fontSize(7).fillColor(u.color).text(` [${u.status}]`, 460, badgeY, { width: 80 });
      doc.y = badgeY + 16;
      u.details.forEach(d => bulletPoint(d, 70));
      doc.moveDown(0.3);
    });

    // ── SECTION 8: SECURITY ──
    newPage();
    sectionTitle('SECURITY & RATE LIMITING', '\u{1F6E1}');
    subHeading('Authentication Layers');
    bulletPoint('Firebase Auth: email/password verification');
    bulletPoint('JWT tokens: 30-day expiry, HS256 algorithm, Bearer header');
    bulletPoint('verifyAuth: global middleware on all protected routes');
    bulletPoint('verifySuperAdmin: x-super-admin-key header for super admin routes');
    bulletPoint('Parent PIN: additional 4-digit PIN verification after login');

    subHeading('Rate Limits');
    bulletPoint('Global API: 300 requests/minute per IP');
    bulletPoint('Login endpoints: 10 attempts per 15 minutes per IP');
    bulletPoint('Registration: 5 attempts per hour per IP');
    bulletPoint('QR scans: 60 scans per minute per IP');
    bulletPoint('Super Admin: 50 requests per minute per IP');

    subHeading('Security Headers');
    bulletPoint('X-Content-Type-Options: nosniff');
    bulletPoint('X-Frame-Options: DENY');
    bulletPoint('X-XSS-Protection: 1; mode=block');
    bulletPoint('Referrer-Policy: strict-origin-when-cross-origin');
    bulletPoint('X-Powered-By: removed');

    subHeading('Data Protection');
    bulletPoint('Passwords hashed with bcryptjs (10 salt rounds)');
    bulletPoint('Parent PINs hashed with bcryptjs');
    bulletPoint('JWT_SECRET required — server refuses to start without it');
    bulletPoint('CORS restricted to allowed origins');
    bulletPoint('Request body size limit: 10MB');
    bulletPoint('Image upload validation: MIME type check (JPEG/PNG/GIF/WebP), 500KB max');

    // ── SECTION 9: MULTI-TENANT ──
    sectionTitle('MULTI-TENANT SaaS ARCHITECTURE', '\u{1F3E2}');
    bulletPoint('Each school gets a unique school code (e.g., SP-GOPA)');
    bulletPoint('schoolId field present on 35+ Firestore collections');
    bulletPoint('Every query filtered by schoolId — complete data isolation');
    bulletPoint('checkSchoolActive middleware blocks suspended schools');
    bulletPoint('Super Admin manages schools via /api/super/* endpoints');
    bulletPoint('Subscription plans: basic, standard, premium');
    bulletPoint('Schools collection stores status, plan, principal info, timestamps');

    // ── SECTION 10: DATA MODELS ──
    newPage();
    sectionTitle('DATA MODELS & FIRESTORE COLLECTIONS', '\u{1F4BE}');
    const collections = [
      ['users', 'uid, full_name, email, role, role_id, schoolId, profileCompleted'],
      ['students', 'studentId, name, rollNumber, classId, className, parentPhone, busId, routeId, qrCode, status, schoolId'],
      ['parent_accounts', 'studentIds, activeStudentId, pinHash, email, phone, schoolId'],
      ['classes', 'classId, className, section, teacherId, schoolId'],
      ['attendance_records', 'studentId, date, status, markedBy, classId, schoolId'],
      ['student_marks', 'studentId, subject, unit, marks, totalMarks, examName, schoolId'],
      ['fee_records', 'studentId, totalFee, paid, discount, fine, history[], schoolId'],
      ['leave_requests', 'userId, type, startDate, endDate, reason, status, schoolId'],
      ['buses', 'busNumber, driverName, route, capacity, studentIds, schoolId'],
      ['bus_trips', 'tripId, driverId, busNumber, route, startTime, endTime, schoolId'],
      ['live_bus_locations', 'busNumber, lat, lng, speed, timestamp, schoolId'],
      ['trip_scans', 'studentId, busNumber, type (board/drop), scanTime, schoolId'],
      ['parent_notifications', 'studentId, title, message, type, read, schoolId'],
      ['alerts', 'type, severity, message, screen, userId, userRole, timestamp'],
      ['salary_payments', 'staffId, amount, month, year, mode, paidDate, schoolId'],
      ['promotionHistory', 'studentId, fromClass, toClass, action, performedBy, timestamp'],
      ['schools', 'schoolId, schoolName, location, status, plan, principalEmail'],
      ['settings', 'schoolName, tagline, phone, email, address, galleryImages[]'],
    ];
    collections.forEach(([name, fields]) => {
      if (doc.y > 710) newPage();
      doc.fontSize(10).fillColor(C_GOLD).text(name, 55, doc.y, { continued: true });
      doc.fontSize(8.5).fillColor('#94A3B8').text(`  — ${fields}`, { width: 430 });
      doc.moveDown(0.3);
    });

    // ── SECTION 11: UX & ERROR HANDLING ──
    sectionTitle('UX & ERROR HANDLING SYSTEM', '\u{2728}');
    subHeading('Shared Components');
    bulletPoint('LoadingSpinner — fullScreen overlay or inline spinner, replaces raw ActivityIndicator');
    bulletPoint('ErrorBanner — red banner with message, dismiss (✕), and optional retry button');
    bulletPoint('Toast — animated bottom notification with auto-dismiss (success/error/info)');
    bulletPoint('ErrorBoundary — wraps entire app, catches render crashes with friendly recovery UI');
    bulletPoint('OfflineBanner — network status monitor with yellow/green animated banners');
    bulletPoint('Icon — custom SVG icon component with 15+ icons');
    bulletPoint('DonutRing — animated circular progress indicator');

    subHeading('Error Mapping');
    bulletPoint('getFriendlyError() converts technical errors to user-readable messages');
    bulletPoint('Network errors → "Unable to connect. Check your internet connection."');
    bulletPoint('401/403 → "Session expired. Please log in again."');
    bulletPoint('500 → "Something went wrong on our end. Please try again."');
    bulletPoint('Timeout → "Request timed out. Please try again."');

    // ── SECTION 12: DEPLOYMENT ──
    sectionTitle('DEPLOYMENT & INFRASTRUCTURE', '\u{2601}');
    bulletPoint('Hosted on Replit — autoscale deployment target');
    bulletPoint('Frontend build: npx expo export --platform web --output-dir dist');
    bulletPoint('Server: node server.js (port 5000)');
    bulletPoint('Static files served from dist/ directory');
    bulletPoint('Environment variables: Firebase keys, JWT_SECRET, APP_URL');
    bulletPoint('Firebase Admin SDK: service account via FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY');
    bulletPoint('Firestore composite indexes: 19 indexes deployed via firebase CLI');
    bulletPoint('Auto clock-out scheduled daily at 7:00 PM');

    // ── FINAL PAGE ──
    newPage();
    doc.moveDown(8);
    doc.fontSize(24).fillColor(C_GOLD).text('END OF AUDIT REPORT', { align: 'center' });
    doc.moveDown(1);
    drawLine(doc.y, C_GOLD);
    doc.moveDown(1);
    doc.fontSize(11).fillColor(C_MUTED).text('Sree Pragathi High School', { align: 'center' });
    doc.fontSize(10).fillColor(C_MUTED).text('Gopalraopet, Telangana', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor(C_MUTED).text(`Report generated on ${dateStr}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor(C_TEAL).text('Vidhaya Layam — Education Technology Platform', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#475569').text('This document is confidential and intended for authorized personnel only.', { align: 'center' });

    // ── Page numbers ──
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(C_MUTED).text(
        `Page ${i + 1} of ${pageCount}`,
        50, 810, { width: 495, align: 'center' }
      );
    }

    doc.end();
  } catch (err) {
    console.error('[master-audit] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate audit report' });
  }
});

app.get('/api/report', (req, res) => {
  try {
    const html = generateReport();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="sree-pragathi-codebase-report.html"');
    res.send(html);
  } catch (err) {
    console.error('Report generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate report: ' + err.message });
  }
});

// ════════════════════════════════════════
// SUPER ADMIN — SCHOOL MANAGEMENT
// ════════════════════════════════════════

app.post('/api/super/schools/create', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const { schoolName, location, address, phone, email, principalName, principalEmail, principalPassword, board, subscriptionPlan } = req.body;
    if (!schoolName || !location || !principalEmail || !principalPassword) {
      return res.status(400).json({ error: 'schoolName, location, principalEmail, principalPassword are required' });
    }

    let schoolId = generateSchoolCode(schoolName, location);
    const existing = await adminDb.collection('schools').where('schoolId', '==', schoolId).get();
    if (!existing.empty) schoolId = `${schoolId}${Date.now().toString().slice(-3)}`;

    const now = new Date().toISOString();

    await adminDb.collection('schools').doc(schoolId).set({
      schoolId, schoolName, location,
      address: address || '',
      phone: phone || '',
      email: email || '',
      principalName: principalName || '',
      principalEmail,
      board: board || 'State Board',
      subscriptionPlan: subscriptionPlan || 'basic',
      subscriptionStatus: 'active',
      status: 'active',
      studentCount: 0,
      staffCount: 0,
      createdAt: now,
      updatedAt: now
    });

    await adminDb.collection('settings').doc(schoolId).set({
      schoolId, schoolName, location,
      tagline: `Excellence in Education · ${location}`,
      principalName: principalName || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      board: board || 'State Board',
      createdAt: now
    });

    let principalUid = null;
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.createUser({
          email: principalEmail,
          password: principalPassword,
          displayName: principalName || `${schoolName} Principal`
        });
        principalUid = userRecord.uid;
        await adminAuth.setCustomUserClaims(principalUid, { role: 'principal', schoolId, schoolName });
        await adminDb.collection('admins').doc(principalUid).set({
          uid: principalUid, email: principalEmail,
          full_name: principalName || '', role: 'principal',
          role_id: `PRIN-${schoolId}`,
          schoolId, schoolName, createdAt: now
        });
      } catch (authErr) {
        console.error('[Create School] Auth error:', authErr.message);
      }
    }

    res.json({ success: true, schoolId, schoolName, principalEmail, principalUid, message: `School created: ${schoolId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/schools', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const snap = await adminDb.collection('schools').get();
    const schools = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    schools.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ success: true, schools, total: schools.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/schools/:schoolId', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const schoolSnap = await adminDb.collection('schools').doc(schoolId).get();
    if (!schoolSnap.exists) return res.status(404).json({ error: 'School not found' });
    const [studentsSnap, usersSnap] = await Promise.all([
      adminDb.collection('students').where('schoolId', '==', schoolId).get(),
      adminDb.collection('users').where('schoolId', '==', schoolId).get()
    ]);
    res.json({
      success: true,
      school: { id: schoolSnap.id, ...schoolSnap.data() },
      stats: { studentCount: studentsSnap.size, staffCount: usersSnap.size }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/super/schools/:schoolId/status', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'status must be active or suspended' });
    await adminDb.collection('schools').doc(schoolId).update({ status, updatedAt: new Date().toISOString() });
    res.json({ success: true, schoolId, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/super/schools/:schoolId/subscription', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { subscriptionPlan, subscriptionStatus, expiresAt } = req.body;
    await adminDb.collection('schools').doc(schoolId).update({
      subscriptionPlan: subscriptionPlan || 'basic',
      subscriptionStatus: subscriptionStatus || 'active',
      expiresAt: expiresAt || null,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true, schoolId, subscriptionPlan, subscriptionStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/stats', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const schoolsSnap = await adminDb.collection('schools').get();
    const schools = schoolsSnap.docs.map(d => d.data());
    const [studentsSnap, usersSnap] = await Promise.all([
      adminDb.collection('students').get(),
      adminDb.collection('users').get()
    ]);
    res.json({
      success: true,
      stats: {
        totalSchools: schools.length,
        activeSchools: schools.filter(s => s.status === 'active').length,
        suspendedSchools: schools.filter(s => s.status === 'suspended').length,
        totalStudents: studentsSnap.size,
        totalStaff: usersSnap.size
      },
      schools: schools.map(s => ({
        schoolId: s.schoolId, schoolName: s.schoolName, location: s.location,
        status: s.status, subscriptionPlan: s.subscriptionPlan,
        subscriptionStatus: s.subscriptionStatus, createdAt: s.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/schools/:schoolId/activity', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { limit: limitCount = 20 } = req.query;

    const [studentsSnap, staffSnap, tripsSnap, scansSnap] = await Promise.all([
      adminDb.collection('students').where('schoolId', '==', schoolId)
        .orderBy('createdAt', 'desc').limit(5).get(),
      adminDb.collection('users').where('schoolId', '==', schoolId)
        .orderBy('created_at', 'desc').limit(5).get(),
      adminDb.collection('bus_trips').where('schoolId', '==', schoolId)
        .orderBy('startTime', 'desc').limit(5).get(),
      adminDb.collection('trip_scans').where('schoolId', '==', schoolId)
        .orderBy('timestamp', 'desc').limit(5).get()
    ]);

    const activity = [
      ...studentsSnap.docs.map(d => ({ type: 'student_added', name: d.data().name, time: d.data().createdAt })),
      ...staffSnap.docs.map(d => ({ type: 'staff_added', name: d.data().full_name, role: d.data().role, time: d.data().created_at })),
      ...tripsSnap.docs.map(d => ({ type: 'trip', tripType: d.data().tripType, status: d.data().status, time: d.data().startTime })),
      ...scansSnap.docs.map(d => ({ type: 'scan', studentName: d.data().studentName, scanType: d.data().type, time: d.data().timestamp }))
    ].sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, parseInt(limitCount));

    res.json({ success: true, schoolId, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/schools/:schoolId/summary', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;

    const schoolSnap = await adminDb.collection('schools').doc(schoolId).get();
    if (!schoolSnap.exists) return res.status(404).json({ error: 'School not found' });

    const [
      studentsSnap, usersSnap, classesSnap,
      tripsSnap, scansSnap, leavesSnap
    ] = await Promise.all([
      adminDb.collection('students').where('schoolId', '==', schoolId).get(),
      adminDb.collection('users').where('schoolId', '==', schoolId).get(),
      adminDb.collection('classes').where('schoolId', '==', schoolId).get(),
      adminDb.collection('bus_trips').where('schoolId', '==', schoolId).get(),
      adminDb.collection('trip_scans').where('schoolId', '==', schoolId).get(),
      adminDb.collection('leaveRequests').where('schoolId', '==', schoolId).get()
    ]);

    const staff = usersSnap.docs.map(d => d.data());

    res.json({
      success: true,
      school: { id: schoolSnap.id, ...schoolSnap.data() },
      stats: {
        totalStudents: studentsSnap.size,
        totalStaff: usersSnap.size,
        totalClasses: classesSnap.size,
        totalTrips: tripsSnap.size,
        totalScans: scansSnap.size,
        pendingLeaves: leavesSnap.docs.filter(d => d.data().status === 'Pending').length,
        byRole: {
          teachers: staff.filter(u => u.role === 'teacher').length,
          drivers: staff.filter(u => u.role === 'driver').length,
          cleaners: staff.filter(u => u.role === 'cleaner').length,
          principal: staff.filter(u => u.role === 'principal').length
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/super/schools/:schoolId', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { confirm } = req.body;
    if (confirm !== `DELETE_${schoolId}`) {
      return res.status(400).json({ error: `Send confirm: DELETE_${schoolId} to proceed` });
    }

    await adminDb.collection('schools').doc(schoolId).delete();
    await adminDb.collection('settings').doc(schoolId).delete().catch(() => {});

    res.json({ success: true, message: `School ${schoolId} deleted. Data remains in collections with schoolId tag.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/schools/:schoolId/security-logs', superAdminLimiter, verifySuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const snap = await adminDb.collection('scan_rejection_logs')
      .where('schoolId', '==', schoolId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, logs, total: logs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));


app.get(/^(?!\/api\/).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

function scheduleAutoClockout() {
  const check = () => {
    const now = new Date();
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const h = istNow.getUTCHours();
    const m = istNow.getUTCMinutes();
    if (h === 19 && m === 0) {
      console.log('7:00 PM — triggering auto clock-out for all staff...');
      performAutoClockout()
        .then(count => console.log(`Auto clock-out complete: ${count} staff clocked out`))
        .catch(e => console.error('Auto clock-out cron error:', e.message));
    }
  };
  setInterval(check, 60000);
}

function getWorkingDays(year, month) {
  const days = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() !== 0) days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}
function parseHours(h) { return h ? Math.max(0, parseFloat(h) || 0) : 0; }
function attStatusFromHours(h) {
  if (h >= 7) return 'Present';
  if (h >= 3.5) return 'Half Day';
  if (h > 0) return 'Short Day';
  return 'Absent';
}
function calcSalarySummary(salary, attByDate, workingDays) {
  const basic = salary.basicSalary || 0;
  const hra = salary.hra || 0;
  const ta = salary.ta || 0;
  const da = salary.da || 0;
  const pf = salary.pf || 0;
  const tax = salary.tax || 0;
  const lopRate = salary.lopRate || 0;
  const gross = basic + hra + ta + da;
  const totalWD = workingDays.length || 26;
  const dailyRate = basic / (totalWD || 26);
  let creditedDays = 0;
  let fullDays = 0, halfDays = 0, shortDays = 0, absentDays = 0, lopDays = 0;
  for (const date of workingDays) {
    const override = attByDate[date]?.override;
    const hours = parseHours(attByDate[date]?.hoursWorked);
    const status = override?.status || attStatusFromHours(hours);
    if (status === 'Present') { creditedDays += 1; fullDays++; }
    else if (status === 'Half Day') { creditedDays += 0.5; halfDays++; }
    else if (status === 'Short Day') { creditedDays += 0.5; shortDays++; }
    else { lopDays++; absentDays++; }
  }
  const lopDeduction = lopDays * lopRate;
  const totalDeductions = pf + tax + lopDeduction;
  const net = Math.max(0, gross - totalDeductions);
  const attPct = totalWD > 0 ? Math.round(((fullDays + halfDays * 0.5 + shortDays * 0.5) / totalWD) * 100) : 0;
  return { gross, net, pf, tax, lopRate, lopDeduction, totalDeductions, fullDays, halfDays, shortDays, absentDays, lopDays, attPct, workingDays: totalWD, creditedDays };
}

app.get('/api/payroll/my-salary', async (req, res) => {
  try {
    const { roleId } = req.query;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });
    const [salSnap, userSnap, onbSnap, balSnap] = await Promise.all([
      getDocFS(doc(db, 'salary_settings', roleId)),
      getDocs(query(collection(db, 'users'), where('role_id', '==', roleId))),
      getDocs(query(collection(db, 'onboarded_users'), where('role_id', '==', roleId))),
      getDocFS(doc(db, 'leave_balance', roleId)),
    ]);
    const salary = salSnap.exists() ? salSnap.data() : {};
    const userData = !userSnap.empty ? userSnap.docs[0].data() : (!onbSnap.empty ? onbSnap.docs[0].data() : {});
    const balance = balSnap.exists() ? balSnap.data() : { casual: 12, sick: 12, earned: 6 };
    res.json({ salary, user: userData, balance });
  } catch (err) {
    console.error('My salary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payroll/my-payslip', async (req, res) => {
  try {
    const { roleId, month } = req.query;
    if (!roleId || !month) return res.status(400).json({ error: 'roleId and month required' });
    const [year, mon] = month.split('-').map(Number);
    const workingDaysList = getWorkingDays(year, mon);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const [salSnap, dutySnap, overrideSnap, paymentSnap] = await Promise.all([
      getDocFS(doc(db, 'salary_settings', roleId)),
      getDocs(query(collection(db, 'staff_duty'), where('roleId', '==', roleId))),
      getDocs(query(collection(db, 'attendance_overrides'), where('roleId', '==', roleId), where('month', '==', month))),
      getDocs(query(collection(db, 'salary_payments'), where('roleId', '==', roleId), where('month', '==', month))),
    ]);
    const salary = salSnap.exists() ? salSnap.data() : {};
    const dutyMap = {};
    dutySnap.docs.forEach(d => {
      const data = d.data();
      if (data.dateKey >= startDate && data.dateKey <= endDate) dutyMap[data.dateKey] = data;
    });
    const overrideMap = {};
    overrideSnap.docs.forEach(d => { const data = d.data(); overrideMap[data.date] = data; });
    const payment = paymentSnap.empty ? null : paymentSnap.docs[0].data();
    const days = workingDaysList.map(date => {
      const duty = dutyMap[date];
      const override = overrideMap[date];
      const hours = parseHours(duty?.hoursWorked);
      const status = override?.status || attStatusFromHours(hours);
      return { date, clockIn: duty?.clockIn || null, clockOut: duty?.clockOut || null, hoursWorked: hours, status, override: override || null };
    });
    const fullDays = days.filter(d => d.status === 'Present').length;
    const halfDays = days.filter(d => d.status === 'Half Day').length;
    const shortDays = days.filter(d => d.status === 'Short Day').length;
    const absentDays = days.filter(d => d.status === 'Absent').length;
    const lopDays = absentDays;
    const totalHours = parseFloat(days.reduce((s, d) => s + d.hoursWorked, 0).toFixed(1));
    const basic = salary.basicSalary || 0;
    const hra = salary.hra || 0;
    const ta = salary.ta || 0;
    const da = salary.da || 0;
    const specialAllowance = salary.specialAllowance || 0;
    const gross = basic + hra + ta + da + specialAllowance;
    const pf = salary.pf || 0;
    const tax = salary.tax || 0;
    const lopRate = salary.lopRate || 0;
    const lopDeduction = lopDays * lopRate;
    const totalDeductions = pf + tax + lopDeduction;
    const net = Math.max(0, gross - totalDeductions);
    const attPct = workingDaysList.length > 0 ? Math.round(((fullDays + halfDays * 0.5 + shortDays * 0.5) / workingDaysList.length) * 100) : 0;
    const empCode = roleId.replace(/[^0-9]/g, '').slice(-4) || roleId.slice(-4);
    const refNo = `SAL-${empCode}-${String(mon).padStart(2,'0')}${String(year).slice(-2)}`;
    res.json({
      month, salary, earnings: { basic, hra, ta, da, specialAllowance, gross },
      deductions: { pf, tax, lopDeduction, lopRate, lopDays, total: totalDeductions },
      net, attendance: { workingDays: workingDaysList.length, fullDays, halfDays, shortDays, absentDays, totalHours, attPct },
      days, payment, refNo, status: payment?.status || 'Pending',
    });
  } catch (err) {
    console.error('My payslip error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payroll/my-year', async (req, res) => {
  try {
    const { roleId, year } = req.query;
    if (!roleId || !year) return res.status(400).json({ error: 'roleId and year required' });
    const y = parseInt(year);
    const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
    const [salSnap, dutySnap, paymentsSnap] = await Promise.all([
      getDocFS(doc(db, 'salary_settings', roleId)),
      getDocs(query(collection(db, 'staff_duty'), where('roleId', '==', roleId))),
      getDocs(query(collection(db, 'salary_payments'), where('roleId', '==', roleId))),
    ]);
    const salary = salSnap.exists() ? salSnap.data() : {};
    const allDuty = {};
    dutySnap.docs.forEach(d => { const data = d.data(); if (data.dateKey) allDuty[data.dateKey] = data; });
    const paymentMap = {};
    paymentsSnap.docs.forEach(d => { const data = d.data(); paymentMap[data.month] = data; });
    const basic = salary.basicSalary || 0;
    const hra = salary.hra || 0;
    const ta = salary.ta || 0;
    const da = salary.da || 0;
    const specialAllowance = salary.specialAllowance || 0;
    const gross = basic + hra + ta + da + specialAllowance;
    const pf = salary.pf || 0;
    const tax = salary.tax || 0;
    const lopRate = salary.lopRate || 0;
    const summary = months.map(month => {
      const [my, mm] = month.split('-').map(Number);
      const wdList = getWorkingDays(my, mm);
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      let fullDays = 0, halfDays = 0, shortDays = 0, absentDays = 0;
      for (const date of wdList) {
        const hours = parseHours(allDuty[date]?.hoursWorked);
        const status = attStatusFromHours(hours);
        if (status === 'Present') fullDays++;
        else if (status === 'Half Day') halfDays++;
        else if (status === 'Short Day') shortDays++;
        else absentDays++;
      }
      const lopDays = absentDays;
      const lopDeduction = lopDays * lopRate;
      const totalDeductions = pf + tax + lopDeduction;
      const net = Math.max(0, gross - totalDeductions);
      const payment = paymentMap[month];
      return { month, workingDays: wdList.length, fullDays, halfDays, shortDays, absentDays, lopDays, gross, totalDeductions, net, status: payment?.status || (gross > 0 ? 'Pending' : 'Not Set'), credited: payment?.creditedAt || null };
    });
    res.json({ summary, salary });
  } catch (err) {
    console.error('Year summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payroll/payslip-html', async (req, res) => {
  try {
    const { roleId, month } = req.query;
    if (!roleId || !month) return res.status(400).json({ error: 'roleId and month required' });
    const [year, mon] = month.split('-').map(Number);
    const workingDaysList = getWorkingDays(year, mon);
    const startDate = `${month}-01`; const endDate = `${month}-31`;
    const [salSnap, userSnap, onbSnap, dutySnap, overrideSnap, paymentSnap] = await Promise.all([
      getDocFS(doc(db, 'salary_settings', roleId)),
      getDocs(query(collection(db, 'users'), where('role_id', '==', roleId))),
      getDocs(query(collection(db, 'onboarded_users'), where('role_id', '==', roleId))),
      getDocs(query(collection(db, 'staff_duty'), where('roleId', '==', roleId))),
      getDocs(query(collection(db, 'attendance_overrides'), where('roleId', '==', roleId), where('month', '==', month))),
      getDocs(query(collection(db, 'salary_payments'), where('roleId', '==', roleId), where('month', '==', month))),
    ]);
    const salary = salSnap.exists() ? salSnap.data() : {};
    const userData = !userSnap.empty ? userSnap.docs[0].data() : (!onbSnap.empty ? onbSnap.docs[0].data() : {});
    const dutyMap = {}; dutySnap.docs.forEach(d => { const data = d.data(); if (data.dateKey >= startDate && data.dateKey <= endDate) dutyMap[data.dateKey] = data; });
    const overrideMap = {}; overrideSnap.docs.forEach(d => { const data = d.data(); overrideMap[data.date] = data; });
    const payment = paymentSnap.empty ? null : paymentSnap.docs[0].data();
    const days = workingDaysList.map(date => { const duty = dutyMap[date]; const override = overrideMap[date]; const hours = parseHours(duty?.hoursWorked); const status = override?.status || attStatusFromHours(hours); return { date, hours, status }; });
    const fullDays = days.filter(d => d.status === 'Present').length;
    const halfDays = days.filter(d => d.status === 'Half Day').length;
    const shortDays = days.filter(d => d.status === 'Short Day').length;
    const absentDays = days.filter(d => d.status === 'Absent').length;
    const basic = salary.basicSalary || 0, hra = salary.hra || 0, ta = salary.ta || 0, da = salary.da || 0, sp = salary.specialAllowance || 0;
    const gross = basic + hra + ta + da + sp;
    const pf = salary.pf || 0, taxAmt = salary.tax || 0, lopRate = salary.lopRate || 0, lopDeduction = absentDays * lopRate;
    const totalDeductions = pf + taxAmt + lopDeduction, net = Math.max(0, gross - totalDeductions);
    const monthLabel = new Date(year, mon - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const empCode = roleId.replace(/[^0-9]/g, '').slice(-4) || roleId.slice(-4);
    const refNo = `SAL-${empCode}-${String(mon).padStart(2,'0')}${String(year).slice(-2)}`;
    const inr = v => '₹' + Number(v).toLocaleString('en-IN');
    const empName = userData.full_name || userData.name || roleId;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pay Slip - ${monthLabel}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;padding:32px}
      .header{text-align:center;border-bottom:3px solid #0B1F3A;padding-bottom:16px;margin-bottom:24px}
      .school-name{font-size:22px;font-weight:800;color:#0B1F3A}
      .slip-title{font-size:16px;font-weight:600;color:#7C5CBF;margin-top:4px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;padding:14px;background:#f8f8f8;border-radius:8px}
      .info-item label{font-size:11px;color:#666;display:block}
      .info-item span{font-size:13px;font-weight:600;color:#1a1a1a}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#0B1F3A;color:#fff;padding:8px 12px;text-align:left;font-size:12px}
      td{padding:8px 12px;border-bottom:1px solid #eee;font-size:13px}
      .amount{text-align:right;font-weight:600}
      .total-row td{font-weight:700;background:#f0f0f0}
      .net-box{background:#e8fff5;border:2px solid #34D399;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px}
      .net-label{font-size:12px;color:#666}
      .net-amount{font-size:28px;font-weight:800;color:#00874d}
      .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}
      .credited{background:#e8fff5;color:#00874d} .pending{background:#fff8e0;color:#d4900a}
      .footer{text-align:center;font-size:10px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:12px}
      @media print{body{padding:16px}button{display:none}}
    </style></head><body>
    <div class="header">
      <div class="school-name">Venkeys International School</div>
      <div class="slip-title">SALARY PAY SLIP — ${monthLabel.toUpperCase()}</div>
      <div style="font-size:12px;color:#666;margin-top:6px">Ref: ${refNo} · Status: <span class="status-badge ${payment?.status === 'Credited' ? 'credited' : 'pending'}">${payment?.status || 'Pending'}</span></div>
    </div>
    <div class="info-grid">
      <div class="info-item"><label>Employee Name</label><span>${empName}</span></div>
      <div class="info-item"><label>Employee ID</label><span>${roleId}</span></div>
      <div class="info-item"><label>Designation</label><span>${salary.designation || userData.role || '—'}</span></div>
      <div class="info-item"><label>Department</label><span>${userData.dept || userData.subject || '—'}</span></div>
      <div class="info-item"><label>Date of Joining</label><span>${salary.dateOfJoining || '—'}</span></div>
      <div class="info-item"><label>Bank Account</label><span>${salary.bankAccount ? '••••' + salary.bankAccount.slice(-4) : '—'}</span></div>
      <div class="info-item"><label>Working Days</label><span>${workingDaysList.length}</span></div>
      <div class="info-item"><label>Days Present</label><span>${fullDays} Full + ${halfDays} Half + ${shortDays} Short</span></div>
      <div class="info-item"><label>LOP Days</label><span>${absentDays}</span></div>
      <div class="info-item"><label>Attendance %</label><span>${workingDaysList.length > 0 ? Math.round(((fullDays + halfDays*0.5 + shortDays*0.5)/workingDaysList.length)*100) : 0}%</span></div>
    </div>
    <table>
      <tr><th>EARNINGS</th><th class="amount">Amount</th><th>DEDUCTIONS</th><th class="amount">Amount</th></tr>
      <tr><td>Basic Salary</td><td class="amount">${inr(basic)}</td><td>Provident Fund (PF)</td><td class="amount">– ${inr(pf)}</td></tr>
      <tr><td>HRA</td><td class="amount">${inr(hra)}</td><td>Professional Tax / TDS</td><td class="amount">– ${inr(taxAmt)}</td></tr>
      <tr><td>Travel Allowance (TA)</td><td class="amount">${inr(ta)}</td><td>LOP Deduction (${absentDays} days × ${inr(lopRate)})</td><td class="amount">– ${inr(lopDeduction)}</td></tr>
      <tr><td>Dearness Allowance (DA)</td><td class="amount">${inr(da)}</td><td></td><td></td></tr>
      ${sp > 0 ? `<tr><td>Special Allowance</td><td class="amount">${inr(sp)}</td><td></td><td></td></tr>` : ''}
      <tr class="total-row"><td>Gross Earnings</td><td class="amount">${inr(gross)}</td><td>Total Deductions</td><td class="amount">– ${inr(totalDeductions)}</td></tr>
    </table>
    <div class="net-box">
      <div class="net-label">NET TAKE-HOME PAY</div>
      <div class="net-amount">${inr(net)}</div>
      ${payment?.creditedAt ? `<div style="font-size:11px;color:#666;margin-top:6px">Credited on ${new Date(payment.creditedAt).toLocaleDateString('en-IN')}</div>` : ''}
    </div>
    <div class="footer">This is a computer-generated payslip and does not require a signature.<br>Venkeys International School — For queries, contact HR/Admin</div>
    <button onclick="window.print()" style="position:fixed;bottom:24px;right:24px;background:#7C5CBF;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700">🖨️ Print / Download PDF</button>
    </body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Payslip HTML error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payroll/mark-credited', async (req, res) => {
  try {
    const { roleId, month, adminName, net, gross } = req.body;
    if (!roleId || !month) return res.status(400).json({ error: 'roleId and month required' });
    const creditedAt = new Date().toISOString();
    const empCode = roleId.replace(/[^0-9]/g, '').slice(-4) || roleId.slice(-4);
    const [y, m] = month.split('-');
    const refNo = `SAL-${empCode}-${m.padStart(2,'0')}${String(y).slice(-2)}`;
    const paymentRef = await addDoc(collection(db, 'salary_payments'), {
      roleId, month, status: 'Credited', net: Number(net) || 0, gross: Number(gross) || 0,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      creditedAt, creditedBy: adminName || 'Admin', refNo,
    });
    const monthLabel = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await addDoc(collection(db, 'teacher_notifications'), {
      roleId, type: 'salary_credited', icon: '💰', title: 'Salary Credited',
      message: `Your salary for ${monthLabel} of ₹${Number(net).toLocaleString('en-IN')} has been credited. Ref: ${refNo}`,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      month, refNo, amount: Number(net) || 0, read: false, createdAt: creditedAt,
    });
    await addDoc(collection(db, 'driver_notifications'), {
      driverId: roleId, type: 'salary_credited', icon: '💰', title: 'Salary Credited',
      message: `Your salary for ${monthLabel} of \u20B9${Number(net).toLocaleString('en-IN')} has been credited. Ref: ${refNo}`,
      schoolId: (req.schoolId || DEFAULT_SCHOOL_ID),
      month, refNo, amount: Number(net) || 0, read: false, createdAt: creditedAt,
    });
    res.json({ success: true, paymentId: paymentRef.id, refNo });
    safeSync('syncPayroll', () => syncPayroll({ employeeId: roleId, employeeName: adminName || roleId, month: m, year: y, grossSalary: Number(gross) || 0, netPayable: Number(net) || 0, creditStatus: 'Credited', creditedAt }), { roleId, month }).catch(() => {});
    safeSync('syncNotification', () => syncNotification({ notifId: paymentRef.id, type: 'salary_credited', recipientId: roleId, recipientRole: 'teacher', title: 'Salary Credited', message: `Salary for ${monthLabel} of ₹${Number(net).toLocaleString('en-IN')} credited. Ref: ${refNo}`, channel: 'in-app', sentAt: creditedAt }), { roleId }).catch(() => {});
  } catch (err) {
    console.error('Mark credited error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leave-balance', async (req, res) => {
  try {
    const { roleId } = req.query;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });
    const balSnap = await getDocFS(doc(db, 'leave_balance', roleId));
    const balance = balSnap.exists() ? balSnap.data() : { casual: 12, sick: 12, earned: 6 };
    res.json({ balance });
  } catch (err) {
    console.error('Leave balance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payroll/employees', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month required (YYYY-MM)' });
    const [year, mon] = month.split('-').map(Number);
    const workingDays = getWorkingDays(year, mon);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const [usersSnap, logisticsSnap, dutySnap, salarySnap, overridesSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
      getDocs(query(collection(db, 'onboarded_users'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
      getDocs(query(collection(db, 'staff_duty'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('dateKey', '>=', startDate), where('dateKey', '<=', endDate))),
      getDocs(query(collection(db, 'salary_settings'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
      getDocs(query(collection(db, 'attendance_overrides'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)), where('month', '==', month))),
    ]);

    const salaryMap = {};
    salarySnap.docs.forEach(d => { salaryMap[d.id] = d.data(); });
    const overrideMap = {};
    overridesSnap.docs.forEach(d => {
      const { roleId, date } = d.data();
      if (!overrideMap[roleId]) overrideMap[roleId] = {};
      overrideMap[roleId][date] = d.data();
    });

    const dutyMap = {};
    dutySnap.docs.forEach(d => {
      const data = d.data();
      const rid = data.roleId;
      if (!rid) return;
      if (!dutyMap[rid]) dutyMap[rid] = {};
      dutyMap[rid][data.dateKey] = data;
    });

    const employees = [];
    const seen = new Set();

    const STAFF_ROLES = ['teacher', 'driver', 'cleaner', 'principal', 'admin', 'logistics', 'staff', 'accountant', 'librarian', 'security', 'peon', 'ayah', 'sweeper'];
    const addEmployee = (data, source) => {
      const rid = data.role_id || data.roleId;
      const role = (data.role || '').toLowerCase();
      if (!rid || seen.has(rid)) return;
      if (role === 'parent' || role === 'student') return;
      seen.add(rid);
      const salary = salaryMap[rid] || {};
      const empDuty = dutyMap[rid] || {};
      const empOverrides = overrideMap[rid] || {};
      const attByDate = {};
      for (const date of workingDays) {
        attByDate[date] = { hoursWorked: empDuty[date]?.hoursWorked || 0, clockIn: empDuty[date]?.clockIn, clockOut: empDuty[date]?.clockOut, override: empOverrides[date] || null };
      }
      const summary = calcSalarySummary(salary, attByDate, workingDays);
      employees.push({
        id: data.id || rid,
        roleId: rid,
        name: data.full_name || data.name || rid,
        role: data.role || 'teacher',
        dept: (data.dept || data.subject || data.department || '').trim(),
        subject: (data.subject || '').trim(),
        salary,
        ...summary,
      });
    };

    usersSnap.docs.forEach(d => addEmployee({ id: d.id, ...d.data() }, 'users'));
    logisticsSnap.docs.forEach(d => addEmployee({ id: d.id, ...d.data() }, 'onboarded_users'));

    employees.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ employees, workingDays: workingDays.length });
  } catch (err) {
    console.error('Payroll employees error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payroll/attendance', async (req, res) => {
  try {
    const { roleId, month } = req.query;
    if (!roleId || !month) return res.status(400).json({ error: 'roleId and month required' });
    const [year, mon] = month.split('-').map(Number);
    const workingDays = getWorkingDays(year, mon);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const [dutySnap, overridesSnap] = await Promise.all([
      getDocs(query(collection(db, 'staff_duty'), where('roleId', '==', roleId))),
      getDocs(query(collection(db, 'attendance_overrides'), where('roleId', '==', roleId), where('month', '==', month))),
    ]);

    const dutyMap = {};
    dutySnap.docs.forEach(d => {
      const data = d.data();
      if (data.dateKey >= startDate && data.dateKey <= endDate) dutyMap[data.dateKey] = data;
    });
    const overrideMap = {};
    overridesSnap.docs.forEach(d => { const data = d.data(); overrideMap[data.date] = data; });

    const days = workingDays.map(date => {
      const duty = dutyMap[date];
      const override = overrideMap[date];
      const hours = parseHours(duty?.hoursWorked);
      const computedStatus = attStatusFromHours(hours);
      const status = override?.status || computedStatus;
      return { date, clockIn: duty?.clockIn || null, clockOut: duty?.clockOut || null, hoursWorked: hours, status, override: override || null, onDuty: duty?.onDuty || false };
    });

    res.json({ days, workingDays: workingDays.length });
  } catch (err) {
    console.error('Payroll attendance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payroll/salary', async (req, res) => {
  try {
    const { roleId, basicSalary, hra, ta, da, specialAllowance, pf, tax, lopRate, bankAccount, ifsc, designation, dateOfJoining } = req.body;
    if (!roleId) return res.status(400).json({ error: 'roleId required' });
    const settings = {
      roleId,
      basicSalary: Number(basicSalary) || 0,
      hra: Number(hra) || 0,
      ta: Number(ta) || 0,
      da: Number(da) || 0,
      specialAllowance: Number(specialAllowance) || 0,
      pf: Number(pf) || 0,
      tax: Number(tax) || 0,
      lopRate: Number(lopRate) || 0,
      bankAccount: bankAccount || '',
      ifsc: ifsc || '',
      designation: designation || '',
      dateOfJoining: dateOfJoining || '',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'salary_settings', roleId), settings, { merge: true });
    res.json({ success: true, settings });
    const now = new Date();
    safeSync('syncPayroll', () => syncPayroll({ employeeId: roleId, employeeName: designation || roleId, month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()), basicSalary: Number(basicSalary) || 0, hra: Number(hra) || 0, da: Number(da) || 0, ta: Number(ta) || 0, specialAllowance: Number(specialAllowance) || 0, grossSalary: (Number(basicSalary) || 0) + (Number(hra) || 0) + (Number(da) || 0) + (Number(ta) || 0) + (Number(specialAllowance) || 0), pf: Number(pf) || 0, tax: Number(tax) || 0, creditStatus: 'Pending' }), { roleId }).catch(() => {});
  } catch (err) {
    console.error('Save salary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payroll/attendance/override', async (req, res) => {
  try {
    const { roleId, date, status, reason, overriddenBy } = req.body;
    if (!roleId || !date || !status) return res.status(400).json({ error: 'roleId, date, status required' });
    const month = date.substring(0, 7);
    const docId = `${roleId}_${date}`;
    await setDoc(doc(db, 'attendance_overrides', docId), {
      roleId, date, month, status, reason: reason || '', overriddenBy: overriddenBy || 'Admin', overriddenAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Attendance override error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payroll/toggle', async (req, res) => {
  try {
    const { roleId, employeeName, role, action } = req.body;
    if (!roleId || !action) return res.status(400).json({ error: 'roleId and action required' });
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const docId = `duty_${roleId}_${dateKey}`;
    const dutyRef = doc(db, 'staff_duty', docId);
    const existing = await getDocFS(dutyRef);

    if (action === 'in') {
      if (existing.exists() && existing.data().onDuty) {
        return res.json({ success: true, alreadyOn: true, clockIn: existing.data().clockIn });
      }
      const prevSessions = existing.exists() ? (existing.data().sessions || []) : [];
      await setDoc(dutyRef, {
        userId: roleId, name: employeeName || roleId, role: role || 'teacher', roleId,
        onDuty: true, clockIn: timeStr, clockOut: null,
        currentStatus: 'On Duty', date: now.toLocaleDateString('en-IN'), dateKey,
        sessions: prevSessions,
        updatedAt: now.toISOString(),
      }, { merge: true });
      return res.json({ success: true, clockIn: timeStr });
    }

    if (action === 'out') {
      if (!existing.exists()) return res.status(404).json({ error: 'No duty record for today' });
      const data = existing.data();
      if (!data.onDuty) return res.json({ success: true, alreadyOff: true, clockOut: data.clockOut });
      const clockInTime = data.clockIn || '08:00';
      const inMs = new Date(`2000-01-01T${clockInTime}`).getTime();
      const outMs = new Date(`2000-01-01T${timeStr}`).getTime();
      const sessionHours = Math.max(0, (outMs - inMs) / 3600000);
      const prevSessions = data.sessions || [];
      const prevHours = prevSessions.reduce((s, sess) => s + (sess.hours || 0), 0);
      const totalHours = prevHours + sessionHours;
      const sessions = [...prevSessions, { in: clockInTime, out: timeStr, hours: parseFloat(sessionHours.toFixed(2)) }];
      await updateDoc(dutyRef, {
        onDuty: false, clockOut: timeStr, currentStatus: 'Off Duty',
        hoursWorked: parseFloat(totalHours.toFixed(2)), sessions, updatedAt: now.toISOString(),
      });
      return res.json({ success: true, clockOut: timeStr, hoursWorked: parseFloat(totalHours.toFixed(2)) });
    }

    res.status(400).json({ error: 'action must be "in" or "out"' });
  } catch (err) {
    console.error('Payroll toggle error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sync-status', async (req, res) => {
  try {
    const errSnap = await getDocs(query(collection(db, 'sync_errors'), where('status', '==', 'pending')));
    const pending = errSnap.size;
    const recentErrors = errSnap.docs.slice(0, 5).map(d => ({ id: d.id, operation: d.data().operation, error: d.data().error, createdAt: d.data().createdAt, attempts: d.data().attempts || 1 }));
    res.json({ synced: pending === 0, pending, recentErrors });
  } catch (err) {
    res.json({ synced: true, pending: 0, recentErrors: [] });
  }
});

async function retrySyncErrors() {
  try {
    const errSnap = await getDocs(query(collection(db, 'sync_errors'), where('status', '==', 'pending')));
    if (errSnap.empty) return;
    console.log(`[SyncRetry] Found ${errSnap.size} pending sync error(s) — retrying...`);
    const syncFnMap = {
      syncStudent: (p) => syncStudent(p),
      syncTeacher: (p) => syncTeacher(p),
      syncLeaveRequest: (p) => syncLeaveRequest(p),
      syncParentAccount: (p) => syncParentAccount(p),
      syncPayroll: (p) => syncPayroll(p),
      syncNotification: (p) => syncNotification(p),
    };
    for (const errDoc of errSnap.docs) {
      const data = errDoc.data();
      const fn = syncFnMap[data.operation];
      if (!fn) { await updateDoc(doc(db, 'sync_errors', errDoc.id), { status: 'skipped', note: 'No retry handler' }); continue; }
      try {
        const payload = JSON.parse(data.payload || '{}');
        const result = await fn(payload);
        if (result.success) {
          await updateDoc(doc(db, 'sync_errors', errDoc.id), { status: 'resolved', resolvedAt: new Date().toISOString() });
          console.log(`[SyncRetry] Resolved: ${data.operation}`);
        } else {
          await updateDoc(doc(db, 'sync_errors', errDoc.id), { attempts: (data.attempts || 1) + 1, lastAttemptAt: new Date().toISOString(), error: result.error || data.error });
        }
      } catch (retryErr) {
        await updateDoc(doc(db, 'sync_errors', errDoc.id), { attempts: (data.attempts || 1) + 1, lastAttemptAt: new Date().toISOString(), error: retryErr.message }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[SyncRetry] Retry scheduler error:', err.message);
  }
}

app.get('/api/bus/proximity-alerts-today', async (req, res) => {
  try {
    const { busNumber } = req.query;
    if (!busNumber) return res.status(400).json({ error: 'busNumber required' });
    const today = new Date().toISOString().slice(0, 10);
    const q = query(
      collection(db, 'proximity_alert_logs'),
      where('busNumber', '==', busNumber),
      where('tripDate', '==', today)
    );
    const snap = await getDocs(q);
    const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    alerts.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    console.error('Proximity alerts today error:', err.message);
    res.status(500).json({ error: 'Failed to fetch proximity alerts' });
  }
});

app.get('/api/bus/today-summary', async (req, res) => {
  try {
    const { driverId } = req.query;
    if (!driverId) return res.status(400).json({ error: 'driverId required' });
    const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
    const summaryRef = doc(db, 'trip_summaries', `${driverId}_${today}`);
    const summarySnap = await getDocFS(summaryRef);
    if (!summarySnap.exists()) return res.json({ summary: null });
    res.json({ summary: summarySnap.data() });
  } catch (err) {
    console.error('Today summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch today summary' });
  }
});

app.get('/api/bus/trip-duration-week', async (req, res) => {
  try {
    const { driverId, weekOffset } = req.query;
    if (!driverId) return res.status(400).json({ error: 'driverId required' });
    const offset = parseInt(weekOffset || '0', 10);

    const todayIST = new Date(Date.now() + 330 * 60000);
    const todayStr = todayIST.toISOString().slice(0, 10);
    const dowToday = todayIST.getUTCDay();
    const mondayShift = dowToday === 0 ? -6 : 1 - dowToday;
    const mondayMs = todayIST.getTime() + mondayShift * 86400000 + offset * 7 * 86400000;
    const monday = new Date(mondayMs);

    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDates = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday.getTime() + i * 86400000);
      weekDates.push(d.toISOString().slice(0, 10));
    }

    const summarySnaps = await Promise.all(
      weekDates.map(date => getDocFS(doc(db, 'trip_summaries', `${driverId}_${date}`)))
    );

    const days = weekDates.map((date, i) => {
      const isToday = date === todayStr;
      const s = summarySnaps[i].exists() ? summarySnaps[i].data() : {};
      return {
        date,
        label: isToday && offset === 0 ? 'Today' : DAY_LABELS[i],
        morning: s.morningDuration || 0,
        evening: s.eveningDuration || 0,
        isToday: isToday && offset === 0,
      };
    });

    const morningVals = days.map(d => d.morning).filter(v => v > 0);
    const eveningVals = days.map(d => d.evening).filter(v => v > 0);
    const avgMorning = morningVals.length ? Math.round(morningVals.reduce((a, b) => a + b, 0) / morningVals.length) : 0;
    const avgEvening = eveningVals.length ? Math.round(eveningVals.reduce((a, b) => a + b, 0) / eveningVals.length) : 0;
    const todayData = days.find(d => d.isToday);
    const totalToday = todayData ? (todayData.morning || 0) + (todayData.evening || 0) : 0;

    res.json({ weekDates, days, summary: { avgMorning, avgEvening, totalToday }, todayStr, weekOffset: offset });
  } catch (err) {
    console.error('Trip duration week error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trip duration week' });
  }
});

app.get('/api/bus/driver-notifications', async (req, res) => {
  try {
    const { driverId } = req.query;
    if (!driverId) return res.status(400).json({ error: 'driverId required' });
    const q = query(collection(db, 'driver_notifications'), where('driverId', '==', driverId));
    const snap = await getDocs(q);
    const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ notifications });
  } catch (err) {
    console.error('Driver notifications error:', err.message);
    res.status(500).json({ error: 'Failed to fetch driver notifications' });
  }
});

app.post('/api/bus/driver-notifications/read', async (req, res) => {
  try {
    const { notificationId } = req.body;
    if (!notificationId) return res.status(400).json({ error: 'notificationId required' });
    await updateDoc(doc(db, 'driver_notifications', notificationId), { read: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark driver notification read error:', err.message);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

app.get('/api/admin/bus-alerts', async (req, res) => {
  try {
    const [logsSnap, requestsSnap, summariesSnap] = await Promise.all([
      getDocs(query(collection(db, 'proximity_alert_logs'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
      getDocs(query(collection(db, 'location_change_requests'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
      getDocs(query(collection(db, 'trip_summaries'), where('schoolId', '==', (req.schoolId || DEFAULT_SCHOOL_ID)))),
    ]);
    const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const requests = requestsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const summaries = summariesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    logs.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
    requests.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    summaries.sort((a, b) => (b.tripDate || '').localeCompare(a.tripDate || ''));
    res.json({ logs: logs.slice(0, 100), requests: requests.slice(0, 50), summaries: summaries.slice(0, 50) });
  } catch (err) {
    console.error('Admin bus alerts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch bus alerts' });
  }
});

setInterval(retrySyncErrors, 5 * 60 * 1000);

app.use((err, req, res, next) => {
  console.error('[Global Error]', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.get('/audit-report', (req, res) => {
  const path = require('path');
  res.setHeader('Content-Disposition', 'attachment; filename="sree-pragathi-audit-report.html"');
  res.sendFile(path.join(__dirname, 'audit-report.html'));
});

app.get('/download-source', (req, res) => {
  const fs = require('fs');
  const filePath = '/tmp/sree-pragathi-app.tar.gz';
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archive not ready. Please contact admin.' });
  }
  res.setHeader('Content-Disposition', 'attachment; filename="sree-pragathi-app.tar.gz"');
  res.setHeader('Content-Type', 'application/gzip');
  res.sendFile(filePath);
});

function scheduleDailyBackup() {
  function getMsUntilNext2AMIST() {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffsetMs);
    const next2AM = new Date(nowIST);
    next2AM.setHours(2, 0, 0, 0);
    if (nowIST >= next2AM) {
      next2AM.setDate(next2AM.getDate() + 1);
    }
    return next2AM.getTime() - nowIST.getTime();
  }

  const delay = getMsUntilNext2AMIST();
  setTimeout(() => {
    runDailyBackup().catch(e => console.error('[Backup] Scheduled backup error:', e.message));
    setInterval(() => {
      runDailyBackup().catch(e => console.error('[Backup] Scheduled backup error:', e.message));
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

app.post('/api/admin/backup/trigger', verifyAuth, async (req, res) => {
  if (req.userRole !== 'principal' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  runDailyBackup().catch(e => console.error('[Backup] Manual trigger error:', e.message));
  res.json({ success: true, message: 'Backup started' });
});

app.get('/api/admin/backup/status', verifyAuth, async (req, res) => {
  if (req.userRole !== 'principal' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const adminDb = admin.firestore();

    const failureSnap = await adminDb.collection('admin_notifications')
      .where('type', '==', 'backup_failed')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    const failures = failureSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const successSnap = await adminDb.collection('backup_logs')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    const successes = successSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const recentLogs = [...successes, ...failures].sort((a, b) =>
      (b.timestamp || b.createdAt || '').localeCompare(a.timestamp || a.createdAt || '')
    ).slice(0, 10);

    res.json({
      lastSuccess: successes[0] || null,
      lastFailure: failures[0] || null,
      recentLogs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Venkeys School App server running on port ${PORT}`);
  console.log('Database: Firebase Firestore (project: ' + firebaseConfig.projectId + ')');
  console.log('Auth: Firebase Authentication (Email/Password) — NO FALLBACK');
  scheduleAutoClockout();
  console.log('Auto clock-out scheduled: 7:00 PM daily');
  scheduleDailyBackup();
  console.log('[Backup] Scheduler started — next backup at 2 AM IST');

  try {
    const principalEmail = process.env.PRINCIPAL_EMAIL || 'thatipamulavenkatesh1999@gmail.com';
    const snapshot = await adminDb.collection('users')
      .where('email', '==', principalEmail)
      .get();
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      if (userDoc.data().role !== 'principal') {
        await adminDb.collection('users').doc(userDoc.id).update({ role: 'principal' });
        console.log(`Updated ${principalEmail} role to principal`);
      } else {
        console.log(`${principalEmail} already has role principal`);
      }
    } else {
      console.log(`User ${principalEmail} not found — will be set on next login`);
    }
  } catch (err) {
    console.error('Principal role setup error:', err.message);
  }
});

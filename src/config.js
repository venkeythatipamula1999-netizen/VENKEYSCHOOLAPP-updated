import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA-daJ4E8CEVh89BGEU9wRLGOZAT7T3-vM",
  authDomain: "school-app-87900.firebaseapp.com",
  projectId: "school-app-87900",
  storageBucket: "school-app-87900.firebasestorage.app",
  appId: "1:774655999002:android:6ccc7fd89c5c57598565a3",
};

let app = null;
let db = null;
let auth = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error('[Firebase] Initialization failed:', e.message);
}

export { app, db, auth, firebaseConfig };

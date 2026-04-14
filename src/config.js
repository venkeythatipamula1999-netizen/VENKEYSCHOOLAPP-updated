import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCpJN6rP699bCYMzrDm-m-RlH0Gyll1L90",
  authDomain: "vidyalayam-288fd.firebaseapp.com",
  projectId: "vidyalayam-288fd",
  storageBucket: "vidyalayam-288fd.firebasestorage.app",
  appId: "1:252163179307:android:02e5dc91aeed94c904fb6e",
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

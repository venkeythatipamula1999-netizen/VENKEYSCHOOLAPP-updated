import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyA-daJ4E8CEVh89BGEU9wRLGOZAT7T3-vM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "school-app-87900.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "school-app-87900",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "school-app-87900.firebasestorage.app",
  appId: process.env.FIREBASE_APP_ID || "1:774655999002:android:6ccc7fd89c5c57598565a3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, firebaseConfig };

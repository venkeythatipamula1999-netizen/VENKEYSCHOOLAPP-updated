// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth }      from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage }   from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Primary app — used for Super Admin session
const app  = getApps().find(a => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;

// Secondary app — used ONLY to create school admin accounts
// without signing out the currently logged-in Super Admin.
const SECONDARY = "school-creator";
export const secondaryApp  = getApps().find(a => a.name === SECONDARY) ?? initializeApp(firebaseConfig, SECONDARY);
export const secondaryAuth = getAuth(secondaryApp);

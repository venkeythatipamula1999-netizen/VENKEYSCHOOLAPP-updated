import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config';

let currentUser = null;
let currentUserRole = null;

export function setErrorReporterUser(user) {
  currentUser = user;
  currentUserRole = user?.role || null;
}

export function clearErrorReporterUser() {
  currentUser = null;
  currentUserRole = null;
}

export async function reportError({
  type = 'js_crash',
  severity = 'medium',
  message = 'Unknown error',
  screen = typeof window !== 'undefined' && window.location ? window.location.pathname : '/unknown',
  details = '',
  source = 'auto'
}) {
  try {
    if (!db) {
      console.warn('[ErrorReporter] Firebase not initialized, skipping error report:', message);
      return;
    }

    const errorDoc = {
      type,
      severity,
      message,
      screen,
      userId: currentUser?.id || currentUser?.uid || 'anonymous',
      userRole: currentUserRole || 'unknown',
      details: String(details || ''),
      timestamp: serverTimestamp(),
      read: false,
      source,
      appVersion: '2.0.0'
    };

    const alertsRef = collection(db, 'admin_notifications');
    await addDoc(alertsRef, errorDoc);

    console.log('[ErrorReporter] Alert sent:', {
      type,
      message,
      userId: errorDoc.userId,
      userRole: currentUserRole
    });
  } catch (err) {
    console.error('[ErrorReporter] Failed to report error:', err.message);
  }
}

export async function reportApiError(endpoint, statusCode, errorMessage, userId) {
  await reportError({
    type: 'api_error',
    severity: statusCode >= 500 ? 'high' : 'medium',
    message: `API ${statusCode} at ${endpoint}: ${errorMessage}`,
    screen: endpoint,
    details: `Status: ${statusCode}, Endpoint: ${endpoint}`,
    source: 'auto'
  });
}

export async function reportFirestoreError(operation, errorMessage) {
  await reportError({
    type: 'firestore_error',
    severity: 'high',
    message: `Firestore ${operation} failed: ${errorMessage}`,
    details: errorMessage,
    source: 'auto'
  });
}

export async function reportAuthError(operation, errorMessage) {
  await reportError({
    type: 'auth_error',
    severity: 'medium',
    message: `Auth ${operation} failed: ${errorMessage}`,
    details: errorMessage,
    source: 'auto'
  });
}

export async function reportUnhandledPromiseRejection(reason) {
  const message = reason?.message || String(reason) || 'Unknown rejection';
  const stack = reason?.stack || '';
  
  await reportError({
    type: 'unhandled_promise',
    severity: 'high',
    message: `Unhandled Promise Rejection: ${message}`,
    details: stack,
    source: 'auto'
  });
}

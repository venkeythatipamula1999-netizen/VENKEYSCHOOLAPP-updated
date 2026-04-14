// src/lib/errorReporter.ts
// Automatic error reporter — writes to Firestore "alerts" collection
// so Super Admin sees every crash/API failure in real-time.

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorPayload {
  type:        "api_error" | "js_crash" | "firestore_error" | "auth_error" | "unhandled_promise";
  severity:    ErrorSeverity;
  message:     string;
  screen?:     string;         // e.g. "/marks-entry"
  teacherId?:  string;
  teacherName?: string;
  schoolId?:   string;
  details?:    string;         // stack trace or extra context
  userAgent?:  string;
}

/** Write an error alert to Firestore so Super Admin is notified instantly */
export async function reportError(payload: ErrorPayload): Promise<void> {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, "alerts"), {
      // Super Admin notification fields
      type:        payload.type,
      severity:    payload.severity,
      message:     payload.message,
      read:        false,

      // Context
      screen:      payload.screen      || (typeof window !== "undefined" ? window.location.pathname : "unknown"),
      teacherId:   payload.teacherId   || user?.uid         || null,
      teacherName: payload.teacherName || user?.email       || null,
      schoolId:    payload.schoolId    || null,
      details:     payload.details     || null,
      userAgent:   payload.userAgent   || (typeof navigator !== "undefined" ? navigator.userAgent : null),

      // Timestamp
      timestamp: serverTimestamp(),
      source:    "auto", // distinguishes from manual alerts
    });
  } catch {
    // Never throw from error reporter — just log locally
    console.error("[ErrorReporter] Failed to write alert to Firestore");
  }
}

/** Severity helper based on error type */
export function getSeverity(type: ErrorPayload["type"]): ErrorSeverity {
  switch (type) {
    case "js_crash":          return "critical";
    case "auth_error":        return "high";
    case "unhandled_promise": return "high";
    case "firestore_error":   return "medium";
    case "api_error":         return "low";
    default:                  return "medium";
  }
}

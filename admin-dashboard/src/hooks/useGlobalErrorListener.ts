"use client";
// src/hooks/useGlobalErrorListener.ts
// Attaches to window-level errors and unhandled promise rejections.
// Runs once at app root so ALL errors anywhere in the app are captured.

import { useEffect } from "react";
import { reportError } from "@/lib/errorReporter";

export function useGlobalErrorListener() {
  useEffect(() => {
    // 1. Catch unhandled JS errors (e.g. undefined is not a function)
    const onError = (event: ErrorEvent) => {
      reportError({
        type:     "js_crash",
        severity: "critical",
        message:  event.message || "Unknown JS error",
        details:  `File: ${event.filename} Line: ${event.lineno}:${event.colno}\n${event.error?.stack || ""}`,
      });
    };

    // 2. Catch unhandled promise rejections (e.g. async fetch that throws)
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message :
        typeof reason === "string" ? reason :
        "Unhandled promise rejection";

      reportError({
        type:     "unhandled_promise",
        severity: "high",
        message,
        details:  reason instanceof Error ? reason.stack : String(reason),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
}

"use client";
// src/components/ErrorBoundary.tsx
// Catches any unhandled React render crash and reports it to Super Admin automatically.

import React, { Component, ErrorInfo, ReactNode } from "react";
import { reportError } from "@/lib/errorReporter";

interface Props  { children: ReactNode }
interface State  { hasError: boolean; errorMessage: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Auto-report to Firestore → Super Admin sees it immediately
    reportError({
      type:     "js_crash",
      severity: "critical",
      message:  `App crash: ${error.message}`,
      details:  `${error.stack || ""}\n\nComponent Stack:\n${info.componentStack}`,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center border border-rose-100">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-navy font-extrabold text-xl mb-2">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-1">
              This error has been automatically reported to the Super Admin.
            </p>
            <p className="text-slate-400 text-xs font-mono mb-6 bg-slate-50 rounded-lg p-3 text-left break-words">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, errorMessage: "" }); window.location.reload(); }}
              className="bg-navy text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// src/services/api.ts
import { auth } from "@/lib/firebase";
import { reportError } from "@/lib/errorReporter";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const getToken = async (): Promise<string | null> => {
  try { return auth.currentUser ? await auth.currentUser.getIdToken() : null; }
  catch { return null; }
};

const request = async <T>(path: string, method = "GET", body?: unknown): Promise<T | null> => {
  try {
    const token   = await getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const opts: RequestInit = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(`${API_URL}${path}`, opts);

    // Report HTTP errors (4xx / 5xx) to Super Admin automatically
    if (!res.ok) {
      reportError({
        type:     "api_error",
        severity: res.status >= 500 ? "high" : "medium",
        message:  `API ${method} ${path} failed — HTTP ${res.status}`,
        details:  `Status: ${res.status} ${res.statusText}\nURL: ${API_URL}${path}`,
      });
    }

    const data = await res.json();
    return data as T;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.warn(`[API] ${method} ${path} failed:`, err);

    // Auto-report network/parse failures to Super Admin
    reportError({
      type:     "api_error",
      severity: "high",
      message:  `API ${method} ${path} — ${err.message}`,
      details:  err.stack,
    });

    return null;
  }
};

export const api = {
  get:    <T>(path: string)              => request<T>(path, "GET"),
  post:   <T>(path: string, body: unknown) => request<T>(path, "POST", body),
  delete: <T>(path: string)              => request<T>(path, "DELETE"),
};

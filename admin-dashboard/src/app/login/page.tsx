"use client";
// src/app/login/page.tsx
import { useState, useEffect } from "react";
import { useRouter }  from "next/navigation";
import { useAdmin }   from "@/context/AdminContext";

export default function LoginPage() {
  const { login, user, authLoading } = useAdmin();
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      if (msg === "ACCESS_DENIED") {
        setError("Access denied. This portal is for Super Admins only.");
      } else {
        setError(msg.replace("Firebase: ", "").replace(/\(.*\)/, "").trim());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-navy-mid flex items-center justify-center p-5">
      {/* BG decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-teal/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center text-3xl font-black text-navy mx-auto mb-4 shadow-lg">S</div>
          <h1 className="text-white text-2xl font-extrabold">Vidhaya Layam</h1>
          <p className="text-white/40 text-sm mt-1">Super Admin Portal</p>
          <div className="inline-flex items-center gap-2 mt-3 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            <span className="w-2 h-2 bg-brand-emerald rounded-full animate-pulse" />
            <span className="text-brand-emerald text-xs font-semibold">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-9 shadow-modal animate-fade-in">
          <h2 className="text-navy text-xl font-extrabold mb-1">Welcome back</h2>
          <p className="text-slate-400 text-xs mb-7">Sign in with your admin credentials</p>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@school.com"
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-navy outline-none focus:border-brand-teal focus:bg-white transition"
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-navy outline-none focus:border-brand-teal focus:bg-white transition"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-navy text-white rounded-xl py-3.5 text-sm font-bold hover:bg-navy-mid transition disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : "Sign In →"}
          </button>

          <p className="text-center text-xs text-slate-400 mt-5">
            Firebase Auth · <strong className="text-navy">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

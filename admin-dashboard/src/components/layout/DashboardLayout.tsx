"use client";
// src/components/layout/DashboardLayout.tsx
import { useEffect }   from "react";
import { useRouter }   from "next/navigation";
import { useAdmin }    from "@/context/AdminContext";
import Sidebar         from "./Sidebar";
import Topbar          from "./Topbar";

interface Props { title: string; children: React.ReactNode }

export default function DashboardLayout({ title, children }: Props) {
  const { user, authLoading, logout } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Not logged in at all — go to login
      router.replace("/login");
    }
    // If user exists, AdminContext already verified they are a superadmin
    // (non-superadmins are signed out in onAuthStateChanged before user is set)
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-navy">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-100 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

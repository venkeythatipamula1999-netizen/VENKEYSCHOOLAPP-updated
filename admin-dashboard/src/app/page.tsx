"use client";
// src/app/page.tsx
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin }  from "@/context/AdminContext";

export default function Root() {
  const { user, authLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, authLoading, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-navy">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Loading Vidhaya Layam…</p>
      </div>
    </div>
  );
}

"use client";
// src/components/layout/Topbar.tsx
import { useState } from "react";
import Link         from "next/link";
import { useAdmin } from "@/context/AdminContext";

interface Props { title: string }

export default function Topbar({ title }: Props) {
  const { user, unreadCount } = useAdmin();
  const [search, setSearch]   = useState("");

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-6 flex-shrink-0">
      <h1 className="text-navy font-extrabold text-[17px] flex-1">{title}</h1>

      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-52">
        <span className="text-slate-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="bg-transparent border-none outline-none text-xs text-navy w-full font-sans placeholder:text-slate-400"
        />
      </div>

      {/* Notifications bell */}
      <Link href="/notifications" className="relative w-9 h-9 border border-slate-200 rounded-lg flex items-center justify-center text-sm hover:bg-slate-50 transition">
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-rose rounded-full border-2 border-white" />
        )}
      </Link>

      <div className="w-px h-6 bg-slate-200" />

      {/* User */}
      <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-[11px] font-extrabold text-navy">
          {(user?.email || "A")[0].toUpperCase()}
        </div>
        <div>
          <div className="text-navy text-[11.5px] font-bold">Super Admin</div>
          <div className="text-slate-400 text-[9.5px]">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</div>
        </div>
      </Link>
    </header>
  );
}

"use client";
// src/app/feature-control/page.tsx — View Only
import { useState, useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db }             from "@/lib/firebase";
import { useAdmin }       from "@/context/AdminContext";
import DashboardLayout    from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterSelect } from "@/components/ui";
import type { FeatureFlags } from "@/types";

const FEATURES: { key: keyof FeatureFlags; icon: string; name: string; desc: string }[] = [
  { key: "marksEntry",  icon: "📝", name: "Marks Entry",   desc: "Allow teachers to submit & edit marks" },
  { key: "attendance",  icon: "✅", name: "Attendance",    desc: "Daily class attendance tracking" },
  { key: "parentLogin", icon: "👨‍👩‍👧", name: "Parent Login", desc: "Parent portal via phone + PIN" },
  { key: "qrLogin",     icon: "📱", name: "QR Login",      desc: "Student QR scanning for bus trips" },
  { key: "smsAlerts",   icon: "💬", name: "SMS Alerts",    desc: "SMS notifications to parents" },
  { key: "reportCards", icon: "📄", name: "Report Cards",  desc: "Auto-generate & share report cards" },
];

export default function FeatureControlPage() {
  const { schools } = useAdmin();
  const [selectedId, setSelectedId] = useState(schools[0]?.id || "");
  const [flags, setFlags] = useState<FeatureFlags>({ marksEntry: true, attendance: true, parentLogin: true, qrLogin: false, smsAlerts: true, reportCards: false });

  useEffect(() => {
    if (!selectedId) return;
    getDoc(doc(db, "schools", selectedId)).then(snap => {
      if (snap.exists() && snap.data().features) setFlags(snap.data().features);
    });
  }, [selectedId]);

  return (
    <DashboardLayout title="Feature Control — View Only">
      <Card>
        <CardHeader title="🎛️ Feature Flags per School">
          <FilterSelect
            value={selectedId}
            onChange={v => setSelectedId(v)}
            options={[["", "Select School"], ...schools.map(s => [s.id, s.name || s.id] as [string, string])]}
          />
        </CardHeader>

        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p className="text-[12px] text-blue-600 font-semibold">
            View only — Feature flags are managed by each School Admin.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 p-5">
          {FEATURES.map(f => (
            <div key={f.key} className="flex items-center gap-3.5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <span className="text-[26px]">{f.icon}</span>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-navy">{f.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">{f.desc}</div>
              </div>
              {/* Read-only status indicator */}
              <div className={`w-11 h-6 rounded-full flex-shrink-0 flex items-center px-1 ${flags[f.key] ? "bg-emerald-500" : "bg-slate-300"}`}>
                <div className={`w-[18px] h-[18px] bg-white rounded-full shadow transition-all ${flags[f.key] ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] text-slate-400">
            🔒 Super Admin has read-only access. Feature flag changes are made by each School Admin in the mobile app.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

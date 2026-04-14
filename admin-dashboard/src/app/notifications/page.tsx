"use client";
// src/app/notifications/page.tsx — Error tracking dashboard (View Only)
import { useState } from "react";
import { useAdmin }    from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, LiveBadge } from "@/components/ui";

// ── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700 border border-rose-200",
  high:     "bg-orange-100 text-orange-700 border border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low:      "bg-slate-100 text-slate-500 border border-slate-200",
};

const TYPE_ICON: Record<string, string> = {
  js_crash:          "💥",
  api_error:         "🔌",
  firestore_error:   "🗄️",
  auth_error:        "🔐",
  unhandled_promise: "⚠️",
  error:             "⚠️",
};

const ROLE_ICON: Record<string, string> = {
  teacher: "👩‍🏫",
  parent:  "👨‍👩‍👧",
  driver:  "🚌",
  cleaner: "🧹",
  admin:   "🏫",
};

const ROLE_COLOR: Record<string, string> = {
  teacher: "bg-blue-50 text-blue-600 border border-blue-200",
  parent:  "bg-purple-50 text-purple-600 border border-purple-200",
  driver:  "bg-green-50 text-green-600 border border-green-200",
  cleaner: "bg-yellow-50 text-yellow-600 border border-yellow-200",
  admin:   "bg-slate-50 text-slate-600 border border-slate-200",
};

const TYPE_FILTERS = [
  ["all",               "All"],
  ["js_crash",          "💥 Crashes"],
  ["api_error",         "🔌 API"],
  ["firestore_error",   "🗄️ Database"],
  ["unhandled_promise", "⚠️ Promise"],
  ["auth_error",        "🔐 Auth"],
];

const ROLE_FILTERS = [
  ["all",     "All Users"],
  ["teacher", "👩‍🏫 Teacher"],
  ["parent",  "👨‍👩‍👧 Parent"],
  ["driver",  "🚌 Driver"],
  ["cleaner", "🧹 Cleaner"],
  ["admin",   "🏫 Admin"],
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { notifications, unreadCount } = useAdmin();
  const [typeFilter, setTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expanded,   setExpanded]   = useState<string | null>(null);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = notifications.filter(n => {
    const a = n as any;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (roleFilter !== "all" && a.userRole !== roleFilter) return false;
    return true;
  });

  // ── Counts ─────────────────────────────────────────────────────────────────
  const autoErrors  = notifications.filter(n => (n as any).source === "auto").length;
  const criticals   = notifications.filter(n => (n as any).severity === "critical").length;
  const byRole      = (role: string) => notifications.filter(n => (n as any).userRole === role).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Notifications & Error Alerts">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        <SummaryCard value={notifications.length} label="Total Alerts"    icon="🔔" color="text-navy" />
        <SummaryCard value={unreadCount}           label="Unread"          icon="📬" color="text-gold" border="border-gold/30" />
        <SummaryCard value={autoErrors}            label="Auto-detected"   icon="🤖" color="text-blue-500" border="border-blue-100" />
        <SummaryCard value={criticals}             label="Critical"        icon="🚨" color="text-rose-500" border="border-rose-100" />
        <SummaryCard value={byRole("teacher")}     label="Teacher Errors"  icon="👩‍🏫" color="text-blue-500" />
        <SummaryCard value={byRole("parent") + byRole("driver") + byRole("cleaner")} label="Other Users" icon="👥" color="text-purple-500" />
      </div>

      {/* ── Role breakdown bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-5 py-4 mb-5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Errors by User Role</p>
        <div className="flex gap-3 flex-wrap">
          {["teacher","parent","driver","cleaner","admin"].map(role => (
            <div key={role} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <span className="text-base">{ROLE_ICON[role]}</span>
              <div>
                <div className="text-[15px] font-black text-navy">{byRole(role)}</div>
                <div className="text-[10px] text-slate-400 capitalize">{role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main alerts table ── */}
      <Card>
        <CardHeader title="🔔 All Alerts" count={filtered.length}>
          <LiveBadge collection="alerts" />
          {unreadCount > 0 && (
            <span className="bg-rose-50 text-rose-500 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-rose-100">
              {unreadCount} unread
            </span>
          )}
        </CardHeader>

        {/* Type filter tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Filter by Error Type</p>
          <div className="flex gap-2 flex-wrap">
            {TYPE_FILTERS.map(([v, l]) => (
              <FilterTab key={v} label={l} active={typeFilter === v} onClick={() => setTypeFilter(v)} />
            ))}
          </div>
        </div>

        {/* Role filter tabs */}
        <div className="px-5 pt-2 pb-3 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Filter by User Role</p>
          <div className="flex gap-2 flex-wrap">
            {ROLE_FILTERS.map(([v, l]) => (
              <FilterTab key={v} label={l} active={roleFilter === v} onClick={() => setRoleFilter(v)} />
            ))}
          </div>
        </div>

        {/* Alert rows */}
        <div className="divide-y divide-slate-50">
          {filtered.length > 0 ? filtered.map(n => {
            const a        = n as any;
            const severity = a.severity as string | undefined;
            const userRole = a.userRole as string | undefined;
            const screen   = a.screen   as string | undefined;
            const details  = a.details  as string | undefined;
            const userId   = a.userId   as string | undefined;
            const appName  = a.appName  as string | undefined;
            const isExpanded = expanded === n.id;
            const icon = TYPE_ICON[n.type || ""] || (n.driverId ? "🚌" : "ℹ️");

            return (
              <div key={n.id}
                className={`px-5 py-4 transition-colors ${!n.read ? "bg-amber-50/30" : "hover:bg-slate-50"}`}>
                <div className="flex items-start gap-3">

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    severity === "critical" ? "bg-rose-100" :
                    severity === "high"     ? "bg-orange-100" : "bg-slate-100"
                  }`}>
                    {icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">

                    {/* Message + badges row */}
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className={`text-[13px] flex-1 ${n.read ? "font-medium text-slate-700" : "font-bold text-navy"}`}>
                        {n.message || n.title || "Alert"}
                      </p>
                      {severity && (
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${SEVERITY_STYLE[severity] || SEVERITY_STYLE.low}`}>
                          {severity}
                        </span>
                      )}
                      {a.source === "auto" && (
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-500 border border-blue-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          auto
                        </span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {userRole && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLOR[userRole] || ROLE_COLOR.admin}`}>
                          {ROLE_ICON[userRole] || "👤"} {userRole}
                        </span>
                      )}
                      {appName && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {appName}
                        </span>
                      )}
                      {n.type && (
                        <span className="text-[10px] text-slate-400">type: {n.type}</span>
                      )}
                      {screen && (
                        <span className="text-[10px] text-slate-400 font-mono">📍 {screen}</span>
                      )}
                      {userId && (
                        <span className="text-[10px] text-slate-400 font-mono">👤 {userId.slice(0, 10)}…</span>
                      )}
                    </div>

                    {/* Stack trace toggle */}
                    {details && (
                      <div className="mt-2">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : n.id)}
                          className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold"
                        >
                          {isExpanded ? "▲ Hide" : "▼ Show"} stack trace
                        </button>
                        {isExpanded && (
                          <pre className="mt-1.5 text-[9.5px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                            {details}
                          </pre>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 mt-1.5 font-mono">{n.ts}</p>
                  </div>

                  {/* Right side — view only indicator */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {!n.read && (
                      <span className="w-2.5 h-2.5 bg-gold rounded-full" title="Unread" />
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-medium">No alerts matching this filter</p>
              <p className="text-xs mt-1">All clear!</p>
            </div>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}

// ── Small reusable components ─────────────────────────────────────────────────

function SummaryCard({ value, label, icon, color, border = "border-slate-200" }: {
  value: number; label: string; icon: string; color: string; border?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-4 border shadow-card ${border}`}>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 font-medium mt-1">{icon} {label}</div>
    </div>
  );
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
        active ? "bg-navy text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

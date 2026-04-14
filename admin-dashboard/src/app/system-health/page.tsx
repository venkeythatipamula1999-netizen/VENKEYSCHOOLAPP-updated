"use client";
// src/app/system-health/page.tsx
import { useAdmin } from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, LiveBadge } from "@/components/ui";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const TYPE_LABELS: Record<string, string> = {
  js_crash:          "JS Crash",
  api_error:         "API Error",
  firestore_error:   "Firestore Error",
  auth_error:        "Auth Error",
  unhandled_promise: "Unhandled Promise",
  error:             "Error",
};

export default function SystemHealthPage() {
  const { notifications, schools } = useAdmin();

  // ── Health Score ──────────────────────────────────────────
  const unread = notifications.filter(n => !n.read);
  let score = 100;
  const criticalUnread = unread.filter(n => n.severity === "critical").length;
  const highUnread     = unread.filter(n => n.severity === "high").length;
  const mediumUnread   = unread.filter(n => n.severity === "medium").length;
  score -= Math.min(criticalUnread * 15, 45);
  score -= Math.min(highUnread * 5, 20);
  score -= Math.min(mediumUnread * 2, 10);
  score  = Math.max(score, 0);

  const healthLabel = score >= 80 ? "Healthy" : score >= 60 ? "Degraded" : "Critical";
  const healthColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-rose-600";
  const healthBg    = score >= 80 ? "bg-emerald-50 border-emerald-200" : score >= 60 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200";
  const healthDot   = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";

  // ── Stats ─────────────────────────────────────────────────
  const total      = notifications.length;
  const unreadCnt  = unread.length;
  const critical   = notifications.filter(n => n.severity === "critical").length;
  const high       = notifications.filter(n => n.severity === "high").length;
  const autoDetect = notifications.filter(n => (n as any).source === "auto").length;
  const resolved   = notifications.filter(n => n.read).length;

  // ── Crash rate chart (last 7 days) ───────────────────────
  const days: Record<string, { critical: number; high: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days[d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })] = { critical: 0, high: 0 };
  }
  notifications.forEach(n => {
    const ts = (n as any).timestamp;
    let d: Date | null = null;
    if (ts?.toDate) d = ts.toDate();
    else if (typeof ts === "string") d = new Date(ts);
    if (!d) return;
    const key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    if (days[key]) {
      if (n.severity === "critical") days[key].critical++;
      else if (n.severity === "high")     days[key].high++;
    }
  });
  const crashData = Object.entries(days).map(([date, v]) => ({ date, ...v }));

  // ── Error breakdown by type ───────────────────────────────
  const typeCounts: Record<string, number> = {};
  notifications.forEach(n => {
    const t = n.type || "error";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeRows = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count, pct: total > 0 ? ((count / total) * 100).toFixed(1) : "0" }));

  // ── School health ─────────────────────────────────────────
  const schoolAlerts: Record<string, { count: number; last: string }> = {};
  notifications.forEach(n => {
    const sid = n.schoolId || "";
    if (!schoolAlerts[sid]) schoolAlerts[sid] = { count: 0, last: "" };
    schoolAlerts[sid].count++;
    if (!schoolAlerts[sid].last) schoolAlerts[sid].last = (n as any).ts || "";
  });

  const SEVERITY_BADGE: Record<string, string> = {
    critical: "bg-rose-100 text-rose-700",
    high:     "bg-orange-100 text-orange-700",
    medium:   "bg-amber-100 text-amber-700",
    low:      "bg-slate-100 text-slate-500",
  };

  return (
    <DashboardLayout title="System Health">

      {/* Health Score Banner */}
      <div className={`rounded-2xl border p-6 mb-5 flex items-center gap-6 ${healthBg}`}>
        <div>
          <div className={`text-7xl font-black leading-none ${healthColor}`}>{score}</div>
          <div className="text-slate-500 text-xs mt-1 font-medium">/ 100</div>
        </div>
        <div className="flex-1">
          <div className={`flex items-center gap-2 mb-1`}>
            <span className={`w-3 h-3 rounded-full ${healthDot} animate-pulse`} />
            <span className={`text-xl font-black ${healthColor}`}>{healthLabel}</span>
          </div>
          <div className="text-slate-500 text-[12px]">
            Score based on unread alerts: {criticalUnread} critical · {highUnread} high · {mediumUnread} medium
          </div>
          <div className="flex gap-3 mt-3">
            {[
              { label: "Critical unread", val: criticalUnread, cls: "bg-rose-100 text-rose-700" },
              { label: "High unread",     val: highUnread,     cls: "bg-orange-100 text-orange-700" },
              { label: "Medium unread",   val: mediumUnread,   cls: "bg-amber-100 text-amber-700" },
            ].map(({ label, val, cls }) => (
              <div key={label} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${cls}`}>
                {val} {label}
              </div>
            ))}
          </div>
        </div>
        <div className="text-right">
          <LiveBadge collection="alerts" />
          <div className="text-[10px] text-slate-400 mt-1">Real-time</div>
        </div>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {[
          { label: "Total Alerts",   val: total,      icon: "🔔", cls: "text-navy" },
          { label: "Unread",         val: unreadCnt,  icon: "📬", cls: "text-amber-500" },
          { label: "Critical",       val: critical,   icon: "🚨", cls: "text-rose-500" },
          { label: "High",           val: high,       icon: "⚠️", cls: "text-orange-500" },
          { label: "Auto-detected",  val: autoDetect, icon: "🤖", cls: "text-blue-500" },
          { label: "Resolved",       val: resolved,   icon: "✅", cls: "text-emerald-500" },
        ].map(({ label, val, icon, cls }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className={`text-2xl font-black ${cls}`}>{val}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Crash rate chart + Error breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card>
          <CardHeader title="📈 Error Trend — Last 7 Days" />
          <div className="p-4" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={crashData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#f43f5e" fill="#fee2e2" name="Critical" />
                <Area type="monotone" dataKey="high"     stackId="1" stroke="#f59e0b" fill="#fef3c7" name="High" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="🔍 Error Breakdown by Type" count={typeRows.length} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Type", "Count", "% of Total"].map(h => (
                    <th key={h} className="bg-slate-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {typeRows.length > 0 ? typeRows.map(row => (
                  <tr key={row.type} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border-b border-slate-100 text-[12.5px] font-semibold text-navy">
                      {TYPE_LABELS[row.type] || row.type}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 text-[13px] font-black text-navy">{row.count}</td>
                    <td className="px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[80px]">
                          <div className="bg-navy h-1.5 rounded-full" style={{ width: `${row.pct}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{row.pct}%</span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="text-center py-10 text-slate-400 text-sm">No errors recorded ✅</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* School Health Grid */}
      <Card>
        <CardHeader title="🏫 Health by School" count={schools.length} />
        <div className="p-5">
          {schools.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No schools onboarded yet</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {schools.map(s => {
                const info  = schoolAlerts[s.id] || { count: 0, last: "" };
                const dot   = info.count === 0 ? "bg-emerald-500" : info.count <= 3 ? "bg-amber-500" : "bg-rose-500";
                const label = info.count === 0 ? "No alerts" : `${info.count} alert${info.count !== 1 ? "s" : ""}`;
                const cls   = info.count === 0 ? "text-emerald-600" : info.count <= 3 ? "text-amber-600" : "text-rose-600";
                return (
                  <div key={s.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${dot} flex-shrink-0`} />
                      <span className="text-[12.5px] font-bold text-navy truncate">{s.name || s.schoolName || s.id}</span>
                    </div>
                    <div className={`text-[13px] font-black ${cls}`}>{label}</div>
                    {info.last && <div className="text-[10px] text-slate-400 mt-1">Last: {info.last}</div>}
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{s.id}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}

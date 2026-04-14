"use client";
// src/app/whatsapp/page.tsx — WhatsApp Monitor (View Only)
import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterSelect, LiveBadge, Table, Tr, Td, EmptyState } from "@/components/ui";
import type { WhatsAppLog } from "@/types";

const TYPE_ICON: Record<string, string> = {
  attendance:   "✅",
  fees:         "🧾",
  exams:        "📝",
  announcement: "📢",
  emergency:    "🚨",
};

const TYPE_LABEL: Record<string, string> = {
  attendance:   "Attendance Alert",
  fees:         "Fee Reminder",
  exams:        "Exam Result",
  announcement: "Announcement",
  emergency:    "Emergency",
};

const STATUS_STYLE: Record<string, string> = {
  sent:      "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  failed:    "bg-rose-100 text-rose-700",
  pending:   "bg-amber-100 text-amber-700",
};

export default function WhatsAppMonitorPage() {
  const { schools } = useAdmin();
  const [logs, setLogs]         = useState<WhatsAppLog[]>([]);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "whatsapp_logs"), orderBy("sentAt", "desc"), limit(200)),
      snap => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WhatsAppLog)))
    );
    return unsub;
  }, []);

  const filtered = logs.filter(l => {
    if (schoolFilter && l.schoolId !== schoolFilter) return false;
    if (typeFilter   && l.type    !== typeFilter)    return false;
    if (statusFilter && l.status  !== statusFilter)  return false;
    return true;
  });

  // ── Per-school WhatsApp config status ────────────────────────
  const schoolWAStatus = schools.map(s => {
    const config   = (s as any).whatsappConfig;
    const schoolLogs = logs.filter(l => l.schoolId === s.id);
    const sent     = schoolLogs.filter(l => l.status === "sent" || l.status === "delivered").length;
    const failed   = schoolLogs.filter(l => l.status === "failed").length;
    const total    = schoolLogs.length;
    const deliveryRate = total > 0 ? Math.round((schoolLogs.filter(l => l.status === "delivered").length / total) * 100) : null;
    return { s, config, sent, failed, total, deliveryRate };
  });

  // ── Summary stats ─────────────────────────────────────────────
  const totalSent      = logs.filter(l => l.status === "sent" || l.status === "delivered").length;
  const totalDelivered = logs.filter(l => l.status === "delivered").length;
  const totalFailed    = logs.filter(l => l.status === "failed").length;
  const totalPending   = logs.filter(l => l.status === "pending").length;
  const configuredSchools = schools.filter(s => (s as any).whatsappConfig?.phoneNumberId).length;
  const verifiedSchools   = schools.filter(s => (s as any).whatsappConfig?.verified).length;

  return (
    <DashboardLayout title="WhatsApp Monitor">

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {[
          { icon: "🏫", label: "Configured",  val: configuredSchools, cls: "text-navy" },
          { icon: "✅", label: "Verified",     val: verifiedSchools,   cls: "text-emerald-600" },
          { icon: "📤", label: "Sent",         val: totalSent,         cls: "text-blue-500" },
          { icon: "📬", label: "Delivered",    val: totalDelivered,    cls: "text-emerald-500" },
          { icon: "❌", label: "Failed",       val: totalFailed,       cls: "text-rose-500" },
          { icon: "⏳", label: "Pending",      val: totalPending,      cls: "text-amber-500" },
        ].map(({ icon, label, val, cls }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className={`text-2xl font-black ${cls}`}>{val}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* School WhatsApp config grid */}
      <Card className="mb-5">
        <CardHeader title="🏫 WhatsApp Status per School" count={schools.length} />
        <div className="p-5">
          {schools.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No schools onboarded yet</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {schoolWAStatus.map(({ s, config, sent, failed, total, deliveryRate }) => {
                const isVerified   = config?.verified;
                const isConfigured = !!config?.phoneNumberId;
                const dot = isVerified ? "bg-emerald-500" : isConfigured ? "bg-amber-500" : "bg-slate-300";
                const statusLabel = isVerified ? "Active" : isConfigured ? "Pending verify" : "Not configured";
                const statusCls   = isVerified ? "text-emerald-600" : isConfigured ? "text-amber-600" : "text-slate-400";

                return (
                  <div key={s.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                      <span className="text-[13px] font-bold text-navy truncate">{s.name || s.schoolName || s.id}</span>
                    </div>
                    <div className={`text-[11px] font-semibold ${statusCls} mb-2`}>💬 {statusLabel}</div>
                    {config?.phoneNumber && (
                      <div className="text-[10px] text-slate-400 font-mono mb-2">{config.phoneNumber}</div>
                    )}
                    {total > 0 ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{total} messages</span>
                          {deliveryRate !== null && (
                            <span className={deliveryRate >= 80 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                              {deliveryRate}% delivered
                            </span>
                          )}
                        </div>
                        {failed > 0 && (
                          <div className="text-[10px] text-rose-500 font-semibold">{failed} failed</div>
                        )}
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${deliveryRate ?? 0}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">No messages yet</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Message log table */}
      <Card>
        <CardHeader title="📋 Message Log" count={filtered.length}>
          <LiveBadge collection="whatsapp_logs" />
        </CardHeader>

        <FilterBar>
          <FilterSelect value={schoolFilter} onChange={setSchoolFilter}
            options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string, string])]} />
          <FilterSelect value={typeFilter} onChange={setTypeFilter}
            options={[
              ["", "All Types"],
              ["attendance",   "✅ Attendance"],
              ["fees",         "🧾 Fee Reminder"],
              ["exams",        "📝 Exam Result"],
              ["announcement", "📢 Announcement"],
              ["emergency",    "🚨 Emergency"],
            ]} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter}
            options={[
              ["", "All Status"],
              ["delivered", "Delivered"],
              ["sent",      "Sent"],
              ["pending",   "Pending"],
              ["failed",    "Failed"],
            ]} />
        </FilterBar>

        <Table headers={["Type", "School", "Recipient", "Student", "Status", "Error", "Sent At"]}>
          {filtered.length > 0 ? filtered.map(l => {
            const school = schools.find(s => s.id === l.schoolId);
            return (
              <Tr key={l.id}>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span>{TYPE_ICON[l.type || ""] || "💬"}</span>
                    <span className="text-[12px] font-semibold text-navy">{TYPE_LABEL[l.type || ""] || l.type || "—"}</span>
                  </div>
                </Td>
                <Td>
                  <span className="text-[11px] text-slate-500">{school?.name || school?.schoolName || l.schoolId || "—"}</span>
                </Td>
                <Td mono>{l.recipient || "—"}</Td>
                <Td>
                  <span className="text-[12px] text-slate-600">{l.studentName || "—"}</span>
                </Td>
                <Td>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[l.status || "pending"] || STATUS_STYLE.pending}`}>
                    {l.status || "pending"}
                  </span>
                </Td>
                <Td>
                  {l.errorReason
                    ? <span className="text-[10px] text-rose-500 font-mono">{l.errorReason.slice(0, 40)}</span>
                    : <span className="text-slate-300">—</span>}
                </Td>
                <Td mono>{l.ts || "—"}</Td>
              </Tr>
            );
          }) : (
            <EmptyState icon="💬" message="No WhatsApp messages logged yet" />
          )}
        </Table>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            🔒 View only — Messages are triggered automatically by the mobile app or by School Admins / Teachers. Logs are stored in the <code className="bg-slate-100 px-1 rounded">whatsapp_logs</code> Firestore collection.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

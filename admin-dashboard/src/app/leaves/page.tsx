"use client";
// src/app/leaves/page.tsx
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterSelect, Table, Tr, Td, Badge, LiveBadge, EmptyState } from "@/components/ui";

interface AttendanceRecord { roleId?: string; teacherId?: string; status?: string; }

export default function LeavesPage() {
  const { leaves, teachers, schools } = useAdmin();
  const [selectedSchool, setSelectedSchool] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { present: number; total: number }>>({});

  useEffect(() => {
    getDocs(collection(db, "attendance")).then(snap => {
      const map: Record<string, { present: number; total: number }> = {};
      snap.docs.forEach(d => {
        const rec = d.data() as AttendanceRecord;
        const rid = rec.roleId || rec.teacherId || "";
        if (!rid) return;
        if (!map[rid]) map[rid] = { present: 0, total: 0 };
        map[rid].total++;
        if (rec.status === "present") map[rid].present++;
      });
      setAttendanceMap(map);
    }).catch(() => {});
  }, []);

  const getTeacherSchool = (roleId?: string) =>
    roleId ? (teachers.find(t => t.role_id === roleId || t.id === roleId)?.schoolId || "") : "";

  const filtered = leaves.filter(l =>
    !selectedSchool || getTeacherSchool(l.roleId) === selectedSchool
  );

  const pending  = filtered.filter(l => l.status === "Pending").length;
  const approved = filtered.filter(l => l.status === "Approved").length;
  const rejected = filtered.filter(l => l.status === "Rejected").length;

  const getAttPct = (roleId?: string) => {
    if (!roleId) return null;
    const rec = attendanceMap[roleId];
    if (!rec || rec.total === 0) return null;
    return (rec.present / rec.total) * 100;
  };

  const getImpact = (l: typeof leaves[0]) => {
    const attPct = getAttPct(l.roleId);
    if (attPct === null) return null;
    const rec = attendanceMap[l.roleId || ""];
    if (!rec || rec.total === 0) return null;
    const projected = attPct - ((l.days || 0) / rec.total * 100);
    return projected < 75 ? "at-risk" : "ok";
  };

  const hasAttendanceContext = filtered.some(l => getAttPct(l.roleId) !== null);

  return (
    <DashboardLayout title="Leave Requests">

      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-navy">{filtered.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">📋 Total Requests</div>
          <div className="text-xs text-slate-400 mt-1">{selectedSchool ? "Selected school" : "All schools"}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-amber-500">{pending}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">⏳ Pending</div>
          <div className="text-xs text-slate-400 mt-1">Awaiting school decision</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-emerald-500">{approved}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">✅ Approved</div>
          <div className="text-xs text-slate-400 mt-1">Approved by school</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-rose-500">{rejected}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">❌ Rejected</div>
          <div className="text-xs text-slate-400 mt-1">Rejected by school</div>
        </div>
      </div>

      {hasAttendanceContext && (
        <Card className="mb-5">
          <CardHeader title="📅 Attendance Context" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Name", "Role", "Days on Leave", "Attendance %", "Impact"].map(h => (
                    <th key={h} className="bg-slate-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.filter(l => getAttPct(l.roleId) !== null).map(l => {
                  const attPct = getAttPct(l.roleId);
                  const impact = getImpact(l);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 border-b border-slate-100 font-bold text-navy text-[12.5px]">{l.name || l.roleId || "—"}</td>
                      <td className="px-4 py-3 border-b border-slate-100">
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded">{l.role || "—"}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100 font-bold text-navy">{l.days || "—"}</td>
                      <td className="px-4 py-3 border-b border-slate-100">
                        <span className={`font-bold ${attPct! < 75 ? "text-rose-600" : "text-emerald-600"}`}>
                          {attPct!.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100">
                        {impact === "at-risk"
                          ? <span className="bg-rose-100 text-rose-700 text-[11px] font-bold px-2.5 py-1 rounded-full">⚠️ At Risk</span>
                          : <span className="bg-emerald-100 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full">✅ OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="📋 Staff Leave Requests — View Only" count={filtered.length}>
          <LiveBadge collection="leave_requests" />
        </CardHeader>

        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p className="text-[12px] text-blue-600 font-semibold">
            View only — Leave approvals are managed by the Class Teacher or Principal within each school.
          </p>
        </div>

        <FilterBar>
          <FilterSelect value={selectedSchool} onChange={setSelectedSchool}
            options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string, string])]} />
        </FilterBar>

        <Table headers={["Name", "Role", "Reason", "From", "To", "Days", "Status"]}>
          {filtered.length > 0 ? filtered.map(l => (
            <Tr key={l.id}>
              <Td><strong className="text-navy">{l.name || l.roleId || "—"}</strong></Td>
              <Td><span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded">{l.role || "—"}</span></Td>
              <Td><span className="text-slate-500 text-[12px]">{l.reason || "—"}</span></Td>
              <Td mono>{l.from || "—"}</Td>
              <Td mono>{l.to || "—"}</Td>
              <Td><strong>{l.days || "—"}</strong></Td>
              <Td><Badge status={l.status || "Pending"} /></Td>
            </Tr>
          )) : <EmptyState icon="📋" message="No leave requests found" />}
        </Table>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            🔒 Super Admin has read-only access to leaves. Approve/Reject is handled by school staff.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

"use client";
// src/app/dashboard/page.tsx
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAdmin }    from "@/context/AdminContext";
import { Card, CardHeader, MetricCard, Avatar, Badge, LiveBadge, MarksDiff, FilterSelect } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from "recharts";

export default function DashboardPage() {
  const { metrics, schools, teachers, students, marksAudit, notifications } = useAdmin();
  const [selectedSchool, setSelectedSchool] = useState("");

  // Filtered data for school-scoped metrics
  const filteredTeachers = teachers.filter(t => !selectedSchool || t.schoolId === selectedSchool || t.school_id === selectedSchool);
  const filteredStudents  = students.filter(s => !selectedSchool || s.schoolId === selectedSchool || s.school_id === selectedSchool);

  const selectedSchoolName = selectedSchool ? (schools.find(s => s.id === selectedSchool)?.name || selectedSchool) : "";

  const metricCards = [
    { icon: "🏫", bg: "#eef2ff", value: metrics.schools,                                        label: "Total Schools",    sub: "schools collection" },
    { icon: "👩‍🏫", bg: "#e0f7fa", value: filteredTeachers.length,                               label: "Total Teachers",   sub: selectedSchool ? selectedSchoolName : "users · role=teacher" },
    { icon: "🎓", bg: "#e8f5e9", value: filteredStudents.length,                                label: "Total Students",   sub: selectedSchool ? selectedSchoolName : "students collection" },
    { icon: "📝", bg: "#fff8e1", value: metrics.marksToday,                                     label: "Marks Today",      sub: "student_marks" },
    { icon: "✅", bg: "#fce4ec", value: metrics.attendanceToday,                                label: "Attendance Today", sub: "attendance" },
    { icon: "👤", bg: "#f3e5f5", value: filteredTeachers.filter(t => t.status !== "inactive").length, label: "Active Teachers", sub: "status=active" },
  ];

  // Build mini chart data filtered by selected school
  const classGroups: Record<string, number> = {};
  filteredStudents.forEach(s => { const c = s.classId || s.class || "Other"; classGroups[c] = (classGroups[c] || 0) + 1; });
  const classChartData = Object.entries(classGroups).slice(0, 8).map(([name, count]) => ({ name, count }));

  const schoolChartData = schools.map(s => ({
    name: (s.name || s.schoolName || s.id || "").slice(0, 10),
    id: s.id,
    teachers: teachers.filter(t => t.schoolId === s.id || t.school_id === s.id).length,
    students: students.filter(st => st.schoolId === s.id || st.school_id === s.id).length,
  }));

  return (
    <DashboardLayout title="Dashboard Overview">

      {/* School filter toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <FilterSelect
          value={selectedSchool}
          onChange={setSelectedSchool}
          options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string, string])]}
        />
        {selectedSchool && (
          <span className="text-[12px] text-slate-500 font-medium">
            Showing data for: <strong className="text-navy">{selectedSchoolName}</strong>
          </span>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        {metricCards.map((c, i) => (
          <MetricCard key={i} icon={c.icon} bg={c.bg} value={c.value.toLocaleString("en-IN")} label={c.label} sub={c.sub} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader title="Students per Class" count={classChartData.length}>
            <LiveBadge collection="students" />
          </CardHeader>
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#00B4D8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Teachers & Students per School">
            <LiveBadge collection="live" />
          </CardHeader>
          <div className="p-5 h-52">
            {schoolChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={schoolChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="teachers" radius={[3,3,0,0]} name="Teachers">
                    {schoolChartData.map((entry, i) => (
                      <Cell key={i} fill={selectedSchool && entry.id === selectedSchool ? "#F5A623" : "#94a3b8"} />
                    ))}
                  </Bar>
                  <Bar dataKey="students" radius={[3,3,0,0]} name="Students">
                    {schoolChartData.map((entry, i) => (
                      <Cell key={i} fill={selectedSchool && entry.id === selectedSchool ? "#0D1B2A" : "#10B981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No school data yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent marks audit */}
        <Card className="col-span-2">
          <CardHeader title="📝 Recent Marks Edits" count={marksAudit.length}>
            <LiveBadge collection="markEdits" />
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Student","Subject","Change","Edited By","Time"].map(h => (
                    <th key={h} className="px-4 py-2.5 bg-slate-50 text-left text-[10.5px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marksAudit.slice(0, 6).map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border-b border-slate-100 text-[12.5px] font-semibold text-navy">{m.studentName || m.studentId || "—"}</td>
                    <td className="px-4 py-3 border-b border-slate-100"><span className="bg-brand-teal/10 text-brand-teal text-[11px] font-semibold px-2 py-0.5 rounded">{m.subject || "—"}</span></td>
                    <td className="px-4 py-3 border-b border-slate-100"><MarksDiff oldVal={m.oldMarks ?? m.old} newVal={m.newMarks ?? m.new} /></td>
                    <td className="px-4 py-3 border-b border-slate-100 text-[12px] text-slate-500">{m.editedBy || "—"}</td>
                    <td className="px-4 py-3 border-b border-slate-100 text-[10.5px] text-slate-400 font-mono">{m.ts}</td>
                  </tr>
                ))}
                {marksAudit.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">No mark edits yet — will appear here in real-time</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Live Error Alerts — shows role + severity from all apps */}
        <Card>
          <CardHeader title="🔔 Live Error Alerts" count={notifications.length}>
            <LiveBadge collection="alerts" />
          </CardHeader>
          <div className="divide-y divide-slate-50">
            {notifications.slice(0, 6).map(n => {
              const a = n as any;
              const sev = a.severity as string | undefined;
              const role = a.userRole as string | undefined;
              const roleIcon = role === "teacher" ? "👩‍🏫" : role === "parent" ? "👨‍👩‍👧" : role === "driver" ? "🚌" : role === "cleaner" ? "🧹" : n.driverId ? "🚌" : "ℹ️";
              const typeIcon = n.type === "js_crash" ? "💥" : n.type === "api_error" ? "🔌" : n.type === "auth_error" ? "🔐" : roleIcon;
              const dot = sev === "critical" ? "bg-rose-500" : sev === "high" ? "bg-orange-400" : "bg-slate-300";
              return (
                <div key={n.id} className={`flex gap-3 px-4 py-3 ${!n.read ? "bg-amber-50/40" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${sev === "critical" ? "bg-rose-100" : "bg-slate-100"}`}>{typeIcon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] ${n.read ? "font-medium" : "font-bold"} text-navy truncate`}>{n.message || n.title || "Alert"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {role && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full capitalize">{role}</span>}
                      {sev  && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                      {a.source === "auto" && <span className="text-[9px] text-blue-400 font-bold">auto</span>}
                      <span className="text-[9.5px] text-slate-400">{n.ts}</span>
                    </div>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-gold rounded-full mt-1.5 flex-shrink-0" />}
                </div>
              );
            })}
            {notifications.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No alerts yet ✅</div>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

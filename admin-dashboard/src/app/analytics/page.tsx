"use client";
// src/app/analytics/page.tsx
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader } from "@/components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

interface AttendanceDoc {
  schoolId?: string;
  school_id?: string;
  date?: string;
  status?: string;
  classId?: string;
}

const PIE_COLORS = ["#f43f5e", "#f59e0b", "#10B981", "#0D1B2A"];

export default function AnalyticsPage() {
  const { schools, teachers, students, classes, marksAudit, fees, leaves } = useAdmin();
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);

  useEffect(() => {
    getDocs(collection(db, "attendance")).then(snap => {
      setAttendance(snap.docs.map(d => ({ ...d.data() } as AttendanceDoc)));
    }).catch(() => {});
  }, []);

  const schoolList = [{ id: "all", name: "All Schools" }, ...schools.map(s => ({ id: s.id, name: s.name || s.schoolName || s.id }))];

  const filterSchool = (sid: string) => selectedSchool === "all" || sid === selectedSchool;

  // ── Attendance trend (last 30 days) ──────────────────────
  const last30: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last30[d.toISOString().slice(0, 10)] = 0;
  }
  attendance
    .filter(a => filterSchool(a.schoolId || a.school_id || "") && a.status === "present")
    .forEach(a => { if (a.date && last30[a.date] !== undefined) last30[a.date]++; });
  const attendanceTrend = Object.entries(last30).map(([date, present]) => ({
    date: date.slice(5), present
  }));

  // Attendance warning: avg < 75% of school students
  const schoolStudentCount = selectedSchool === "all" ? students.length : students.filter(s => (s.schoolId || s.school_id) === selectedSchool).length;
  const recentDays = attendanceTrend.filter(d => d.present > 0);
  const avgAttendance = recentDays.length > 0
    ? recentDays.reduce((s, d) => s + d.present, 0) / recentDays.length
    : null;
  const attendancePct = schoolStudentCount > 0 && avgAttendance !== null ? (avgAttendance / schoolStudentCount * 100) : null;
  const attendanceWarn = attendancePct !== null && attendancePct < 75;

  // ── Marks analysis ────────────────────────────────────────
  const filteredMarks = marksAudit.filter(m => filterSchool(m.schoolId || m.school_id || ""));
  const subjectGroups: Record<string, number[]> = {};
  filteredMarks.forEach(m => {
    const subj = m.subject || "Other";
    const val  = m.newMarks ?? m.new ?? 0;
    if (!subjectGroups[subj]) subjectGroups[subj] = [];
    subjectGroups[subj].push(val);
  });
  const marksBarData = Object.entries(subjectGroups).map(([subject, vals]) => ({
    subject: subject.slice(0, 10),
    avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
  }));
  const marksWarn = marksBarData.some(d => d.avg < 40);

  // Marks pie
  const allVals = filteredMarks.map(m => m.newMarks ?? m.new ?? 0);
  const pieData = [
    { name: "< 40",    value: allVals.filter(v => v < 40).length },
    { name: "40–60",   value: allVals.filter(v => v >= 40 && v < 60).length },
    { name: "60–80",   value: allVals.filter(v => v >= 60 && v < 80).length },
    { name: "80–100",  value: allVals.filter(v => v >= 80).length },
  ];

  // ── Class strength table ──────────────────────────────────
  const filteredClasses = classes.filter(c => filterSchool(c.schoolId || c.school_id || ""));
  const classRows = filteredClasses.map(c => {
    const classStudents = students.filter(s => s.classId === c.name || s.classId === c.id);
    const classTeachers = teachers.filter(t =>
      Array.isArray(t.assignedClasses)
        ? t.assignedClasses.includes(c.name || c.id || "")
        : t.classTeacherOf === (c.name || c.id)
    );
    const classAttend = attendance.filter(a =>
      filterSchool(a.schoolId || a.school_id || "") && a.classId === (c.name || c.id)
    );
    const presentDays = classAttend.filter(a => a.status === "present").length;
    const totalDays   = classAttend.length;
    const attPct      = totalDays > 0 ? Math.round(presentDays / totalDays * 100) : null;

    const classMarks = filteredMarks.filter(m => m.classId === (c.name || c.id));
    const avgMark    = classMarks.length > 0
      ? Math.round(classMarks.reduce((s, m) => s + (m.newMarks ?? m.new ?? 0), 0) / classMarks.length)
      : null;

    return { c, classStudents, classTeachers, attPct, avgMark };
  });

  // ── Fees summary ──────────────────────────────────────────
  const filteredFees = fees.filter(f => filterSchool(f.schoolId || ""));
  const paidAmt   = filteredFees.filter(f => f.status === "paid").reduce((s, f) => s + (f.amount || 0), 0);
  const unpaidAmt = filteredFees.filter(f => f.status === "unpaid").reduce((s, f) => s + (f.amount || 0), 0);
  const collectRate = paidAmt + unpaidAmt > 0 ? Math.round(paidAmt / (paidAmt + unpaidAmt) * 100) : 0;

  // ── Leave summary ─────────────────────────────────────────
  const filteredLeaves = leaves; // no schoolId on leaves — show all
  const lPending  = filteredLeaves.filter(l => l.status === "Pending").length;
  const lApproved = filteredLeaves.filter(l => l.status === "Approved").length;
  const lRejected = filteredLeaves.filter(l => l.status === "Rejected").length;
  const lApproveRate = lApproved + lRejected > 0 ? Math.round(lApproved / (lApproved + lRejected) * 100) : 0;

  // Warning badge calculation per school tab
  const schoolWarnings = new Set<string>();
  schools.forEach(s => {
    const sMarks = marksAudit.filter(m => (m.schoolId || m.school_id) === s.id);
    const sVals  = sMarks.map(m => m.newMarks ?? m.new ?? 0);
    if (sVals.length > 0) {
      const avg = sVals.reduce((a, b) => a + b, 0) / sVals.length;
      if (avg < 40) schoolWarnings.add(s.id);
    }
    const sAttend  = attendance.filter(a => (a.schoolId || a.school_id) === s.id && a.status === "present");
    const sStudents = students.filter(st => (st.schoolId || st.school_id) === s.id).length;
    if (sStudents > 0 && sAttend.length > 0) {
      const days30 = attendance.filter(a => (a.schoolId || a.school_id) === s.id);
      const uniqueDays = new Set(days30.map(a => a.date)).size;
      if (uniqueDays > 0) {
        const avgPres = sAttend.length / uniqueDays;
        if (avgPres / sStudents * 100 < 75) schoolWarnings.add(s.id);
      }
    }
  });

  return (
    <DashboardLayout title="School Analytics">

      {/* School selector tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {schoolList.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSchool(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold border transition-all ${
              selectedSchool === s.id
                ? "bg-navy text-gold border-navy"
                : "bg-white text-slate-600 border-slate-200 hover:border-navy hover:text-navy"
            }`}
          >
            {s.name.slice(0, 18)}
            {schoolWarnings.has(s.id) && (
              <span className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-black">!</span>
            )}
          </button>
        ))}
      </div>

      {/* Attendance */}
      <Card className="mb-5">
        <CardHeader title="📅 Attendance Trend — Last 30 Days">
          {attendanceWarn && (
            <span className="bg-amber-100 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
              ⚠️ Below 75% avg
            </span>
          )}
        </CardHeader>
        <div className="p-5" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="present" stroke="#10B981" fill="#d1fae5" name="Present" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {attendancePct !== null && (
          <div className="px-5 pb-4 text-[12px] text-slate-500">
            Average daily attendance: <strong className={attendanceWarn ? "text-amber-600" : "text-emerald-600"}>{attendancePct.toFixed(1)}%</strong>
          </div>
        )}
      </Card>

      {/* Marks Analysis */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card>
          <CardHeader title="📝 Avg Marks by Subject">
            {marksWarn && (
              <span className="bg-rose-100 text-rose-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                ⚠️ Subject below 40
              </span>
            )}
          </CardHeader>
          <div className="p-4" style={{ height: 220 }}>
            {marksBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marksBarData}>
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="avg" name="Avg Marks" radius={[3, 3, 0, 0]}>
                    {marksBarData.map((d, i) => (
                      <Cell key={i} fill={d.avg < 40 ? "#f43f5e" : "#0D1B2A"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-slate-400 text-sm">No marks data</div>}
          </div>
        </Card>

        <Card>
          <CardHeader title="📊 Marks Distribution" />
          <div className="p-4" style={{ height: 220 }}>
            {allVals.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-slate-400 text-sm">No marks data</div>}
          </div>
        </Card>
      </div>

      {/* Class Strength Table */}
      <Card className="mb-5">
        <CardHeader title="📚 Class Strength" count={classRows.length} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Class", "Students", "Teachers", "Avg Attendance %", "Avg Marks"].map(h => (
                  <th key={h} className="bg-slate-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classRows.length > 0 ? classRows.map(({ c, classStudents, classTeachers, attPct, avgMark }) => (
                <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${attPct !== null && attPct < 75 ? "bg-amber-50" : ""} ${avgMark !== null && avgMark < 40 ? "bg-rose-50" : ""}`}>
                  <td className="px-4 py-3 border-b border-slate-100 font-bold text-navy text-[13px]">{c.name || c.id}</td>
                  <td className="px-4 py-3 border-b border-slate-100 text-[13px] font-black text-navy">{classStudents.length}</td>
                  <td className="px-4 py-3 border-b border-slate-100 text-[13px]">{classTeachers.length}</td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    {attPct !== null
                      ? <span className={`font-bold ${attPct < 75 ? "text-amber-600" : "text-emerald-600"}`}>{attPct}%</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    {avgMark !== null
                      ? <span className={`font-bold ${avgMark < 40 ? "text-rose-600" : "text-navy"}`}>{avgMark}</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No classes found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fees + Leaves */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title="🧾 Fees Summary" />
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-500">₹{paidAmt.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-slate-500 mt-1">Collected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-rose-500">₹{unpaidAmt.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-slate-500 mt-1">Pending</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-black ${collectRate >= 75 ? "text-emerald-500" : "text-amber-500"}`}>{collectRate}%</div>
                <div className="text-[10px] text-slate-500 mt-1">Collection Rate</div>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${collectRate}%` }} />
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5 text-right">{filteredFees.length} total records</div>
          </div>
        </Card>

        <Card>
          <CardHeader title="📋 Leave Summary" />
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-2xl font-black text-amber-500">{lPending}</div>
                <div className="text-[10px] text-slate-500 mt-1">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-500">{lApproved}</div>
                <div className="text-[10px] text-slate-500 mt-1">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-rose-500">{lRejected}</div>
                <div className="text-[10px] text-slate-500 mt-1">Rejected</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${lApproveRate}%` }} />
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{lApproveRate}% approval</span>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

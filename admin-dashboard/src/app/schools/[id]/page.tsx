"use client";
// src/app/schools/[id]/page.tsx
import { useParams, useRouter }  from "next/navigation";
import { doc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db }                    from "@/lib/firebase";
import { useAdmin }              from "@/context/AdminContext";
import DashboardLayout           from "@/components/layout/DashboardLayout";
import { Card, CardHeader, Badge, Btn, Table, Tr, Td, SubjectBadge, MarksDiff, EmptyState, LiveBadge } from "@/components/ui";
import type { FeatureFlags }     from "@/types";
import { useState, useEffect }   from "react";

// ── FEATURE FLAGS ─────────────────────────────────────────────
const FEATURES: { key: keyof FeatureFlags; icon: string; name: string; desc: string }[] = [
  { key: "marksEntry",  icon: "📝", name: "Marks Entry",   desc: "Allow teachers to submit & edit marks" },
  { key: "attendance",  icon: "✅", name: "Attendance",    desc: "Daily class attendance tracking" },
  { key: "parentLogin", icon: "👨‍👩‍👧", name: "Parent Login", desc: "Parent portal via phone + PIN" },
  { key: "qrLogin",     icon: "📱", name: "QR Login",      desc: "Student QR code scanning" },
  { key: "smsAlerts",   icon: "💬", name: "SMS Alerts",    desc: "SMS notifications to parents" },
  { key: "reportCards", icon: "📄", name: "Report Cards",  desc: "Auto-generate report cards" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── GROWTH INDICATOR ─────────────────────────────────────────
function GrowthBadge({ value, label }: { value: number; label: string }) {
  const isGood    = value >= 75;
  const isWarning = value >= 50 && value < 75;
  const isDanger  = value < 50;
  return (
    <div className={`rounded-xl px-3 py-1.5 flex items-center gap-2 text-[12px] font-bold border
      ${isGood    ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}
      ${isWarning ? "bg-amber-50 text-amber-600 border-amber-200"       : ""}
      ${isDanger  ? "bg-rose-50 text-rose-600 border-rose-200"          : ""}
    `}>
      {isGood ? "↑" : isDanger ? "↓" : "→"} {value}% {label}
    </div>
  );
}

// ── MINI BAR ─────────────────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold text-slate-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { schools, teachers, students, classes, marksAudit } = useAdmin();

  const school = schools.find(s => s.id === id);
  const [flags,   setFlags]   = useState<FeatureFlags>(school?.features || {
    marksEntry: true, attendance: true, parentLogin: true, qrLogin: false, smsAlerts: true, reportCards: false,
  });
  const [tab,     setTab]     = useState<"overview"|"attendance"|"marks"|"features">("overview");

  // Analytics data from Firestore
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [marksData,      setMarksData]      = useState<any[]>([]);
  const [loadingData,    setLoadingData]    = useState(true);
  const [warnings,       setWarnings]       = useState<string[]>([]);

  const schoolTeachers = teachers.filter(t => t.schoolId === id || t.school_id === id);
  const schoolStudents = students.filter(s => s.schoolId === id || s.school_id === id);
  const schoolClasses  = classes.filter(c => c.schoolId === id || c.school_id === id);
  const schoolAudit    = marksAudit.filter(m => m.schoolId === id || m.school_id === id).slice(0, 10);

  // ── FETCH ANALYTICS ────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchAnalytics = async () => {
      setLoadingData(true);
      try {
        // Fetch attendance records for this school
        const attSnap = await getDocs(
          query(collection(db, "attendance"), where("schoolId", "==", id), orderBy("date", "desc"), limit(500))
        );
        const attDocs = attSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setAttendanceData(attDocs);

        // Fetch marks/exam data
        const marksSnap = await getDocs(
          query(collection(db, "student_marks"), where("schoolId", "==", id), limit(500))
        );
        const marksDocs = marksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setMarksData(marksDocs);

        // Generate warnings
        const w: string[] = [];
        const classGroups: Record<string, any[]> = {};
        attDocs.forEach(a => {
          const cls = a.classId || a.class || "Unknown";
          if (!classGroups[cls]) classGroups[cls] = [];
          classGroups[cls].push(a);
        });
        Object.entries(classGroups).forEach(([cls, records]) => {
          const present = records.filter(r => r.status === "present").length;
          const pct = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
          if (pct < 75 && records.length > 10) {
            w.push(`⚠️ Class ${cls}: Low attendance at ${pct}% — below 75% threshold`);
          }
        });

        // Marks warnings
        const marksGroups: Record<string, any[]> = {};
        marksDocs.forEach(m => {
          const cls = m.classId || m.class || "Unknown";
          if (!marksGroups[cls]) marksGroups[cls] = [];
          marksGroups[cls].push(m);
        });
        Object.entries(marksGroups).forEach(([cls, records]) => {
          const avg = records.reduce((s, r) => s + (r.marks || r.score || 0), 0) / records.length;
          if (avg < 40 && records.length > 5) {
            w.push(`📉 Class ${cls}: Low average marks at ${Math.round(avg)}% — needs attention`);
          }
        });

        setWarnings(w);
      } catch (e) {
        console.warn("Analytics fetch error:", e);
      } finally {
        setLoadingData(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  // ── COMPUTE MONTHLY ATTENDANCE ─────────────────────────────
  const monthlyAttendance = MONTHS.map((month, idx) => {
    const records = attendanceData.filter(a => {
      const d = a.date ? new Date(a.date) : null;
      return d && d.getMonth() === idx;
    });
    const present = records.filter(r => r.status === "present").length;
    const total   = records.length;
    return { month, present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  });

  // ── CLASS-WISE ATTENDANCE ──────────────────────────────────
  const classAttendance = schoolClasses.map(cls => {
    const records = attendanceData.filter(a => a.classId === cls.id || a.classId === cls.name);
    const present = records.filter(r => r.status === "present").length;
    const total   = records.length;
    return { name: cls.name || cls.id, present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  }).filter(c => c.total > 0);

  // ── CLASS-WISE MARKS ──────────────────────────────────────
  const classMarks = schoolClasses.map(cls => {
    const records = marksData.filter(m => m.classId === cls.id || m.classId === cls.name);
    const avg     = records.length > 0
      ? Math.round(records.reduce((s, r) => s + (r.marks || r.score || 0), 0) / records.length)
      : 0;
    // Group by exam
    const exams: Record<string, number[]> = {};
    records.forEach(r => {
      const exam = r.examType || r.exam || "General";
      if (!exams[exam]) exams[exam] = [];
      exams[exam].push(r.marks || r.score || 0);
    });
    const examStats = Object.entries(exams).map(([exam, scores]) => ({
      exam,
      avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      count: scores.length,
    }));
    return { name: cls.name || cls.id, avg, count: records.length, examStats };
  }).filter(c => c.count > 0);

  // ── OVERALL SCHOOL STATS ──────────────────────────────────
  const overallAttPct = attendanceData.length > 0
    ? Math.round((attendanceData.filter(a => a.status === "present").length / attendanceData.length) * 100)
    : 0;
  const overallMarkAvg = marksData.length > 0
    ? Math.round(marksData.reduce((s, m) => s + (m.marks || m.score || 0), 0) / marksData.length)
    : 0;

  if (!school) return (
    <DashboardLayout title="School Detail">
      <div className="text-center py-20 text-slate-400">
        <div className="text-4xl mb-3">🏫</div>
        <p>School not found</p>
        <Btn variant="outline" onClick={() => router.push("/schools")} className="mt-4">← Back</Btn>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title={school.name || school.schoolName || id}>
      <Btn variant="outline" onClick={() => router.push("/schools")} className="mb-4">← Back to Schools</Btn>

      {/* ── HEADER ── */}
      <Card className="mb-4">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 flex-wrap gap-y-3">
          <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center text-white text-[14px] font-black flex-shrink-0">
            {(school.name || "S").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-navy text-lg font-extrabold">{school.name || school.schoolName || id}</h2>
            <p className="text-slate-400 text-[11.5px] mt-0.5">
              Code: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">{(school as any).school_code || id}</code>
              {(school as any).village && <> · {(school as any).village}</>}
              {(school as any).district && <>, {(school as any).district}</>}
              {(school as any).state && <>, {(school as any).state}</>}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <GrowthBadge value={overallAttPct} label="Attendance" />
            <GrowthBadge value={overallMarkAvg} label="Avg Marks" />
            <Badge status={school.status || "active"} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-6 gap-0 divide-x divide-slate-100">
          {[
            ["👩‍🏫", "Teachers",  schoolTeachers.length],
            ["🎓", "Students",  schoolStudents.length],
            ["📚", "Classes",   schoolClasses.length],
            ["✅", "Att. Rate", `${overallAttPct}%`],
            ["📊", "Avg Marks", `${overallMarkAvg}%`],
            ["📝", "Edits",     schoolAudit.length],
          ].map(([ic, lbl, val]) => (
            <div key={String(lbl)} className="p-4 text-center">
              <div className="text-xl mb-1">{ic}</div>
              <div className="text-[20px] font-black text-navy">{val}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{lbl}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── WARNINGS ── */}
      {warnings.length > 0 && (
        <div className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <div className="font-bold text-rose-600 text-[13px] mb-2">🚨 Growth Alerts for this School</div>
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="text-[12px] text-rose-500 flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>{w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          ["overview",    "📊 Overview"],
          ["attendance",  "✅ Attendance Analytics"],
          ["marks",       "📝 Marks Analytics"],
          ["features",    "🎛️ Feature Control"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition cursor-pointer
              ${tab === key ? "bg-navy text-white border-navy" : "bg-white text-slate-600 border-slate-200 hover:border-navy"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader title="👩‍🏫 Teachers" count={schoolTeachers.length} />
            <Table headers={["Name","Subject","Class","Status"]}>
              {schoolTeachers.length > 0 ? schoolTeachers.map(t => (
                <Tr key={t.id}>
                  <Td><span className="font-semibold text-navy">{t.full_name || t.name || "—"}</span></Td>
                  <Td><SubjectBadge label={t.subject || "—"} /></Td>
                  <Td><span className="text-slate-500 text-[12px]">{t.classTeacherOf || "—"}</span></Td>
                  <Td><Badge status={t.status || "active"} /></Td>
                </Tr>
              )) : <EmptyState icon="👩‍🏫" message="No teachers yet" />}
            </Table>
          </Card>
          <Card>
            <CardHeader title="📝 Recent Marks Edits" count={schoolAudit.length}>
              <LiveBadge collection="markEdits" />
            </CardHeader>
            <Table headers={["Student","Subject","Change","By","Time"]}>
              {schoolAudit.length > 0 ? schoolAudit.map(m => (
                <Tr key={m.id}>
                  <Td><span className="font-semibold text-navy">{m.studentName || "—"}</span></Td>
                  <Td><SubjectBadge label={m.subject || "—"} /></Td>
                  <Td><MarksDiff oldVal={m.oldMarks ?? m.old} newVal={m.newMarks ?? m.new} /></Td>
                  <Td><span className="text-slate-500 text-[12px]">{m.editedBy || "—"}</span></Td>
                  <Td mono>{m.ts}</Td>
                </Tr>
              )) : <EmptyState icon="📝" message="No edits yet" />}
            </Table>
          </Card>
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {tab === "attendance" && (
        <div className="space-y-4">

          {/* Monthly chart */}
          <Card>
            <CardHeader title="📅 Monthly Attendance — Overall School" count={attendanceData.length}>
              <LiveBadge collection="attendance" />
            </CardHeader>
            <div className="p-5">
              {loadingData ? (
                <div className="text-center py-10 text-slate-400">Loading attendance data…</div>
              ) : (
                <>
                  <div className="flex items-end gap-2 h-40 mb-3">
                    {monthlyAttendance.map(m => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-[9px] font-bold text-slate-500">{m.pct > 0 ? `${m.pct}%` : ""}</div>
                        <div className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${m.pct}%`,
                            minHeight: m.pct > 0 ? "4px" : "0",
                            background: m.pct >= 75 ? "#10B981" : m.pct >= 50 ? "#F5A623" : m.pct > 0 ? "#F43F5E" : "#e2e8f0"
                          }} />
                        <div className="text-[9px] text-slate-400">{m.month}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> ≥75% Good</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> 50–74% Warning</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> &lt;50% Critical</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Class-wise attendance */}
          <Card>
            <CardHeader title="📚 Class-wise Attendance" count={classAttendance.length} />
            {loadingData ? (
              <div className="text-center py-10 text-slate-400">Loading…</div>
            ) : classAttendance.length > 0 ? (
              <div className="p-5 space-y-3">
                {classAttendance.map(cls => (
                  <div key={cls.name} className="flex items-center gap-4">
                    <div className="w-20 text-[12px] font-bold text-navy flex-shrink-0">{cls.name}</div>
                    <div className="flex-1">
                      <MiniBar value={cls.present} max={cls.total}
                        color={cls.pct >= 75 ? "#10B981" : cls.pct >= 50 ? "#F5A623" : "#F43F5E"} />
                    </div>
                    <div className={`text-[12px] font-bold w-20 text-right flex-shrink-0
                      ${cls.pct >= 75 ? "text-emerald-600" : cls.pct >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                      {cls.present}/{cls.total} ({cls.pct}%)
                    </div>
                    {cls.pct < 75 && (
                      <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                        ⚠️ Low
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                No class-wise attendance data yet.<br />
                <span className="text-xs">Data appears here once teachers mark attendance in the app.</span>
              </div>
            )}
          </Card>

          {/* Monthly class-wise table */}
          <Card>
            <CardHeader title="📊 Month-wise Class Attendance Summary" />
            {loadingData ? (
              <div className="text-center py-10 text-slate-400">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr>
                      <th className="bg-slate-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-slate-500 border-b border-slate-200">Class</th>
                      {MONTHS.map(m => (
                        <th key={m} className="bg-slate-50 px-3 py-2.5 text-center text-[10.5px] font-bold text-slate-500 border-b border-slate-200">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schoolClasses.length > 0 ? schoolClasses.map(cls => (
                      <tr key={cls.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 border-b border-slate-100 font-bold text-navy">{cls.name || cls.id}</td>
                        {MONTHS.map((_, idx) => {
                          const records = attendanceData.filter(a => {
                            const d = a.date ? new Date(a.date) : null;
                            return d && d.getMonth() === idx && (a.classId === cls.id || a.classId === cls.name);
                          });
                          const pct = records.length > 0
                            ? Math.round((records.filter(r => r.status === "present").length / records.length) * 100)
                            : null;
                          return (
                            <td key={idx} className="px-3 py-3 border-b border-slate-100 text-center">
                              {pct !== null ? (
                                <span className={`font-bold text-[11px] px-2 py-0.5 rounded-full
                                  ${pct >= 75 ? "bg-emerald-100 text-emerald-700" :
                                    pct >= 50 ? "bg-amber-100 text-amber-700" :
                                    "bg-rose-100 text-rose-700"}`}>
                                  {pct}%
                                </span>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )) : (
                      <tr><td colSpan={13} className="text-center py-10 text-slate-400 text-sm">No class data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MARKS TAB ── */}
      {tab === "marks" && (
        <div className="space-y-4">

          {/* Overall marks summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
              <div className={`text-3xl font-black ${overallMarkAvg >= 75 ? "text-emerald-500" : overallMarkAvg >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                {overallMarkAvg}%
              </div>
              <div className="text-sm text-slate-500 font-medium mt-1">📊 School Average</div>
              <GrowthBadge value={overallMarkAvg} label="overall" />
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
              <div className="text-3xl font-black text-navy">{marksData.length}</div>
              <div className="text-sm text-slate-500 font-medium mt-1">📝 Total Marks Records</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
              <div className="text-3xl font-black text-indigo-500">{classMarks.length}</div>
              <div className="text-sm text-slate-500 font-medium mt-1">📚 Classes with Data</div>
            </div>
          </div>

          {/* Class-wise marks */}
          <Card>
            <CardHeader title="📚 Class-wise Average Marks" count={classMarks.length} />
            {loadingData ? (
              <div className="text-center py-10 text-slate-400">Loading…</div>
            ) : classMarks.length > 0 ? (
              <div className="p-5 space-y-4">
                {classMarks.map(cls => (
                  <div key={cls.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-navy text-[13px]">{cls.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">{cls.count} records</span>
                        <GrowthBadge value={cls.avg} label="avg" />
                      </div>
                    </div>
                    <MiniBar value={cls.avg} max={100}
                      color={cls.avg >= 75 ? "#10B981" : cls.avg >= 50 ? "#F5A623" : "#F43F5E"} />

                    {/* Exam-wise breakdown */}
                    {cls.examStats.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {cls.examStats.map(ex => (
                          <div key={ex.exam} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px]">
                            <span className="font-bold text-slate-600">{ex.exam}:</span>
                            <span className={`font-black ml-1 ${ex.avg >= 75 ? "text-emerald-600" : ex.avg >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                              {ex.avg}%
                            </span>
                            <span className="text-slate-400 ml-1">({ex.count})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                No marks data yet.<br />
                <span className="text-xs">Data appears once teachers enter marks in the app.</span>
              </div>
            )}
          </Card>

          {/* Exam-wise class table */}
          <Card>
            <CardHeader title="📋 Exam-wise Class Performance" />
            <div className="overflow-x-auto">
              {loadingData ? (
                <div className="text-center py-10 text-slate-400">Loading…</div>
              ) : marksData.length > 0 ? (() => {
                const allExams = [...new Set(marksData.map(m => m.examType || m.exam || "General"))];
                return (
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr>
                        <th className="bg-slate-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-slate-500 border-b border-slate-200">Class</th>
                        {allExams.map(e => (
                          <th key={e} className="bg-slate-50 px-3 py-2.5 text-center text-[10.5px] font-bold text-slate-500 border-b border-slate-200">{e}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schoolClasses.map(cls => (
                        <tr key={cls.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 border-b border-slate-100 font-bold text-navy">{cls.name || cls.id}</td>
                          {allExams.map(exam => {
                            const records = marksData.filter(m =>
                              (m.classId === cls.id || m.classId === cls.name) &&
                              (m.examType === exam || m.exam === exam || exam === "General")
                            );
                            const avg = records.length > 0
                              ? Math.round(records.reduce((s, r) => s + (r.marks || r.score || 0), 0) / records.length)
                              : null;
                            return (
                              <td key={exam} className="px-3 py-3 border-b border-slate-100 text-center">
                                {avg !== null ? (
                                  <span className={`font-bold text-[11px] px-2 py-0.5 rounded-full
                                    ${avg >= 75 ? "bg-emerald-100 text-emerald-700" :
                                      avg >= 50 ? "bg-amber-100 text-amber-700" :
                                      "bg-rose-100 text-rose-700"}`}>
                                    {avg}%
                                  </span>
                                ) : <span className="text-slate-300 text-[10px]">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })() : (
                <div className="text-center py-10 text-slate-400 text-sm">No exam data yet</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── FEATURES TAB ── */}
      {tab === "features" && (
        <Card>
          <CardHeader title="🎛️ Feature Flags for this School" />
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <span className="text-blue-500 text-lg">ℹ️</span>
            <p className="text-[12px] text-blue-600 font-semibold">
              View only — Feature flags are managed by each School Admin.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 p-5">
            {FEATURES.map(f => (
              <div key={f.key} className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <span className="text-2xl">{f.icon}</span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-navy">{f.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{f.desc}</div>
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
      )}

    </DashboardLayout>
  );
}

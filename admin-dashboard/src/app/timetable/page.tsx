"use client";
// src/app/timetable/page.tsx
import { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterInput, FilterSelect, Table, Tr, Td, Badge, EmptyState } from "@/components/ui";

const DAYS    = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const DAY_ALIASES: Record<string, string> = {
  monday: "Mon", mon: "Mon", mo: "Mon",
  tuesday: "Tue", tue: "Tue", tu: "Tue",
  wednesday: "Wed", wed: "Wed", we: "Wed",
  thursday: "Thu", thu: "Thu", th: "Thu",
  friday: "Fri", fri: "Fri", fr: "Fri",
};

interface TimetableEntry {
  day?: string;
  period?: number | string;
  subject?: string;
  classId?: string;
}

function parseEntry(raw: unknown): TimetableEntry | null {
  if (!raw) return null;
  if (typeof raw === "string") return { subject: raw };
  if (typeof raw === "object") return raw as TimetableEntry;
  return null;
}

function normaliseDay(raw?: string): string {
  if (!raw) return "";
  return DAY_ALIASES[raw.toLowerCase().trim()] || raw.slice(0, 3);
}

export default function TimetablePage() {
  const { teachers, schools } = useAdmin();
  const [search, setSearch]   = useState("");
  const [school, setSchool]   = useState("");
  const [dayFilter, setDayFilter] = useState("");

  const filtered = teachers.filter(t => {
    const name = (t.full_name || t.name || "").toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (school && t.schoolId !== school && t.school_id !== school) return false;
    return true;
  });

  const assigned   = filtered.filter(t => Array.isArray(t.timetable) && t.timetable.length > 0);
  const unassigned = filtered.filter(t => !Array.isArray(t.timetable) || t.timetable.length === 0);

  // ── Period heatmap ────────────────────────────────────────
  // heatmap[day][period] = count of teachers scheduled
  const heatmap: Record<string, Record<number, number>> = {};
  DAYS.forEach(d => { heatmap[d] = {}; PERIODS.forEach(p => { heatmap[d][p] = 0; }); });

  const heatmapTeachers = school ? teachers.filter(t => t.schoolId === school || t.school_id === school) : teachers;
  heatmapTeachers.forEach(t => {
    if (!Array.isArray(t.timetable)) return;
    t.timetable.forEach(raw => {
      const entry = parseEntry(raw);
      if (!entry) return;
      const day = normaliseDay(entry.day);
      const per = typeof entry.period === "string" ? parseInt(entry.period) : (entry.period || 0);
      if (DAYS.includes(day) && PERIODS.includes(per)) {
        heatmap[day][per]++;
      }
    });
  });

  const heatColor = (n: number) => {
    if (n === 0) return "bg-white text-slate-300";
    if (n <= 2)  return "bg-blue-50 text-blue-400";
    if (n <= 4)  return "bg-blue-100 text-blue-600";
    return "bg-navy text-gold font-bold";
  };

  return (
    <DashboardLayout title="Timetable Monitor">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-navy">{teachers.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">📅 Total Teachers</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-emerald-500">{assigned.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">✅ Timetable Assigned</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-amber-500">{unassigned.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">⚠️ Not Assigned</div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <FilterBar>
          <FilterInput placeholder="🔍  Search teacher…" value={search} onChange={setSearch} />
          <FilterSelect value={school} onChange={setSchool}
            options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string, string])]} />
          <FilterSelect value={dayFilter} onChange={setDayFilter}
            options={[["", "All Days"], ...DAYS.map(d => [d, d] as [string, string])]} />
        </FilterBar>
      </Card>

      {/* Teacher timetable cards */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {assigned.length > 0 ? assigned.map(t => {
          const entries = (t.timetable as unknown[]).map(parseEntry).filter(Boolean) as TimetableEntry[];

          // Build grid: day -> period -> subject
          const grid: Record<string, Record<number, string>> = {};
          DAYS.forEach(d => { grid[d] = {}; });
          entries.forEach(e => {
            const day = normaliseDay(e.day);
            const per = typeof e.period === "string" ? parseInt(e.period) : (e.period || 0);
            if (DAYS.includes(day) && PERIODS.includes(per)) {
              grid[day][per] = e.subject || e.classId || "—";
            }
          });

          // Day filter
          const visibleDays = dayFilter ? [dayFilter] : DAYS;

          return (
            <Card key={t.id}>
              <CardHeader title={t.full_name || t.name || t.id}>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">{t.subject || "—"}</span>
                <span className="text-[10px] text-slate-400 font-mono">{t.schoolId || t.school_id || "—"}</span>
              </CardHeader>
              <div className="p-3 overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="w-8 bg-slate-50 px-1 py-1 text-slate-400 border border-slate-100 text-center">P</th>
                      {visibleDays.map(d => (
                        <th key={d} className="bg-slate-50 px-1 py-1 text-slate-500 font-bold border border-slate-100 text-center">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map(p => (
                      <tr key={p}>
                        <td className="bg-slate-50 text-center text-slate-400 font-bold border border-slate-100 py-0.5 px-1">{p}</td>
                        {visibleDays.map(d => {
                          const subj = grid[d]?.[p] || "";
                          const isOwn = subj && t.subject && subj.toLowerCase().includes(t.subject.toLowerCase());
                          return (
                            <td key={d} className={`border border-slate-100 text-center py-0.5 px-1 transition-colors ${isOwn ? "bg-gold/10 text-navy font-bold" : subj ? "bg-blue-50 text-blue-700" : ""}`}
                              style={{ height: 28 }}>
                              {subj ? subj.slice(0, 6) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        }) : (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
            <div className="text-4xl mb-2">📅</div>
            <div className="text-sm">No timetable data available for the selected filters</div>
          </div>
        )}
      </div>

      {/* Period Heatmap */}
      <Card className="mb-5">
        <CardHeader title={`🔥 Period Load — ${school ? schools.find(s => s.id === school)?.name || school : "All Schools"}`} />
        <div className="p-5 overflow-x-auto">
          <table className="border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="w-16 bg-slate-50 px-3 py-2 text-slate-400 border border-slate-200 text-center">Period</th>
                {DAYS.map(d => (
                  <th key={d} className="w-24 bg-slate-50 px-3 py-2 text-slate-600 font-bold border border-slate-200 text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(p => (
                <tr key={p}>
                  <td className="bg-slate-50 text-center text-slate-500 font-bold border border-slate-200 px-3 py-2">P{p}</td>
                  {DAYS.map(d => {
                    const n = heatmap[d]?.[p] || 0;
                    return (
                      <td key={d} className={`border border-slate-200 text-center px-3 py-2 font-mono transition-colors ${heatColor(n)}`}>
                        {n > 0 ? n : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-400 mt-2">Values show number of teachers assigned per slot. Gold = 5+ teachers.</p>
        </div>
      </Card>

      {/* Unassigned teachers */}
      {unassigned.length > 0 && (
        <Card>
          <CardHeader title="⚠️ Unassigned Teachers" count={unassigned.length} />
          <Table headers={["Teacher", "Subject", "School", "Status"]}>
            {unassigned.map(t => (
              <Tr key={t.id}>
                <Td>
                  <span className="font-bold text-navy">{t.full_name || t.name || t.id}</span>
                </Td>
                <Td>{t.subject || "—"}</Td>
                <Td mono>{t.schoolId || t.school_id || "—"}</Td>
                <Td>
                  <span className="bg-amber-100 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full">⚠️ Not Assigned</span>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}
    </DashboardLayout>
  );
}

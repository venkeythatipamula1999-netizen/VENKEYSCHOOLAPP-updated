"use client";
// src/app/students/page.tsx
import { useState }    from "react";
import { useAdmin }    from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterInput, FilterSelect, Table, Tr, Td, Avatar, ClassBadge, LiveBadge, EmptyState } from "@/components/ui";

export default function StudentsPage() {
  const { students, schools } = useAdmin();
  const [search, setSearch]   = useState("");
  const [cls,    setCls]      = useState("");
  const [school, setSchool]   = useState("");

  const classes  = [...new Set(students.map(s => s.classId || s.class || "").filter(Boolean))];
  const filtered = students.filter(s => {
    if (search && !(s.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (cls    && s.classId !== cls && s.class !== cls)                          return false;
    if (school && s.schoolId !== school && s.school_id !== school)               return false;
    return true;
  });

  return (
    <DashboardLayout title="Students — View Only">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-navy">{students.length.toLocaleString("en-IN")}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">🎓 Total Students</div>
          <div className="text-xs text-slate-400 mt-1">Across all schools</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-teal-500">{classes.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">📚 Total Classes</div>
          <div className="text-xs text-slate-400 mt-1">Unique class groups</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-indigo-500">{schools.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">🏫 Schools</div>
          <div className="text-xs text-slate-400 mt-1">With enrolled students</div>
        </div>
      </div>

      <Card>
        <CardHeader title="🎓 All Students" count={filtered.length}>
          <LiveBadge collection="students" />
        </CardHeader>

        {/* Read-only notice */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p className="text-[12px] text-blue-600 font-semibold">
            View only — Students are managed by the School Admin (import, edit, delete).
          </p>
        </div>

        <FilterBar>
          <FilterInput placeholder="🔍  Search students…" value={search} onChange={setSearch} />
          <FilterSelect value={cls} onChange={setCls}
            options={[["", "All Classes"], ...classes.map(c => [c, c] as [string,string])]} />
          <FilterSelect value={school} onChange={setSchool}
            options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string,string])]} />
        </FilterBar>

        <Table headers={["Student","Class","Roll No","Parent Phone","Student ID","School"]}>
          {filtered.length > 0 ? filtered.map(s => (
            <Tr key={s.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <Avatar name={s.name} bg="#00B4D8" />
                  <span className="font-bold text-navy text-[13px]">{s.name || "—"}</span>
                </div>
              </Td>
              <Td><ClassBadge label={s.classId || s.class || "—"} /></Td>
              <Td mono>{s.rollNumber || "—"}</Td>
              <Td mono>{s.parentPhone || "—"}</Td>
              <Td mono>{s.studentId || s.id}</Td>
              <Td><span className="text-[11px] text-slate-400">{s.schoolId || s.school_id || "—"}</span></Td>
            </Tr>
          )) : <EmptyState icon="🎓" message="No students yet" />}
        </Table>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            🔒 Super Admin has read-only access. Student management is handled by each School Admin.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

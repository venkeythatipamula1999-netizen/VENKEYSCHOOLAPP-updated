"use client";
// src/app/teachers/page.tsx
import { useState }    from "react";
import { useAdmin }    from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterInput, FilterSelect, Table, Tr, Td, Badge, Avatar, SubjectBadge, LiveBadge, EmptyState } from "@/components/ui";

export default function TeachersPage() {
  const { teachers, schools } = useAdmin();
  const [search, setSearch]   = useState("");
  const [school, setSchool]   = useState("");

  const filtered = teachers.filter(t => {
    const name = (t.full_name || t.name || t.id || "").toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (school && t.schoolId !== school && t.school_id !== school) return false;
    return true;
  });

  const active   = teachers.filter(t => t.status !== "inactive").length;
  const inactive = teachers.filter(t => t.status === "inactive").length;

  return (
    <DashboardLayout title="Teachers — View Only">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-navy">{teachers.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">👩‍🏫 Total Teachers</div>
          <div className="text-xs text-slate-400 mt-1">Across all schools</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-emerald-500">{active}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">✅ Active</div>
          <div className="text-xs text-slate-400 mt-1">Currently active</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-rose-400">{inactive}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">⊘ Inactive</div>
          <div className="text-xs text-slate-400 mt-1">Disabled by school</div>
        </div>
      </div>

      <Card>
        <CardHeader title="👩‍🏫 All Teachers" count={filtered.length}>
          <LiveBadge collection="users" />
        </CardHeader>

        {/* Read-only notice */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p className="text-[12px] text-blue-600 font-semibold">
            View only — Enabling or disabling teachers is managed by the School Admin of each school.
          </p>
        </div>

        <FilterBar>
          <FilterInput placeholder="🔍  Search teachers…" value={search} onChange={setSearch} />
          <FilterSelect value={school} onChange={setSchool}
            options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string,string])]} />
        </FilterBar>

        <Table headers={["Teacher","Role ID","Subject","Classes","School","Status"]}>
          {filtered.length > 0 ? filtered.map(t => (
            <Tr key={t.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <Avatar name={t.full_name || t.name} bg="#1a3a5c" />
                  <div>
                    <div className="font-bold text-navy text-[13px]">{t.full_name || t.name || "—"}</div>
                    <div className="text-[10.5px] text-slate-400">{t.email || ""}</div>
                  </div>
                </div>
              </Td>
              <Td mono>{t.role_id || t.id}</Td>
              <Td><SubjectBadge label={t.subject || "—"} /></Td>
              <Td>
                <div className="flex gap-1 flex-wrap">
                  {Array.isArray(t.assignedClasses)
                    ? t.assignedClasses.map(c => <span key={c} className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-1.5 py-0.5 rounded">{c}</span>)
                    : <span className="text-slate-400 text-[12px]">{t.classTeacherOf || "—"}</span>}
                </div>
              </Td>
              <Td><span className="text-[11px] text-slate-400">{t.schoolId || t.school_id || "—"}</span></Td>
              <Td><Badge status={t.status || "active"} /></Td>
            </Tr>
          )) : <EmptyState icon="👩‍🏫" message="No teachers found" />}
        </Table>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            🔒 Super Admin has read-only access. Teacher management is handled by each School Admin.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

"use client";
// src/app/marks-audit/page.tsx
import { useState }    from "react";
import { useAdmin }    from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterSelect, Table, Tr, Td, SubjectBadge, LiveBadge, EmptyState, MarksDiff, Btn } from "@/components/ui";

export default function MarksAuditPage() {
  const { marksAudit, schools } = useAdmin();
  const [filterSchool,  setFilterSchool]  = useState("");
  const [filterClass,   setFilterClass]   = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const classes  = [...new Set(marksAudit.map(m => m.classId).filter(Boolean))];
  const subjects = [...new Set(marksAudit.map(m => m.subject).filter(Boolean))];

  const filtered = marksAudit.filter(m => {
    if (filterSchool  && m.schoolId !== filterSchool)  return false;
    if (filterClass   && m.classId  !== filterClass)   return false;
    if (filterSubject && m.subject  !== filterSubject) return false;
    return true;
  });

  return (
    <DashboardLayout title="Marks Audit Trail">
      <Card>
        <CardHeader title="🔍 All Marks Edits" count={filtered.length}>
          <LiveBadge collection="markEdits" />
          <Btn variant="outline">📤 Export CSV</Btn>
        </CardHeader>
        <FilterBar>
          <FilterSelect value={filterSchool} onChange={setFilterSchool}
            options={[["","All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string,string])]} />
          <FilterSelect value={filterClass} onChange={setFilterClass}
            options={[["","All Classes"], ...classes.map(c => [c!, c!] as [string,string])]} />
          <FilterSelect value={filterSubject} onChange={setFilterSubject}
            options={[["","All Subjects"], ...subjects.map(s => [s!, s!] as [string,string])]} />
        </FilterBar>
        <Table headers={["Student","Subject","Marks Change","Δ","Edited By","Reason","Timestamp","School"]}>
          {filtered.length > 0 ? filtered.map(m => {
            const delta = (m.newMarks ?? m.new ?? 0) - (m.oldMarks ?? m.old ?? 0);
            return (
              <Tr key={m.id}>
                <Td><strong className="text-navy">{m.studentName || m.studentId || "—"}</strong></Td>
                <Td><SubjectBadge label={m.subject || "—"} /></Td>
                <Td><MarksDiff oldVal={m.oldMarks ?? m.old} newVal={m.newMarks ?? m.new} /></Td>
                <Td>
                  <span className={`font-bold text-[12px] ${delta > 0 ? "text-brand-emerald" : delta < 0 ? "text-brand-rose" : "text-slate-400"}`}>
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                </Td>
                <Td>{m.editedBy || "—"}</Td>
                <Td><span className="text-slate-500 text-[12px] max-w-[150px] truncate block">{m.editReason || m.reason || "—"}</span></Td>
                <Td mono>{m.ts}</Td>
                <Td mono>{m.schoolId || "—"}</Td>
              </Tr>
            );
          }) : <EmptyState icon="🔍" message="No mark edits yet — will appear in real-time when teachers edit marks" />}
        </Table>
        <div className="px-5 py-3 bg-rose-50/50 border-t border-rose-100">
          <p className="text-[11px] text-brand-rose font-semibold">🔒 Read-only for Super Admin. Only teachers can edit marks via the app.</p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

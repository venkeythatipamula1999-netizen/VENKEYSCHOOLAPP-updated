"use client";
// src/app/fees/page.tsx
import { useState }    from "react";
import { useAdmin }    from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterSelect, Table, Tr, Td, Badge, LiveBadge, EmptyState } from "@/components/ui";

export default function FeesPage() {
  const { fees, schools } = useAdmin();
  const [school, setSchool] = useState("");

  const filtered    = fees.filter(f => !school || f.schoolId === school);
  const totalPaid   = filtered.filter(f => f.status === "paid").reduce((s, f) => s + (f.amount || 0), 0);
  const totalUnpaid = filtered.filter(f => f.status === "unpaid").reduce((s, f) => s + (f.amount || 0), 0);
  const paidCount   = filtered.filter(f => f.status === "paid").length;
  const unpaidCount = filtered.filter(f => f.status === "unpaid").length;

  return (
    <DashboardLayout title="Fees — View Only">

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-navy">{filtered.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">🧾 Total Records</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-emerald-500">₹{totalPaid.toLocaleString("en-IN")}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">✅ Total Collected</div>
          <div className="text-xs text-slate-400 mt-1">{paidCount} paid</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-rose-500">₹{totalUnpaid.toLocaleString("en-IN")}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">⏳ Pending</div>
          <div className="text-xs text-slate-400 mt-1">{unpaidCount} unpaid</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-indigo-500">
            {filtered.length > 0 ? Math.round((paidCount / filtered.length) * 100) : 0}%
          </div>
          <div className="text-sm text-slate-500 font-medium mt-1">📊 Collection Rate</div>
        </div>
      </div>

      <Card>
        <CardHeader title="🧾 Fee Records" count={filtered.length}>
          <LiveBadge collection="fees" />
        </CardHeader>

        {/* Read-only notice */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p className="text-[12px] text-blue-600 font-semibold">
            View only — Fee collection and management is handled by the School Admin.
          </p>
        </div>

        <FilterBar>
          <FilterSelect value={school} onChange={setSchool}
            options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string,string])]} />
        </FilterBar>

        <Table headers={["Student ID","Amount","Due Date","Status","Paid Date","School"]}>
          {filtered.length > 0 ? filtered.map(f => (
            <Tr key={f.id}>
              <Td mono>{f.studentId || "—"}</Td>
              <Td><strong className="text-navy">₹{(f.amount || 0).toLocaleString("en-IN")}</strong></Td>
              <Td mono>{f.dueDate || "—"}</Td>
              <Td><Badge status={f.status || "unpaid"} /></Td>
              <Td mono>{f.paidDate || "—"}</Td>
              <Td><span className="text-[11px] text-slate-400">{f.schoolId || "—"}</span></Td>
            </Tr>
          )) : <EmptyState icon="🧾" message="No fee records yet" />}
        </Table>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            🔒 Super Admin has read-only access. Fee management is handled by each School Admin.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

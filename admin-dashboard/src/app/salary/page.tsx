"use client";
// src/app/salary/page.tsx
import { useState }    from "react";
import { useAdmin }    from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterSelect, Table, Tr, Td, LiveBadge, EmptyState } from "@/components/ui";

export default function SalaryPage() {
  const { salaries, schools } = useAdmin();
  const [school, setSchool] = useState("");

  const filtered     = salaries.filter(s => !school || (s as any).schoolId === school);
  const totalSalary  = filtered.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
  const totalDeduct  = filtered.reduce((sum, s) => sum + (s.deductions || 0), 0);
  const netPayable   = totalSalary - totalDeduct;

  return (
    <DashboardLayout title="Salaries — View Only">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-navy">₹{totalSalary.toLocaleString("en-IN")}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">💰 Total Base Salary</div>
          <div className="text-xs text-slate-400 mt-1">{filtered.length} staff members</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-rose-500">₹{totalDeduct.toLocaleString("en-IN")}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">⊘ Total Deductions</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-emerald-500">₹{netPayable.toLocaleString("en-IN")}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">✅ Net Payable</div>
        </div>
      </div>

      <Card>
        <CardHeader title="💰 Salary Records" count={filtered.length}>
          <LiveBadge collection="salaries" />
        </CardHeader>

        {/* Read-only notice */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p className="text-[12px] text-blue-600 font-semibold">
            View only — Salary processing and payments are managed by the School Admin.
          </p>
        </div>

        <FilterBar>
          <FilterSelect value={school} onChange={setSchool}
            options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string,string])]} />
        </FilterBar>

        <Table headers={["Name","Role","Base Salary","Paid Months","Deductions","Net Salary"]}>
          {filtered.length > 0 ? filtered.map(s => (
            <Tr key={s.id}>
              <Td><strong className="text-navy">{s.name || s.roleId || "—"}</strong></Td>
              <Td><span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded">{s.role || "—"}</span></Td>
              <Td><strong className="text-navy">₹{(s.baseSalary || 0).toLocaleString("en-IN")}</strong></Td>
              <Td><span className="text-slate-500 text-[12px]">{Array.isArray(s.paidMonths) ? s.paidMonths.join(", ") : (s.paidMonths || "None")}</span></Td>
              <Td><span className={(s.deductions || 0) > 0 ? "text-rose-500 font-semibold" : "text-slate-400"}>₹{(s.deductions || 0).toLocaleString("en-IN")}</span></Td>
              <Td><strong className="text-emerald-600">₹{((s.baseSalary || 0) - (s.deductions || 0)).toLocaleString("en-IN")}</strong></Td>
            </Tr>
          )) : <EmptyState icon="💰" message="No salary records yet" />}
        </Table>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            🔒 Super Admin has read-only access. Salary management is handled by each School Admin.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

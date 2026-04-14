"use client";
// src/app/parents/page.tsx
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, FilterBar, FilterInput, FilterSelect, Table, Tr, Td, Badge, Avatar, LiveBadge, EmptyState } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Parent {
  id: string;
  name?: string;
  full_name?: string;
  phone?: string;
  phoneNumber?: string;
  schoolId?: string;
  school_id?: string;
  lastLogin?: unknown;
  status?: string;
}

export default function ParentsPage() {
  const { schools, students } = useAdmin();
  const [parents, setParents] = useState<Parent[]>([]);
  const [search, setSearch]   = useState("");
  const [school, setSchool]   = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "parent")),
      snap => setParents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Parent)))
    );
    return unsub;
  }, []);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const getPhone = (p: Parent) => p.phone || p.phoneNumber || "";
  const getSchool = (p: Parent) => p.schoolId || p.school_id || "";
  const getName = (p: Parent) => p.full_name || p.name || "—";

  const getLastLoginDate = (p: Parent): Date | null => {
    if (!p.lastLogin) return null;
    if (p.lastLogin instanceof Timestamp) return p.lastLogin.toDate();
    if ((p.lastLogin as any)?.toDate) return (p.lastLogin as any).toDate();
    if (typeof p.lastLogin === "string") return new Date(p.lastLogin);
    return null;
  };

  const isActive = (p: Parent) => {
    const d = getLastLoginDate(p);
    return d ? d >= sevenDaysAgo : false;
  };

  const linkedCount = (p: Parent) => {
    const ph = getPhone(p);
    if (!ph) return 0;
    return students.filter(s => s.parentPhone === ph).length;
  };

  const filtered = parents.filter(p => {
    const name = getName(p).toLowerCase();
    const ph   = getPhone(p);
    if (search && !name.includes(search.toLowerCase()) && !ph.includes(search)) return false;
    if (school && getSchool(p) !== school) return false;
    return true;
  });

  // Summary stats
  const totalLinked   = parents.filter(p => linkedCount(p) > 0).length;
  const activeToday   = parents.filter(p => { const d = getLastLoginDate(p); return d ? d >= todayStart : false; }).length;
  const schoolsWithParents = new Set(parents.map(p => getSchool(p)).filter(Boolean)).size;

  // Chart data
  const schoolGroups: Record<string, number> = {};
  parents.forEach(p => {
    const sid = getSchool(p);
    if (sid) schoolGroups[sid] = (schoolGroups[sid] || 0) + 1;
  });
  const chartData = Object.entries(schoolGroups).map(([id, count]) => {
    const school = schools.find(s => s.id === id);
    return { name: (school?.name || id).slice(0, 10), count };
  });

  const formatLastLogin = (p: Parent) => {
    const d = getLastLoginDate(p);
    return d ? d.toLocaleDateString("en-IN") : "—";
  };

  return (
    <DashboardLayout title="Parents — View Only">

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-navy">{parents.length}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">👨‍👩‍👧 Total Parents</div>
          <div className="text-xs text-slate-400 mt-1">Registered accounts</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-emerald-500">{totalLinked}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">🔗 Linked to Students</div>
          <div className="text-xs text-slate-400 mt-1">Phone matched</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-blue-500">{activeToday}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">✅ Active Today</div>
          <div className="text-xs text-slate-400 mt-1">Logged in today</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-purple-500">{schoolsWithParents}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">🏫 Schools</div>
          <div className="text-xs text-slate-400 mt-1">With parent accounts</div>
        </div>
      </div>

      {/* Chart + Table layout */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="col-span-2">
          {/* placeholder for table below */}
        </div>
        {chartData.length > 0 && (
          <Card>
            <CardHeader title="📊 Parents by School" />
            <div className="p-4" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0D1B2A" radius={[3, 3, 0, 0]} name="Parents" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader title="👨‍👩‍👧 All Parents" count={filtered.length}>
          <LiveBadge collection="users/parent" />
        </CardHeader>

        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p className="text-[12px] text-blue-600 font-semibold">
            View only — Parent accounts are managed by each school's admin.
          </p>
        </div>

        <FilterBar>
          <FilterInput placeholder="🔍  Search name / phone…" value={search} onChange={setSearch} />
          <FilterSelect value={school} onChange={setSchool}
            options={[["", "All Schools"], ...schools.map(s => [s.id, s.name || s.id] as [string, string])]} />
        </FilterBar>

        <Table headers={["Parent", "Phone", "School", "Students Linked", "Last Login", "Status"]}>
          {filtered.length > 0 ? filtered.map(p => (
            <Tr key={p.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <Avatar name={getName(p)} bg="#6d28d9" />
                  <div className="font-bold text-navy text-[13px]">{getName(p)}</div>
                </div>
              </Td>
              <Td mono>{getPhone(p) || "—"}</Td>
              <Td mono>{getSchool(p) || "—"}</Td>
              <Td>
                <span className={`font-bold text-[13px] ${linkedCount(p) > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {linkedCount(p)}
                </span>
              </Td>
              <Td mono>{formatLastLogin(p)}</Td>
              <Td>
                <Badge status={isActive(p) ? "active" : "inactive"} />
              </Td>
            </Tr>
          )) : <EmptyState icon="👨‍👩‍👧" message="No parent accounts found" />}
        </Table>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            🔒 Super Admin has read-only access. Parent management is handled by each School Admin.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}

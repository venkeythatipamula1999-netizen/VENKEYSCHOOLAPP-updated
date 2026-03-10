import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  Modal, ActivityIndicator, Switch, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';
const INR = v => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const attColor = p => p >= 90 ? '#34D399' : p >= 75 ? C.gold : C.coral;

function fmtMonthLabel(m) {
  if (!m) return '';
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}
function fmtHours(h) {
  if (!h || h <= 0) return '';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function prevMonth(m) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMonth(m) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_COLORS = { Present: '#34D399', 'Half Day': C.gold, 'Short Day': '#FB923C', Absent: C.coral };
const STATUS_ICONS = { Present: '✅', 'Half Day': '🟡', 'Short Day': '🟠', Absent: '❌' };

export default function AdminSalaryScreen({ onBack, currentUser }) {
  const [month, setMonth] = useState(currentMonth());
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [detail, setDetail] = useState(null);

  const fetchEmployees = useCallback(async (m) => {
    setLoading(true);
    try {
      const r = await apiFetch(`/payroll/employees?month=${m}`);
      const data = await r.json();
      setEmployees(data.employees || []);
    } catch (e) {
      console.error('Payroll fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(month); }, [month]);

  const depts = ['All', ...Array.from(new Set(employees.map(e => e.dept).filter(Boolean))).sort()];
  const filtered = employees
    .filter(e => deptFilter === 'All' || e.dept === deptFilter || e.subject === deptFilter)
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || (e.dept || '').toLowerCase().includes(search.toLowerCase()));

  const totalGross = employees.reduce((a, e) => a + (e.gross || 0), 0);
  const totalDeductions = employees.reduce((a, e) => a + (e.totalDeductions || 0), 0);
  const totalNet = employees.reduce((a, e) => a + (e.net || 0), 0);
  const avgAtt = employees.length > 0 ? Math.round(employees.reduce((a, e) => a + (e.attPct || 0), 0) / employees.length) : 0;

  const handleMonthChange = (dir) => {
    const nm = dir === 'prev' ? prevMonth(month) : nextMonth(month);
    setMonth(nm);
  };

  const openDetail = (emp) => setDetail(emp);
  const closeDetail = () => { setDetail(null); fetchEmployees(month); };

  if (detail) {
    return (
      <EmployeeDetail
        employee={detail}
        month={month}
        currentUser={currentUser}
        onBack={closeDetail}
      />
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.pageHeader}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Payroll & Attendance</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Admin · {fmtMonthLabel(month)}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => handleMonthChange('prev')} style={st.monthBtn}>
            <Text style={{ color: C.white, fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 16, minWidth: 130, textAlign: 'center' }}>{fmtMonthLabel(month)}</Text>
          <TouchableOpacity onPress={() => handleMonthChange('next')} style={[st.monthBtn, month >= currentMonth() && { opacity: 0.3 }]} disabled={month >= currentMonth()}>
            <Text style={{ color: C.white, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient colors={[C.purple + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>{fmtMonthLabel(month)} — Payroll Summary</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[[INR(totalGross), 'Gross Payroll', C.white], [INR(totalDeductions), 'Deductions', C.coral], [INR(totalNet), 'Net Payroll', '#34D399']].map(([v, l, c]) => (
              <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.navy + '88', borderRadius: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 12, color: c }}>{v}</Text>
                <Text style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{l}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['Staff', employees.length, C.purple], ['Depts', depts.length - 1, C.teal], ['Avg Att.', avgAtt + '%', attColor(avgAtt)]].map(([l, v, c]) => (
              <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: C.navy + '88', borderRadius: 10 }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: c }}>{v}</Text>
                <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 4 }}>
            {depts.map(d => (
              <TouchableOpacity key={d} onPress={() => setDeptFilter(d)}
                style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: deptFilter === d ? C.purple : C.navyMid }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: deptFilter === d ? C.white : C.muted }}>{d || 'General'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ position: 'relative', marginBottom: 14 }}>
          <View style={{ position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 }}>
            <Icon name="search" size={15} color={C.muted} />
          </View>
          <TextInput style={[st.inputField, { paddingLeft: 36 }]} placeholder="Search employee…"
            placeholderTextColor={C.muted} value={search} onChangeText={setSearch} />
        </View>

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={C.purple} size="large" />
            <Text style={{ color: C.muted, marginTop: 12 }}>Loading payroll data…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>No employees found</Text>
          </View>
        ) : filtered.map(e => (
          <TouchableOpacity key={e.roleId} onPress={() => openDetail(e)}
            style={[st.card, { borderLeftWidth: 3, borderLeftColor: attColor(e.attPct), marginBottom: 10, borderRadius: 16, padding: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <LinearGradient colors={[C.purple + '88', C.purple + '44']} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: C.white }}>
                  {e.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>{e.name}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{e.role}{e.dept ? ' · ' + e.dept : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {e.salary?.basicSalary > 0 ? (
                  <>
                    <Text style={{ fontWeight: '800', fontSize: 16, color: '#34D399' }}>{INR(e.net)}</Text>
                    <Text style={{ fontSize: 10, color: C.muted }}>net / month</Text>
                  </>
                ) : (
                  <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.gold + '22' }}>
                    <Text style={{ fontSize: 10, color: C.gold }}>Set Salary</Text>
                  </View>
                )}
              </View>
            </View>
            {e.salary?.basicSalary > 0 ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={[st.progressTrack, { flex: 1, height: 5 }]}>
                  <View style={[st.progressFill, { width: e.attPct + '%', backgroundColor: attColor(e.attPct) }]} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: attColor(e.attPct) }}>{e.attPct}%</Text>
                {e.lopDays > 0 && (
                  <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20, backgroundColor: C.coral + '22' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: C.coral }}>{e.lopDays} LOP</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: C.muted }}>Tap to configure salary and track attendance</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function EmployeeDetail({ employee, month, currentUser, onBack }) {
  const [attDays, setAttDays] = useState([]);
  const [attLoading, setAttLoading] = useState(true);
  const [salary, setSalary] = useState({ basicSalary: 0, hra: 0, ta: 0, da: 0, pf: 0, tax: 0, lopRate: 0 });
  const [salaryEdit, setSalaryEdit] = useState(false);
  const [salaryForm, setSalaryForm] = useState({});
  const [savingsal, setSavingsal] = useState(false);
  const [salSaved, setSalSaved] = useState(false);
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('Present');
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [todayDuty, setTodayDuty] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [summary, setSummary] = useState(null);

  const fetchAtt = useCallback(async () => {
    setAttLoading(true);
    try {
      const r = await apiFetch(`/payroll/attendance?roleId=${encodeURIComponent(employee.roleId)}&month=${month}`);
      const data = await r.json();
      setAttDays(data.days || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAttLoading(false);
    }
  }, [employee.roleId, month]);

  const fetchTodayDuty = useCallback(async () => {
    try {
      const r = await apiFetch(`/duty/status?roleId=${encodeURIComponent(employee.roleId)}`);
      const data = await r.json();
      setTodayDuty(data);
    } catch (e) {}
  }, [employee.roleId]);

  useEffect(() => {
    fetchAtt();
    fetchTodayDuty();
    setSalary(employee.salary || {});
    setSalaryForm(employee.salary || {});
  }, [employee.roleId, month]);

  useEffect(() => {
    if (attDays.length === 0) return;
    const fullDays = attDays.filter(d => d.status === 'Present').length;
    const halfDays = attDays.filter(d => d.status === 'Half Day').length;
    const shortDays = attDays.filter(d => d.status === 'Short Day').length;
    const absentDays = attDays.filter(d => d.status === 'Absent').length;
    const lopDays = absentDays;
    const totalH = attDays.reduce((a, d) => a + (d.hoursWorked || 0), 0);
    const totalWD = attDays.length;
    const attPct = totalWD > 0 ? Math.round(((fullDays + halfDays * 0.5 + shortDays * 0.5) / totalWD) * 100) : 0;
    const s = salary;
    const gross = (s.basicSalary || 0) + (s.hra || 0) + (s.ta || 0) + (s.da || 0);
    const lopDeduction = lopDays * (s.lopRate || 0);
    const totalDeductions = (s.pf || 0) + (s.tax || 0) + lopDeduction;
    const net = Math.max(0, gross - totalDeductions);
    setSummary({ fullDays, halfDays, shortDays, absentDays, lopDays, totalH, attPct, gross, totalDeductions, net, lopDeduction, totalWD });
  }, [attDays, salary]);

  const saveSalary = async () => {
    setSavingsal(true);
    try {
      const body = {
        roleId: employee.roleId,
        basicSalary: Number(salaryForm.basicSalary) || 0,
        hra: Number(salaryForm.hra) || 0,
        ta: Number(salaryForm.ta) || 0,
        da: Number(salaryForm.da) || 0,
        specialAllowance: Number(salaryForm.specialAllowance) || 0,
        pf: Number(salaryForm.pf) || 0,
        tax: Number(salaryForm.tax) || 0,
        lopRate: Number(salaryForm.lopRate) || 0,
        bankAccount: salaryForm.bankAccount || '',
        ifsc: salaryForm.ifsc || '',
        designation: salaryForm.designation || '',
        dateOfJoining: salaryForm.dateOfJoining || '',
      };
      await apiFetch(`/payroll/salary`, { method: 'POST', body: JSON.stringify(body) });
      setSalary(body);
      setSalSaved(true);
      setSalaryEdit(false);
      setTimeout(() => setSalSaved(false), 2500);
      fetchAtt();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingsal(false);
    }
  };

  const saveOverride = async () => {
    if (!overrideModal) return;
    setSavingOverride(true);
    try {
      await apiFetch(`/payroll/attendance/override`, {
        method: 'POST',
        body: JSON.stringify({
          roleId: employee.roleId,
          date: overrideModal.date,
          status: overrideStatus,
          reason: overrideReason,
          overriddenBy: currentUser?.full_name || 'Admin',
        }),
      });
      setOverrideModal(null);
      setOverrideReason('');
      fetchAtt();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    const action = todayDuty?.onDuty ? 'out' : 'in';
    try {
      const r = await apiFetch(`/payroll/toggle`, {
        method: 'POST',
        body: JSON.stringify({ roleId: employee.roleId, employeeName: employee.name, role: employee.role, action }),
      });
      const data = await r.json();
      if (data.success) {
        await fetchTodayDuty();
        await fetchAtt();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(false);
    }
  };

  const sf = salaryForm;
  const sfGross = (Number(sf.basicSalary) || 0) + (Number(sf.hra) || 0) + (Number(sf.ta) || 0) + (Number(sf.da) || 0) + (Number(sf.specialAllowance) || 0);
  const sfDeductions = (Number(sf.pf) || 0) + (Number(sf.tax) || 0);
  const sfNet = Math.max(0, sfGross - sfDeductions);

  const markCredited = async () => {
    if (!summary || summary.net <= 0) return;
    try {
      const r = await apiFetch(`/payroll/mark-credited`, {
        method: 'POST',
        body: JSON.stringify({
          roleId: employee.roleId,
          month,
          adminName: 'Admin',
          net: summary.net,
          gross: summary.gross,
        }),
      });
      const data = await r.json();
      if (data.success) {
        setSalSaved(true);
        setTimeout(() => setSalSaved(false), 3000);
      }
    } catch (e) { console.error(e); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const isCurrentMonth = month === currentMonth();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.pageHeader}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Employee Profile</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{employee.roleId}</Text>
        </View>
        {salSaved && (
          <View style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99, backgroundColor: '#34D39922' }}>
            <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '700' }}>✓ Saved</Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <LinearGradient colors={[C.purple + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderWidth: 1, borderColor: C.purple + '44', borderRadius: 22, padding: 20, marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <LinearGradient colors={[C.purple, C.purple + '88']} style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 20, color: C.white }}>
                {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 17, color: C.white }}>{employee.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{employee.role}{employee.dept ? ' · ' + employee.dept : ''}</Text>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{employee.roleId}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', fontSize: 22, color: summary?.net > 0 ? '#34D399' : C.muted }}>{INR(summary?.net || 0)}</Text>
              <Text style={{ fontSize: 10, color: C.muted }}>Net / Month</Text>
            </View>
          </View>

          {summary && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              {[[INR(summary.gross), 'Gross', C.white], [INR(summary.totalDeductions), 'Deductions', C.coral], [INR(summary.net), 'Net', '#34D399']].map(([v, l, c]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: C.navy + '88', borderRadius: 10 }}>
                  <Text style={{ fontWeight: '800', fontSize: 12, color: c }}>{v}</Text>
                  <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{l}</Text>
                </View>
              ))}
            </View>
          )}

          {summary && (
            <View style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.navy + '88', borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Attendance — {fmtMonthLabel(month)}</Text>
              <View style={[st.progressTrack, { height: 5, marginBottom: 8 }]}>
                <View style={[st.progressFill, { width: summary.attPct + '%', backgroundColor: attColor(summary.attPct) }]} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {[['✅', summary.fullDays, 'Full', '#34D399'], ['🟡', summary.halfDays, 'Half', C.gold],
                  ['🟠', summary.shortDays, 'Short', '#FB923C'], ['❌', summary.absentDays, 'Absent', C.coral]].map(([ic, v, l, c]) => (
                    <Text key={l} style={{ fontSize: 11, color: C.muted }}>{ic} <Text style={{ fontWeight: '700', color: c }}>{v}</Text> {l}</Text>
                  ))}
                <Text style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>
                  <Text style={{ fontWeight: '700', color: attColor(summary.attPct) }}>{summary.attPct}%</Text>
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {isCurrentMonth && (
          <View style={[st.card, { marginBottom: 16, borderRadius: 16, padding: 16 }]}>
            <Text style={{ fontWeight: '600', fontSize: 13, color: C.white, marginBottom: 12 }}>Today's Duty Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: C.muted }}>
                  {todayDuty?.onDuty ? `On duty since ${todayDuty.clockIn}` : todayDuty?.clockOut ? `Clocked out at ${todayDuty.clockOut} · ${fmtHours(todayDuty.hoursWorked)} active` : 'Not checked in today'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleToggle} disabled={toggling}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 30,
                  backgroundColor: todayDuty?.onDuty ? C.coral + '22' : '#34D39922', borderWidth: 1,
                  borderColor: todayDuty?.onDuty ? C.coral + '66' : '#34D39966' }}>
                {toggling ? <ActivityIndicator size="small" color={todayDuty?.onDuty ? C.coral : '#34D399'} /> : (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: todayDuty?.onDuty ? '#34D399' : C.coral }} />
                )}
                <Text style={{ fontWeight: '700', fontSize: 13, color: todayDuty?.onDuty ? C.coral : '#34D399' }}>
                  {todayDuty?.onDuty ? 'Clock Out' : 'Clock In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[st.card, { marginBottom: 16, borderRadius: 16, padding: 0, overflow: 'hidden' }]}>
          <TouchableOpacity onPress={() => { setSalaryEdit(!salaryEdit); setSalaryForm(salary); }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.gold + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>💰</Text>
            </View>
            <Text style={{ flex: 1, fontWeight: '600', fontSize: 14, color: C.white }}>Salary Settings</Text>
            {salary.basicSalary > 0 && <Text style={{ fontSize: 12, color: C.gold }}>{INR(salary.basicSalary)} basic</Text>}
            <Text style={{ color: C.muted, fontSize: 16 }}>{salaryEdit ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {salaryEdit && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={{ color: C.teal, fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8 }}>Employee Details</Text>
              {[['designation', 'Designation / Role'], ['dateOfJoining', 'Date of Joining (DD-MM-YYYY)'], ['bankAccount', 'Bank Account Number'], ['ifsc', 'IFSC Code']].map(([k, label]) => (
                <View key={k} style={{ marginBottom: 10 }}>
                  <Text style={st.label}>{label}</Text>
                  <TextInput style={st.inputField} placeholderTextColor={C.muted}
                    placeholder={k === 'dateOfJoining' ? 'e.g. 01-06-2022' : ''} value={String(salaryForm[k] || '')}
                    onChangeText={v => setSalaryForm(p => ({ ...p, [k]: v }))} />
                </View>
              ))}
              <Text style={{ color: C.gold, fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>Earnings</Text>
              {[['basicSalary', 'Basic Salary (₹)'], ['hra', 'HRA (₹)'], ['ta', 'TA (₹)'], ['da', 'DA (₹)'], ['specialAllowance', 'Special Allowance (₹)']].map(([k, label]) => (
                <View key={k} style={{ marginBottom: 10 }}>
                  <Text style={st.label}>{label}</Text>
                  <TextInput style={st.inputField} keyboardType="numeric" placeholderTextColor={C.muted}
                    placeholder="0" value={String(salaryForm[k] || '')}
                    onChangeText={v => setSalaryForm(p => ({ ...p, [k]: v }))} />
                </View>
              ))}
              <Text style={{ color: C.coral, fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>Deductions</Text>
              {[['pf', 'Provident Fund PF (₹/month)'], ['tax', 'Tax / TDS (₹/month)'], ['lopRate', 'LOP Rate (₹/absent day)']].map(([k, label]) => (
                <View key={k} style={{ marginBottom: 10 }}>
                  <Text style={st.label}>{label}</Text>
                  <TextInput style={st.inputField} keyboardType="numeric" placeholderTextColor={C.muted}
                    placeholder="0" value={String(salaryForm[k] || '')}
                    onChangeText={v => setSalaryForm(p => ({ ...p, [k]: v }))} />
                </View>
              ))}
              <View style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: C.navyMid, borderRadius: 12, marginBottom: 14 }}>
                {[['Gross', INR(sfGross), '#34D399'], ['Fixed Deductions', '–' + INR(sfDeductions), C.coral], ['Est. Net', INR(sfNet), '#34D399']].map(([l, v, c]) => (
                  <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <Text style={{ fontSize: 13, color: C.muted }}>{l}</Text>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: c }}>{v}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setSalaryEdit(false)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
                  <Text style={{ color: C.muted, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveSalary} disabled={savingsal}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.gold, alignItems: 'center' }}>
                  {savingsal ? <ActivityIndicator size="small" color={C.white} /> : <Text style={{ fontWeight: '800', color: C.navy }}>Save Settings</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {summary && summary.gross > 0 && (
          <View style={[st.card, { marginBottom: 16, borderRadius: 16 }]}>
            <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 14 }}>Salary Breakdown — {fmtMonthLabel(month)}</Text>
            {[
              ['Working Days in Month', summary.totalWD, C.white],
              ['Full Days Present', summary.fullDays, '#34D399'],
              ['Half Days', summary.halfDays, C.gold],
              ['Short Days', summary.shortDays, '#FB923C'],
              ['Absent / LOP Days', summary.lopDays, C.coral],
            ].map(([l, v, c]) => (
              <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontSize: 13, color: C.muted }}>{l}</Text>
                <Text style={{ fontWeight: '700', fontSize: 13, color: c }}>{v}</Text>
              </View>
            ))}
            <View style={{ marginTop: 12 }}>
              {[
                ['Gross Salary', INR(summary.gross), C.white],
                ['PF Deduction', '–' + INR(salary.pf || 0), C.coral],
                ['Tax / TDS', '–' + INR(salary.tax || 0), C.coral],
                ['LOP Deduction (' + summary.lopDays + ' days)', '–' + INR(summary.lopDeduction || 0), C.coral],
                ['Net Payable', INR(summary.net), '#34D399'],
              ].map(([l, v, c]) => (
                <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
                  <Text style={{ fontSize: 13, color: C.muted }}>{l}</Text>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: c }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {summary && summary.gross > 0 && (
          <TouchableOpacity onPress={markCredited}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: C.teal, marginBottom: 16 }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: C.white }}>💰 Mark Salary Credited — {fmtMonthLabel(month)}</Text>
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Monthly Attendance</Text>
          <Text style={{ fontSize: 12, color: C.muted }}>{fmtMonthLabel(month)}</Text>
        </View>

        {attLoading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={C.teal} />
          </View>
        ) : attDays.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ color: C.muted }}>No attendance records found</Text>
          </View>
        ) : attDays.map((day, i) => {
          const sc = STATUS_COLORS[day.status] || C.muted;
          const ic = STATUS_ICONS[day.status] || '–';
          const isToday = day.date === today;
          return (
            <View key={day.date} style={[st.card, { marginBottom: 8, borderRadius: 14, padding: 12,
              borderLeftWidth: 3, borderLeftColor: sc, borderColor: isToday ? C.teal + '44' : C.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{ic}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>
                      {fmtDate(day.date)}{isToday ? ' (Today)' : ''}
                    </Text>
                    {day.override && <View style={{ paddingVertical: 1, paddingHorizontal: 6, backgroundColor: C.gold + '22', borderRadius: 6 }}>
                      <Text style={{ fontSize: 9, color: C.gold }}>Overridden</Text>
                    </View>}
                  </View>
                  <Text style={{ fontSize: 11, color: sc, marginTop: 2 }}>
                    {day.status}
                    {day.hoursWorked > 0 ? ' · ' + fmtHours(day.hoursWorked) + ' active' : ''}
                    {day.clockIn ? ' · In: ' + day.clockIn : ''}
                    {day.clockOut ? ' · Out: ' + day.clockOut : ''}
                  </Text>
                  {day.override?.reason ? <Text style={{ fontSize: 10, color: C.gold, marginTop: 2 }}>Reason: {day.override.reason}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => { setOverrideModal(day); setOverrideStatus(day.status); setOverrideReason(day.override?.reason || ''); }}
                  style={{ padding: 6, borderRadius: 8, backgroundColor: C.navyMid }}>
                  <Text style={{ fontSize: 12, color: C.muted }}>✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      <Modal visible={!!overrideModal} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { padding: 20 }]}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: C.white, marginBottom: 4 }}>Override Attendance</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{overrideModal ? fmtDate(overrideModal.date) : ''}</Text>
            <Text style={[st.label, { marginBottom: 10 }]}>Set Status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['Present', 'Half Day', 'Short Day', 'Absent'].map(s => (
                <TouchableOpacity key={s} onPress={() => setOverrideStatus(s)}
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                    backgroundColor: overrideStatus === s ? STATUS_COLORS[s] + '33' : C.navyMid,
                    borderWidth: 1, borderColor: overrideStatus === s ? STATUS_COLORS[s] : C.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: overrideStatus === s ? STATUS_COLORS[s] : C.muted }}>
                    {STATUS_ICONS[s]} {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={st.label}>Reason (required)</Text>
            <TextInput style={[st.inputField, { marginBottom: 16 }]} placeholder="e.g. Official duty, holiday…"
              placeholderTextColor={C.muted} value={overrideReason} onChangeText={setOverrideReason} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setOverrideModal(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
                <Text style={{ color: C.muted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveOverride} disabled={savingOverride || !overrideReason.trim()}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.teal, alignItems: 'center', opacity: !overrideReason.trim() ? 0.5 : 1 }}>
                {savingOverride ? <ActivityIndicator size="small" color={C.white} /> : <Text style={{ fontWeight: '800', color: C.white }}>Save Override</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  monthBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20 },
  progressTrack: { backgroundColor: C.border, borderRadius: 99, height: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  label: { fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 8 },
  inputField: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: C.navyMid, borderRadius: 20, width: '100%', borderWidth: 1, borderColor: C.border },
});

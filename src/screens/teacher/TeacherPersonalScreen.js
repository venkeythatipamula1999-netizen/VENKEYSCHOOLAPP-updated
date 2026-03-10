import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Modal, Linking, StyleSheet,
} from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';
import { getFriendlyError } from '../../utils/errorMessages';

const INR = v => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const CAL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_COLORS = { Present: '#34D399', 'Half Day': C.gold, 'Short Day': '#FB923C', Absent: C.coral };
const STATUS_ICONS = { Present: '✅', 'Half Day': '🟡', 'Short Day': '🟠', Absent: '❌' };
const LEAVE_TYPES = [
  { id: 'casual', label: 'Casual Leave', icon: '🏠', color: C.purple },
  { id: 'sick', label: 'Sick Leave', icon: '🏥', color: C.coral },
  { id: 'earned', label: 'Earned Leave', icon: '🌴', color: C.teal },
  { id: 'emergency', label: 'Emergency', icon: '🚨', color: '#FB923C' },
];
const LEAVE_REASONS = [
  { id: 'personal', label: 'Personal Work', icon: '🏠' },
  { id: 'sick', label: 'Sick / Unwell', icon: '🤒' },
  { id: 'family', label: 'Family Emergency', icon: '👨‍👩‍👧' },
  { id: 'marriage', label: 'Marriage / Function', icon: '💍' },
  { id: 'bereavement', label: 'Bereavement', icon: '🕊️' },
  { id: 'medical', label: 'Medical Appointment', icon: '🏥' },
  { id: 'travel', label: 'Travel / Outstation', icon: '✈️' },
  { id: 'other', label: 'Other Reason', icon: '📝' },
];

function fmtMonthLabel(m) {
  if (!m) return '';
  const [y, mo] = m.split('-').map(Number);
  return `${FULL_MONTHS[mo - 1]} ${y}`;
}
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}
function fmtHours(h) {
  if (!h || h <= 0) return '';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}
function currentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
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

function LeaveCalendar({ selected, onToggle }) {
  const now = new Date();
  const [yr, setYr] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth());
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity onPress={() => mo === 0 ? (setYr(y => y - 1), setMo(11)) : setMo(m => m - 1)}
          style={{ backgroundColor: C.navyMid, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.white, fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>{CAL_MONTHS[mo]} {yr}</Text>
        <TouchableOpacity onPress={() => mo === 11 ? (setYr(y => y + 1), setMo(0)) : setMo(m => m + 1)}
          style={{ backgroundColor: C.navyMid, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.white, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: C.muted }}>{d}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={{ width: '14.28%', aspectRatio: 1 }} />;
          const key = `${yr}-${String(mo + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isSun = new Date(yr, mo, day).getDay() === 0;
          const thisDate = new Date(yr, mo, day); thisDate.setHours(0, 0, 0, 0);
          const isPast = thisDate < today;
          const isToday = thisDate.getTime() === today.getTime();
          const isSel = selected.includes(key);
          return (
            <TouchableOpacity key={i} onPress={() => !isPast && !isSun && onToggle(key)}
              style={{ width: '14.28%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSel ? C.purple : isToday ? C.teal + '22' : 'transparent',
                borderWidth: isToday && !isSel ? 1 : 0, borderColor: C.teal }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: isSel ? C.white : isSun ? C.coral + '77' : isPast ? C.border : isToday ? C.teal : C.white }}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TeacherPersonalScreen({ onBack, currentUser }) {
  const [tab, setTab] = useState('leave');
  const staffId = currentUser?.role_id || currentUser?.roleId || '';

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>My Leave & Salary</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{currentUser?.full_name || currentUser?.name || staffId}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: C.navyMid, borderRadius: 12, padding: 4, gap: 4 }}>
          {[['leave', '📅 My Leave'], ['salary', '💰 My Salary']].map(([k, l]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: tab === k ? C.purple : 'transparent', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: tab === k ? C.white : C.muted }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === 'leave' ? <LeaveTab staffId={staffId} currentUser={currentUser} /> : <SalaryTab staffId={staffId} currentUser={currentUser} />}
    </View>
  );
}

function LeaveTab({ staffId, currentUser }) {
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState({ casual: 12, sick: 12, earned: 6 });
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [reason, setReason] = useState(null);
  const [custom, setCustom] = useState('');
  const [dates, setDates] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const lscCol = s => ({ Approved: '#34D399', Rejected: C.coral, Pending: C.gold })[s] || C.muted;
  const fmtD = k => { const parts = k.split('-'); return `${parts[2]} ${CAL_MONTHS[+parts[1]-1]}`; };
  const toggle = k => setDates(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k].sort());

  const totalTaken = history.filter(l => l.status === 'Approved').reduce((s, l) => s + (l.days || 0), 0);

  useEffect(() => {
    if (!staffId) { setLoading(false); return; }
    Promise.all([
      apiFetch(`/leave-requests/mine?staffId=${encodeURIComponent(staffId)}`).then(r => r.json()),
      apiFetch(`/leave-balance?roleId=${encodeURIComponent(staffId)}`).then(r => r.json()),
    ]).then(([hist, bal]) => {
      setHistory(hist.requests || []);
      if (bal.balance) setBalance(bal.balance);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [staffId]);

  const submitLeave = async () => {
    if (!reason || dates.length === 0 || !staffId) return;
    setSubmitting(true); setSubmitError('');
    try {
      const res = await apiFetch('/leave-request/submit', {
        method: 'POST',
        body: JSON.stringify({
          staffId,
          staffName: currentUser?.full_name || currentUser?.name || staffId,
          role: currentUser?.role || 'teacher',
          dept: currentUser?.dept || currentUser?.subject || '',
          reasonId: reason.id, reasonLabel: reason.label, reasonIcon: reason.icon,
          customReason: reason.id === 'other' ? custom : '',
          dates, leaveType: leaveType.id,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to submit');
      setSubmitDone(true);
      const newEntry = { id: data.id, reasonLabel: reason.label, icon: reason.icon, dates, from: dates[0], to: dates[dates.length - 1], days: dates.length, leaveType: leaveType.id, status: 'Pending', submittedAt: new Date().toISOString() };
      setHistory(p => [newEntry, ...p]);
      setTimeout(() => { setSubmitDone(false); setReason(null); setDates([]); setCustom(''); setShowApplyForm(false); }, 2500);
    } catch (err) {
      setSubmitError(getFriendlyError(err, 'Failed to submit. Try again.'));
      setTimeout(() => setSubmitError(''), 4000);
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading leave data..." />;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
      <LinearGradient colors={[C.purple + '22', C.navyMid]} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>Leave Balance — Current Year</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[['Casual', balance.casual, C.purple], ['Sick', balance.sick, C.coral], ['Earned', balance.earned, C.teal], ['Total Taken', totalTaken, C.gold]].map(([l, v, c]) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.navy + '88', borderRadius: 12 }}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: c }}>{v}</Text>
              <Text style={{ fontSize: 9, color: C.muted, marginTop: 3, textAlign: 'center' }}>{l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <TouchableOpacity onPress={() => setShowApplyForm(p => !p)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, backgroundColor: showApplyForm ? C.navyMid : C.purple, borderWidth: 1, borderColor: showApplyForm ? C.border : C.purple, marginBottom: 16 }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: showApplyForm ? C.muted : C.white }}>{showApplyForm ? '✕ Close Form' : '+ Apply for Leave'}</Text>
      </TouchableOpacity>

      {showApplyForm && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 14 }}>Leave Application</Text>

          <Text style={st.label}>Leave Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {LEAVE_TYPES.map(lt => (
              <TouchableOpacity key={lt.id} onPress={() => setLeaveType(lt)}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1,
                  backgroundColor: leaveType.id === lt.id ? lt.color + '33' : C.navyMid,
                  borderColor: leaveType.id === lt.id ? lt.color : C.border }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: leaveType.id === lt.id ? lt.color : C.muted }}>
                  {lt.icon} {lt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={st.label}>Reason</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {LEAVE_REASONS.map(r => (
              <TouchableOpacity key={r.id} onPress={() => setReason(r)}
                style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1,
                  backgroundColor: reason?.id === r.id ? C.purple + '33' : C.navyMid,
                  borderColor: reason?.id === r.id ? C.purple : C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: reason?.id === r.id ? C.purple : C.muted }}>
                  {r.icon} {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {reason?.id === 'other' && (
            <TextInput value={custom} onChangeText={setCustom} placeholder="Describe your reason…"
              placeholderTextColor={C.muted} multiline
              style={{ minHeight: 60, backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, color: C.white, fontSize: 13, marginBottom: 12, textAlignVertical: 'top' }} />
          )}

          <Text style={[st.label, { marginBottom: 6 }]}>Select Dates ({dates.length} selected)</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Tap dates to select · Sundays excluded · Past dates locked</Text>
          <LeaveCalendar selected={dates} onToggle={toggle} />

          {dates.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {dates.map(d => (
                <TouchableOpacity key={d} onPress={() => toggle(d)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.purple + '22', borderWidth: 1, borderColor: C.purple + '44', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 12, color: C.purple, fontWeight: '600' }}>{fmtD(d)}</Text>
                  <Text style={{ color: C.coral, fontWeight: '800' }}>×</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setDates([])} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: C.coral + '22' }}>
                <Text style={{ fontSize: 11, color: C.coral, fontWeight: '700' }}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {submitError ? (
            <ErrorBanner message={submitError} onDismiss={() => setSubmitError('')} />
          ) : null}

          <TouchableOpacity onPress={submitLeave} disabled={submitting || submitDone || !reason || dates.length === 0}
            style={{ backgroundColor: submitDone ? '#34D399' : C.purple, borderRadius: 12, padding: 14, alignItems: 'center',
              opacity: (!reason || dates.length === 0 || submitting) && !submitDone ? 0.5 : 1 }}>
            {submitting ? <ActivityIndicator color={C.white} /> : (
              <Text style={{ fontWeight: '800', fontSize: 15, color: submitDone ? C.navy : C.white }}>
                {submitDone ? '✅ Leave Submitted!' : 'Submit Leave Application'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Leave History</Text>
        <Text style={{ fontSize: 12, color: C.muted }}>{history.length} applications</Text>
      </View>

      {history.length === 0 ? (
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>📅</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>No leave applications yet</Text>
        </View>
      ) : history.map((l, i) => (
        <View key={l.id || i} style={[st.card, { borderLeftWidth: 3, borderLeftColor: lscCol(l.status), marginBottom: 10, borderRadius: 14, padding: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Text style={{ fontSize: 22 }}>{l.icon || '📅'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: C.white }}>{l.reasonLabel || l.reasonId}</Text>
                <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: lscCol(l.status) + '22' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: lscCol(l.status) }}>{l.status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#FB923C', fontWeight: '600', marginBottom: 3 }}>
                {fmtDate(l.from)}{l.from !== l.to ? ` → ${fmtDate(l.to)}` : ''} · {l.days} day{l.days > 1 ? 's' : ''}
              </Text>
              {l.leaveType && <Text style={{ fontSize: 11, color: C.muted }}>{LEAVE_TYPES.find(t => t.id === l.leaveType)?.label || l.leaveType}</Text>}
              {l.status === 'Approved' && l.approvedBy && (
                <Text style={{ fontSize: 11, color: '#34D399', marginTop: 4 }}>✅ Approved by {l.approvedBy}{l.approvedAt ? ` · ${fmtDate(l.approvedAt.slice(0,10))}` : ''}</Text>
              )}
              {l.status === 'Rejected' && l.rejectionReason && (
                <Text style={{ fontSize: 11, color: C.coral, marginTop: 4 }}>❌ Reason: {l.rejectionReason}</Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function SalaryTab({ staffId, currentUser }) {
  const [salaryData, setSalaryData] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [yearData, setYearData] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [showYear, setShowYear] = useState(false);
  const [showAttList, setShowAttList] = useState(false);

  useEffect(() => {
    if (!staffId) { setLoadingMain(false); return; }
    apiFetch(`/payroll/my-salary?roleId=${encodeURIComponent(staffId)}`)
      .then(r => r.json())
      .then(data => setSalaryData(data))
      .catch(() => {})
      .finally(() => setLoadingMain(false));
  }, [staffId]);

  const fetchPayslip = useCallback(async (m) => {
    if (!staffId) return;
    setLoadingPayslip(true);
    try {
      const r = await apiFetch(`/payroll/my-payslip?roleId=${encodeURIComponent(staffId)}&month=${m}`);
      const data = await r.json();
      setPayslip(data);
    } catch (e) { console.error(e); } finally { setLoadingPayslip(false); }
  }, [staffId]);

  const fetchYear = useCallback(async () => {
    if (!staffId) return;
    try {
      const year = month.split('-')[0];
      const r = await apiFetch(`/payroll/my-year?roleId=${encodeURIComponent(staffId)}&year=${year}`);
      const data = await r.json();
      setYearData(data);
    } catch (e) { console.error(e); }
  }, [staffId, month]);

  useEffect(() => { fetchPayslip(month); }, [month]);

  const handleMonthNav = (dir) => setMonth(m => dir === 'prev' ? prevMonth(m) : nextMonth(m));

  const openPayslipPDF = () => {
    const url = `/api/payroll/payslip-html?roleId=${encodeURIComponent(staffId)}&month=${month}`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  const sal = salaryData?.salary || {};
  const user = salaryData?.user || {};
  const empName = user.full_name || user.name || currentUser?.full_name || currentUser?.name || staffId;
  const designation = sal.designation || user.role || '';
  const dept = user.dept || user.subject || '';
  const doj = sal.dateOfJoining || '';
  const gross = (sal.basicSalary || 0) + (sal.hra || 0) + (sal.ta || 0) + (sal.da || 0) + (sal.specialAllowance || 0);
  const bankMasked = sal.bankAccount ? ('••••' + sal.bankAccount.slice(-4)) : '—';

  if (loadingMain) return <LoadingSpinner fullScreen message="Loading salary data..." />;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
      <LinearGradient colors={[C.teal + '22', C.navyMid]} style={{ borderWidth: 1, borderColor: C.teal + '44', borderRadius: 22, padding: 18, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <LinearGradient colors={[C.teal, C.teal + '88']} style={{ width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 18 }}>{empName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: C.white }}>{empName}</Text>
            {designation ? <Text style={{ color: C.muted, fontSize: 12 }}>{designation}{dept ? ' · ' + dept : ''}</Text> : null}
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{staffId}{doj ? ' · DOJ ' + doj : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: '900', fontSize: 20, color: gross > 0 ? C.teal : C.muted }}>{INR(gross)}</Text>
            <Text style={{ fontSize: 10, color: C.muted }}>Monthly CTC</Text>
          </View>
        </View>

        {sal.basicSalary > 0 ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: C.navy + '88', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Bank A/C</Text>
              <Text style={{ fontWeight: '700', fontSize: 13, color: C.white }}>{bankMasked}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: C.navy + '88', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>IFSC</Text>
              <Text style={{ fontWeight: '700', fontSize: 13, color: C.white }}>{sal.ifsc || '—'}</Text>
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.gold + '11', borderRadius: 12, borderWidth: 1, borderColor: C.gold + '33' }}>
            <Text style={{ fontSize: 12, color: C.gold }}>💡 Salary details not yet configured by Admin. Contact HR.</Text>
          </View>
        )}
      </LinearGradient>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
        <TouchableOpacity onPress={() => handleMonthNav('prev')} style={st.navBtn}>
          <Text style={{ color: C.white, fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: C.white, fontWeight: '700', fontSize: 15, minWidth: 140, textAlign: 'center' }}>{fmtMonthLabel(month)}</Text>
        <TouchableOpacity onPress={() => handleMonthNav('next')} style={[st.navBtn, month >= currentMonth() && { opacity: 0.3 }]} disabled={month >= currentMonth()}>
          <Text style={{ color: C.white, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </View>

      {loadingPayslip ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator color={C.purple} />
          <Text style={{ color: C.muted, marginTop: 10 }}>Loading pay slip…</Text>
        </View>
      ) : payslip ? (
        <>
          <View style={[st.card, { marginBottom: 16, borderRadius: 18, padding: 0, overflow: 'hidden' }]}>
            <View style={{ backgroundColor: C.purple + '33', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontWeight: '800', fontSize: 15, color: C.white }}>{fmtMonthLabel(month)} — Pay Slip</Text>
                <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: payslip.status === 'Credited' ? '#34D39922' : C.gold + '22' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: payslip.status === 'Credited' ? '#34D399' : C.gold }}>
                    {payslip.status === 'Credited' ? '✅ Credited' : '🕐 Pending'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: C.muted }}>
                Ref: {payslip.refNo}
                {payslip.payment?.creditedAt ? ` · Credited: ${fmtDate(payslip.payment.creditedAt.slice(0,10))}` : ''}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                Working Days: {payslip.attendance?.workingDays} · Present: {payslip.attendance?.fullDays} full + {payslip.attendance?.halfDays} half + {payslip.attendance?.shortDays} short · LOP: {payslip.attendance?.absentDays} day{payslip.attendance?.absentDays !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <Text style={{ fontWeight: '700', fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Earnings</Text>
              {[
                ['Basic Salary', payslip.earnings?.basic],
                ['HRA', payslip.earnings?.hra],
                ['Travel Allowance (TA)', payslip.earnings?.ta],
                ['Dearness Allowance (DA)', payslip.earnings?.da],
                ...(payslip.earnings?.specialAllowance > 0 ? [['Special Allowance', payslip.earnings?.specialAllowance]] : []),
              ].filter(([,v]) => v > 0).map(([l, v]) => (
                <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, borderStyle: 'dashed' }}>
                  <Text style={{ fontSize: 13, color: C.white }}>{l}</Text>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: '#34D399' }}>{INR(v)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: C.white }}>Gross Earnings</Text>
                <Text style={{ fontWeight: '800', fontSize: 15, color: '#34D399' }}>{INR(payslip.earnings?.gross || 0)}</Text>
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <Text style={{ fontWeight: '700', fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Deductions</Text>
              {[
                ...(payslip.deductions?.pf > 0 ? [['Provident Fund (PF)', payslip.deductions.pf, '12% of basic']] : []),
                ...(payslip.deductions?.tax > 0 ? [['Professional Tax / TDS', payslip.deductions.tax, 'Per applicable slab']] : []),
                ...(payslip.deductions?.lopDeduction > 0 ? [['LOP Deduction', payslip.deductions.lopDeduction, `${payslip.deductions.lopDays} absent days × ${INR(payslip.deductions.lopRate)}`]] : []),
              ].map(([l, v, note]) => (
                <View key={l} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, borderStyle: 'dashed' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: C.white }}>{l}</Text>
                    <Text style={{ fontWeight: '600', fontSize: 13, color: C.coral }}>–{INR(v)}</Text>
                  </View>
                  {note ? <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{note}</Text> : null}
                </View>
              ))}
              {(payslip.deductions?.pf === 0 && payslip.deductions?.tax === 0 && payslip.deductions?.lopDeduction === 0) && (
                <View style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No deductions this month</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: C.white }}>Total Deductions</Text>
                <Text style={{ fontWeight: '800', fontSize: 15, color: C.coral }}>–{INR(payslip.deductions?.total || 0)}</Text>
              </View>
            </View>

            <View style={{ margin: 16, padding: 16, backgroundColor: '#34D39922', borderWidth: 1, borderColor: '#34D39955', borderRadius: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Net Take-Home Pay</Text>
                  <Text style={{ fontWeight: '900', fontSize: 26, color: '#34D399' }}>{INR(payslip.net || 0)}</Text>
                </View>
                <TouchableOpacity onPress={openPayslipPDF}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: C.purple, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: C.white, fontWeight: '700' }}>🖨️ Download</Text>
                  <Text style={{ fontSize: 10, color: C.white + 'aa', marginTop: 2 }}>PDF / Print</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={() => setShowAttList(p => !p)}
            style={[st.card, { marginBottom: 16, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={{ flex: 1, fontWeight: '600', fontSize: 14, color: C.white }}>📋 Monthly Attendance Breakdown</Text>
            <Text style={{ color: C.muted }}>{showAttList ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showAttList && payslip.days && (
            <View style={[st.card, { marginBottom: 16, borderRadius: 16, padding: 0, overflow: 'hidden' }]}>
              <View style={{ flexDirection: 'row', gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, flexWrap: 'wrap' }}>
                {[['✅ Full', payslip.attendance?.fullDays, '#34D399'],['🟡 Half', payslip.attendance?.halfDays, C.gold],['🟠 Short', payslip.attendance?.shortDays,'#FB923C'],['❌ Absent', payslip.attendance?.absentDays, C.coral]].map(([l,v,c])=>(
                  <Text key={l} style={{ fontSize: 12, color: C.muted }}>{l} <Text style={{ fontWeight: '700', color: c }}>{v}</Text></Text>
                ))}
                <Text style={{ fontSize: 12, color: C.muted }}>⏱ <Text style={{ fontWeight: '700', color: C.white }}>{fmtHours(payslip.attendance?.totalHours)}</Text> total</Text>
              </View>
              {payslip.days.map((day, i) => {
                const sc = STATUS_COLORS[day.status] || C.muted;
                const ic = STATUS_ICONS[day.status] || '–';
                return (
                  <View key={day.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: i < payslip.days.length - 1 ? 1 : 0, borderBottomColor: C.border + '55' }}>
                    <Text style={{ fontSize: 16, width: 26, textAlign: 'center' }}>{ic}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.white }}>{fmtDate(day.date)}</Text>
                      <Text style={{ fontSize: 11, color: sc, marginTop: 1 }}>
                        {day.status}
                        {day.hoursWorked > 0 ? ' · ' + fmtHours(day.hoursWorked) + ' active' : ''}
                        {day.clockIn ? ' · In: ' + day.clockIn : ''}
                        {day.clockOut ? ' · Out: ' + day.clockOut : ''}
                      </Text>
                    </View>
                    {day.override && <View style={{ paddingVertical: 2, paddingHorizontal: 6, backgroundColor: C.gold + '22', borderRadius: 6 }}>
                      <Text style={{ fontSize: 9, color: C.gold }}>Overridden</Text>
                    </View>}
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity onPress={() => { setShowYear(p => !p); if (!yearData) fetchYear(); }}
            style={[st.card, { marginBottom: 16, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={{ flex: 1, fontWeight: '600', fontSize: 14, color: C.white }}>📊 Year Summary — {month.split('-')[0]}</Text>
            <Text style={{ color: C.muted }}>{showYear ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showYear && yearData && (
            <View style={[st.card, { marginBottom: 16, borderRadius: 16, padding: 0, overflow: 'hidden' }]}>
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
                {['Month','Present','Absent','LOP Ded.','Net Pay','Status'].map(h => (
                  <Text key={h} style={{ flex: 1, fontSize: 10, fontWeight: '700', color: C.muted, textAlign: 'center' }}>{h}</Text>
                ))}
              </View>
              {yearData.summary?.map((row, i) => (
                <View key={row.month} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: i < 11 ? 1 : 0, borderBottomColor: C.border + '55', backgroundColor: row.month === month ? C.purple + '11' : 'transparent' }}>
                  <Text style={{ flex: 1, fontSize: 11, color: row.month === month ? C.purple : C.white, fontWeight: row.month === month ? '700' : '400', textAlign: 'center' }}>{CAL_MONTHS[parseInt(row.month.split('-')[1]) - 1]}</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: '#34D399', textAlign: 'center' }}>{row.fullDays + row.halfDays * 0.5 + row.shortDays * 0.5}</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: row.absentDays > 0 ? C.coral : C.muted, textAlign: 'center' }}>{row.absentDays}</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: row.totalDeductions > 0 ? C.coral : C.muted, textAlign: 'center' }}>{INR(row.totalDeductions)}</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: row.net > 0 ? '#34D399' : C.muted, fontWeight: '700', textAlign: 'center' }}>{INR(row.net)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: row.status === 'Credited' ? '#34D399' : row.status === 'Not Set' ? C.border : C.gold, textAlign: 'center' }}>{row.status}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16 },
  label: { fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 8 },
});

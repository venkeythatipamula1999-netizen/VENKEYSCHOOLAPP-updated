import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import LoadingSpinner from '../../components/LoadingSpinner';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { DRIVER_DEFAULT } from '../../data/driver';
import { apiFetch } from '../../api/client';

function getMonthStr(y, m) { return `${y}-${String(m).padStart(2, '0')}`; }
function currentMonthStr() { const n = new Date(); return getMonthStr(n.getFullYear(), n.getMonth() + 1); }
function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return getMonthStr(d.getFullYear(), d.getMonth() + 1);
}
function statusIcon(s) {
  if (s === 'Present') return '\u2705';
  if (s === 'Half Day') return '\uD83D\uDFE1';
  if (s === 'Short Day') return '\uD83D\uDFE0';
  return '\u274C';
}
function statusColor(s) {
  if (s === 'Present') return '#34D399';
  if (s === 'Half Day') return '#F5C842';
  if (s === 'Short Day') return '#FB923C';
  return '#F87171';
}
function fmtHours(h) {
  const n = parseFloat(h) || 0;
  const hrs = Math.floor(n);
  const mins = Math.round((n - hrs) * 60);
  if (hrs === 0 && mins === 0) return '\u2014';
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}min`;
}
function fmtCurrency(n) { return `\u20B9${Number(n || 0).toLocaleString('en-IN')}`; }
function maskAccount(acc) {
  if (!acc) return '\u2014';
  const s = String(acc);
  return '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ' + s.slice(-4);
}

function SalaryTab({ currentUser }) {
  const driverId = currentUser?.role_id || DRIVER_DEFAULT.id;
  const driverName = currentUser?.full_name || DRIVER_DEFAULT.name;
  const busNumber = currentUser?.bus_number || DRIVER_DEFAULT.bus.number;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(true);
  const [payslip, setPayslip] = useState(null);
  const [payslipLoading, setPayslipLoading] = useState(true);

  const loadSalaryInfo = useCallback(async () => {
    setSalaryLoading(true);
    try {
      const res = await apiFetch(`/payroll/my-salary?roleId=${encodeURIComponent(driverId)}`);
      const data = await res.json();
      setSalaryInfo(data);
    } catch (e) {
      console.error('Salary info error:', e.message);
    }
    setSalaryLoading(false);
  }, [driverId]);

  const loadPayslip = useCallback(async (month) => {
    setPayslipLoading(true);
    setPayslip(null);
    try {
      const res = await apiFetch(`/payroll/my-payslip?roleId=${encodeURIComponent(driverId)}&month=${month}`);
      const data = await res.json();
      setPayslip(data);
    } catch (e) {
      console.error('Payslip error:', e.message);
    }
    setPayslipLoading(false);
  }, [driverId]);

  useEffect(() => { loadSalaryInfo(); }, [loadSalaryInfo]);
  useEffect(() => { loadPayslip(selectedMonth); }, [selectedMonth, loadPayslip]);

  const salary = salaryInfo?.salary || {};
  const hasSalary = !!(salary.basicSalary);
  const isCurrent = selectedMonth === currentMonthStr();
  const initials = driverName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <LinearGradient colors={[C.teal, C.tealLt]} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: C.white }}>{initials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{driverName}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>School Bus Driver</Text>
          </View>
        </View>
        {[
          { label: 'Employee ID', val: driverId },
          { label: 'Bus Number', val: busNumber },
          { label: 'Monthly CTC', val: hasSalary ? fmtCurrency((salary.basicSalary || 0) + (salary.hra || 0) + (salary.ta || 0) + (salary.da || 0) + (salary.specialAllowance || 0)) : '\u2014' },
          { label: 'Joining Date', val: salary.joiningDate || currentUser?.joining_date || '\u2014' },
          { label: 'Bank A/C', val: maskAccount(salary.bankAccount) },
          { label: 'IFSC Code', val: salary.ifscCode || '\u2014' },
        ].map((row, i) => (
          <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>{row.label}</Text>
            <Text style={{ color: C.white, fontSize: 13, fontWeight: '600', textAlign: 'right', maxWidth: '60%' }}>{row.val}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14 }}>
        <TouchableOpacity
          onPress={() => setSelectedMonth(m => addMonths(m, -1))}
          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: C.white, fontSize: 18, lineHeight: 22 }}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{monthLabel(selectedMonth)}</Text>
        <TouchableOpacity
          onPress={() => setSelectedMonth(m => addMonths(m, 1))}
          disabled={isCurrent}
          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', opacity: isCurrent ? 0.35 : 1 }}
        >
          <Text style={{ color: C.white, fontSize: 18, lineHeight: 22 }}>{'\u203A'}</Text>
        </TouchableOpacity>
      </View>

      {salaryLoading ? (
        <LoadingSpinner message="Loading salary details..." />
      ) : !hasSalary ? (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 28, alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 26, marginBottom: 10 }}>{'\uD83D\uDCCB'}</Text>
          <Text style={{ color: C.white, fontWeight: '600', fontSize: 15, textAlign: 'center' }}>Salary details not set yet</Text>
          <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>Please contact Admin to set up your salary structure.</Text>
        </View>
      ) : payslipLoading ? (
        <LoadingSpinner message="" />
      ) : payslip ? (
        <>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{monthLabel(selectedMonth)} — Pay Slip</Text>
                {payslip.payment?.creditedDate && (
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Credited: {payslip.payment.creditedDate}</Text>
                )}
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Ref: {payslip.refNo}</Text>
              </View>
              <View style={{
                paddingVertical: 5, paddingHorizontal: 10, borderRadius: 50,
                backgroundColor: payslip.status === 'Credited' ? '#34D39922' : C.gold + '22',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: payslip.status === 'Credited' ? '#34D399' : C.gold }}>
                  {payslip.status === 'Credited' ? '\u2705 Credited' : '\uD83D\uDD50 Pending'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {[
                { label: 'Working Days', val: String(payslip.attendance?.workingDays || 0) },
                { label: 'Days Present', val: String(payslip.attendance?.fullDays || 0) },
                { label: 'LOP Days', val: String(payslip.attendance?.absentDays || 0) },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: C.navyMid, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: C.white }}>{s.val}</Text>
                  <Text style={{ color: C.muted, fontSize: 10, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, marginBottom: 10 }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: C.teal, marginBottom: 10, letterSpacing: 1 }}>EARNINGS</Text>
              {[
                { label: 'Basic Salary', val: payslip.earnings?.basic },
                { label: 'House Rent Allowance', val: payslip.earnings?.hra },
                { label: 'Dearness Allowance', val: payslip.earnings?.da },
                { label: 'Transport Allowance', val: payslip.earnings?.ta },
                { label: 'Special Allowance', val: payslip.earnings?.specialAllowance },
              ].map(r => (
                <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{r.label}</Text>
                  <Text style={{ color: C.white, fontSize: 13 }}>{fmtCurrency(r.val)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, marginTop: 2 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: C.teal }}>Gross Earnings</Text>
                <Text style={{ fontWeight: '800', fontSize: 14, color: C.teal }}>{fmtCurrency(payslip.earnings?.gross)}</Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, marginBottom: 10 }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: '#F87171', marginBottom: 10, letterSpacing: 1 }}>DEDUCTIONS</Text>
              {[
                { label: 'Provident Fund (12% of Basic)', val: payslip.deductions?.pf },
                { label: 'Professional Tax', val: payslip.deductions?.tax },
                { label: `LOP Deduction (${payslip.deductions?.lopDays || 0} days \xD7 ${fmtCurrency(payslip.deductions?.lopRate)})`, val: payslip.deductions?.lopDeduction },
              ].map(r => (
                <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text style={{ color: C.muted, fontSize: 13, flex: 1, paddingRight: 8 }}>{r.label}</Text>
                  <Text style={{ color: '#F87171', fontSize: 13 }}>- {fmtCurrency(r.val)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, marginTop: 2 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: '#F87171' }}>Total Deductions</Text>
                <Text style={{ fontWeight: '800', fontSize: 14, color: '#F87171' }}>- {fmtCurrency(payslip.deductions?.total)}</Text>
              </View>
            </View>

            <LinearGradient colors={['#34D39922', '#34D39908']} style={{ borderWidth: 1, borderColor: '#34D39944', borderRadius: 14, padding: 16, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#34D399' }}>NET PAYABLE</Text>
              <Text style={{ fontWeight: '900', fontSize: 22, color: '#34D399' }}>{fmtCurrency(payslip.net)}</Text>
            </LinearGradient>

            <TouchableOpacity
              style={{ marginTop: 14, backgroundColor: C.teal + '22', borderWidth: 1, borderColor: C.teal + '55', borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={() => Alert.alert('Coming Soon', 'PDF download coming soon.')}
            >
              <Text style={{ fontSize: 16 }}>{'\uD83D\uDCC4'}</Text>
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.teal }}>Download Pay Slip PDF</Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 14 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 2 }}>Monthly Attendance</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>{monthLabel(selectedMonth)}</Text>

            {(payslip.days || []).length === 0 ? (
              <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>No attendance records for this month.</Text>
            ) : (
              (payslip.days || []).map((d, i) => {
                const dt = new Date(d.date + 'T00:00:00');
                const dayNum = String(dt.getDate()).padStart(2, '0');
                const mon = dt.toLocaleDateString('en-IN', { month: 'short' });
                const dow = dt.toLocaleDateString('en-IN', { weekday: 'short' });
                const sc = statusColor(d.status);
                return (
                  <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border, gap: 10 }}>
                    <View style={{ width: 48 }}>
                      <Text style={{ color: C.white, fontSize: 13, fontWeight: '600' }}>{dayNum} {mon}</Text>
                      <Text style={{ color: C.muted, fontSize: 11 }}>{dow}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: sc, fontWeight: '600' }}>
                        {statusIcon(d.status)} {d.status}
                      </Text>
                    </View>
                    <Text style={{ color: C.muted, fontSize: 12, minWidth: 68, textAlign: 'right' }}>{fmtHours(d.hoursWorked)}</Text>
                  </View>
                );
              })
            )}

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
              {[
                { label: 'Full', val: payslip.attendance?.fullDays || 0, color: '#34D399' },
                { label: 'Half', val: payslip.attendance?.halfDays || 0, color: '#F5C842' },
                { label: 'Short', val: payslip.attendance?.shortDays || 0, color: '#FB923C' },
                { label: 'Absent', val: payslip.attendance?.absentDays || 0, color: '#F87171' },
                { label: 'Hrs', val: fmtHours(payslip.attendance?.totalHours || 0), color: C.teal },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: C.navyMid, borderRadius: 10, padding: 8, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 12, color: s.color }}>{s.val}</Text>
                  <Text style={{ color: C.muted, fontSize: 9, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function DriverProfile({ onBack, currentUser, onLogout }) {
  const driverName = currentUser?.full_name || DRIVER_DEFAULT.name;
  const driverId = currentUser?.role_id || DRIVER_DEFAULT.id;
  const initials = driverName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>My Profile</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Driver Information</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 4 }}>
        {[
          { key: 'profile', label: '\uD83D\uDC64 My Profile' },
          { key: 'salary', label: '\uD83D\uDCB0 My Salary' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
              backgroundColor: activeTab === tab.key ? C.teal : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 13, color: activeTab === tab.key ? C.white : C.muted }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'profile' ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <LinearGradient colors={[C.teal + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.teal + '44', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16 }}>
            <LinearGradient colors={[C.teal, C.tealLt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Text style={{ fontWeight: '800', fontSize: 28, color: C.white }}>{initials}</Text>
            </LinearGradient>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>{driverName}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>School Bus Driver</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.teal + '26' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.teal }}>{'\uD83D\uDE8C'} {currentUser?.bus_number || DRIVER_DEFAULT.bus.number}</Text>
              </View>
              <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: 'rgba(52,211,153,0.15)' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#34D399' }}>Active</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
            {[
              { label: 'Employee ID', value: driverId, icon: '\uD83E\uDEAA' },
              { label: 'Phone', value: currentUser?.mobile || currentUser?.phone || DRIVER_DEFAULT.phone, icon: '\uD83D\uDCF1' },
              { label: 'Blood Group', value: currentUser?.blood_group || '-', icon: '\uD83E\uDE78' },
              { label: 'Emergency Contact', value: currentUser?.emergency_contact || '-', icon: '\uD83D\uDCDE' },
              { label: 'License No.', value: currentUser?.license || DRIVER_DEFAULT.license, icon: '\uD83D\uDCC4' },
              { label: 'Experience', value: currentUser?.experience || DRIVER_DEFAULT.experience, icon: '\u23F3' },
              { label: 'Joined', value: currentUser?.joining_date || DRIVER_DEFAULT.joined, icon: '\uD83D\uDCC5' },
            ].map((item, i, arr) => (
              <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                <Text style={{ fontSize: 18, marginRight: 14 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 11, marginBottom: 2 }}>{item.label}</Text>
                  <Text style={{ color: C.white, fontSize: 14, fontWeight: '500' }}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 20 }}>
            <Text style={{ fontWeight: '600', fontSize: 14, marginBottom: 14, color: C.white }}>{'\uD83E\uDDF9'} Assigned Cleaner/Attender</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.gold + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '700', fontSize: 16, color: C.gold }}>{DRIVER_DEFAULT.cleaner.photo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{DRIVER_DEFAULT.cleaner.name}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{DRIVER_DEFAULT.cleaner.id}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{DRIVER_DEFAULT.cleaner.phone}</Text>
              </View>
              <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.teal + '26' }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.teal }}>{'\uD83D\uDE8C'} {currentUser?.bus_number || DRIVER_DEFAULT.bus.number}</Text>
              </View>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={() => setShowChangePwd(true)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 14 }}
            >
              <Icon name="lock" size={18} color={C.teal} />
              <Text style={{ fontWeight: '600', fontSize: 15, color: C.teal }}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onLogout}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.coral + '15', borderWidth: 1, borderColor: C.coral + '33', borderRadius: 16, paddingVertical: 14 }}
            >
              <Icon name="logout" size={18} color={C.coral} />
              <Text style={{ fontWeight: '600', fontSize: 15, color: C.coral }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <SalaryTab currentUser={currentUser} />
      )}

      <ChangePasswordModal
        visible={showChangePwd}
        onClose={() => setShowChangePwd(false)}
        email={currentUser?.email}
        uid={currentUser?.uid}
        onLogout={onLogout}
        accentColor={C.teal}
      />
    </ScrollView>
  );
}

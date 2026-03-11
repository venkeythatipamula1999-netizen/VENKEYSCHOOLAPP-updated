import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { apiFetch } from '../../api/client';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TeacherProfile({ onBack, currentUser, onLogout }) {
  const teacherName = currentUser?.full_name || 'Teacher';
  const teacherId = currentUser?.role_id || 'TCH-0000';
  const initials = teacherName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [payslips, setPayslips] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    if (activeTab !== 'salary') return;
    setSalaryLoading(true);
    const id = currentUser?.role_id || currentUser?.uid || '';
    apiFetch(`/payroll/my-year?staffId=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => setPayslips(data.payslips || data.records || []))
      .catch(() => {})
      .finally(() => setSalaryLoading(false));
  }, [activeTab]);

  const timetable = Array.isArray(currentUser?.timetable) ? currentUser.timetable : [];
  const assignedClasses = Array.isArray(currentUser?.assignedClasses) ? currentUser.assignedClasses : [];

  const daySlots = ALL_DAYS.reduce((acc, day) => {
    const slots = timetable.filter(e => Array.isArray(e.days) && e.days.includes(day))
      .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
    if (slots.length > 0) acc[day] = slots;
    return acc;
  }, {});
  const activeDays = ALL_DAYS.filter(d => daySlots[d]);

  function parseTime(t) {
    if (!t) return 0;
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return 0;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const p = (m[3] || '').toUpperCase();
    if (p === 'PM' && h !== 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>My Profile</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Teacher Information</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <LinearGradient colors={[C.purple + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.purple + '44', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16 }}>
          <LinearGradient colors={[C.purple, '#9B7AD8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Text style={{ fontWeight: '800', fontSize: 28, color: C.white }}>{initials}</Text>
          </LinearGradient>
          <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>{teacherName}</Text>
          <Text style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Teacher</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.purple + '26' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.purple }}>{teacherId}</Text>
            </View>
            {currentUser?.subject ? (
              <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.gold + '26' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.gold }}>{currentUser.subject}</Text>
              </View>
            ) : null}
            {currentUser?.classTeacherOf ? (
              <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: 'rgba(0,184,169,0.15)' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.teal }}>CT: {currentUser.classTeacherOf}</Text>
              </View>
            ) : null}
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: 'rgba(52,211,153,0.15)' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#34D399' }}>Active</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
          {['info', 'salary'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: activeTab === tab ? C.gold : C.navyMid }}
            >
              <Text style={{ fontWeight: '700', fontSize: 13, color: activeTab === tab ? C.navy : C.muted }}>
                {tab === 'info' ? '👤 Profile' : '💰 Salary'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'info' && (<>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
          {[
            { label: 'Employee ID', value: teacherId, icon: '\uD83E\uDEAA' },
            { label: 'Email', value: currentUser?.email || '-', icon: '\uD83D\uDCE7' },
            { label: 'Phone', value: currentUser?.mobile || currentUser?.phone || '-', icon: '\uD83D\uDCF1' },
            { label: 'Blood Group', value: currentUser?.blood_group || '-', icon: '\uD83E\uDE78' },
            { label: 'Emergency Contact', value: currentUser?.emergency_contact || '-', icon: '\uD83D\uDCDE' },
            { label: 'Subject', value: currentUser?.subject || '-', icon: '\uD83D\uDCDA' },
            { label: 'Date of Birth', value: currentUser?.date_of_birth || '-', icon: '\uD83C\uDF82' },
            { label: 'Joined', value: currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-', icon: '\uD83D\uDCC5' },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: 18, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 18 }}>{row.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.muted, fontSize: 11 }}>{row.label}</Text>
                <Text style={{ fontWeight: '600', fontSize: 14, marginTop: 2, color: C.white }}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {currentUser?.classTeacherOf ? (
          <View style={{ backgroundColor: 'rgba(0,184,169,0.1)', borderWidth: 1, borderColor: 'rgba(0,184,169,0.3)', borderRadius: 20, padding: 18, marginBottom: 14 }}>
            <Text style={{ color: C.teal, fontWeight: '700', fontSize: 14, marginBottom: 4 }}>{'\uD83C\uDFEB'} Class Teacher</Text>
            <Text style={{ color: C.white, fontSize: 16, fontWeight: '600' }}>Grade {currentUser.classTeacherOf}</Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: C.purple + '11', borderWidth: 1, borderColor: C.purple + '33', borderRadius: 20, padding: 18, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: C.purple, fontWeight: '700', fontSize: 14 }}>{'\uD83D\uDCC5'} Academic Schedule</Text>
            <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 50, backgroundColor: C.purple + '22' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.purple }}>{timetable.length} class{timetable.length !== 1 ? 'es' : ''}</Text>
            </View>
          </View>

          {timetable.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{'📚'}</Text>
              <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No classes assigned yet.{'\n'}Contact your admin to set up your timetable.</Text>
            </View>
          ) : activeDays.length > 0 ? (
            activeDays.map(day => (
              <View key={day} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.gold + '22' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: C.gold }}>{day}</Text>
                  </View>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                </View>
                {daySlots[day].map((slot, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: C.navy + '66', borderRadius: 10, marginBottom: 4, borderLeftWidth: 2, borderLeftColor: C.teal }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: C.white }}>Grade {slot.className}</Text>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{slot.subject}{slot.room ? ' · ' + slot.room : ''}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: C.gold, fontWeight: '600' }}>{slot.startTime} – {slot.endTime}</Text>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {assignedClasses.map(cls => (
                <View key={cls} style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 50, backgroundColor: C.purple + '22' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.purple }}>{cls}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={() => setShowChangePwd(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 14 }}
          >
            <Icon name="lock" size={18} color={C.purple} />
            <Text style={{ fontWeight: '600', fontSize: 15, color: C.purple }}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onLogout}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.coral + '15', borderWidth: 1, borderColor: C.coral + '33', borderRadius: 16, paddingVertical: 14 }}
          >
            <Icon name="logout" size={18} color={C.coral} />
            <Text style={{ fontWeight: '600', fontSize: 15, color: C.coral }}>Logout</Text>
          </TouchableOpacity>
        </View>
        </>)}

        {activeTab === 'salary' && (
          <View style={{ paddingBottom: 8 }}>
            {salaryLoading && (
              <ActivityIndicator color={C.gold} style={{ marginTop: 40 }} />
            )}
            {!salaryLoading && payslips.length === 0 && (
              <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>
                No payslip records found
              </Text>
            )}
            {payslips.map((p, i) => (
              <View key={i} style={{ backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: C.gold }}>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>
                  {p.month || p.period || `Record ${i + 1}`}
                </Text>
                <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                  Amount: ₹{Number(p.amount || p.netSalary || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={{ color: p.status === 'paid' ? '#34D399' : C.coral, fontSize: 12, marginTop: 4 }}>
                  {p.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ChangePasswordModal
        visible={showChangePwd}
        onClose={() => setShowChangePwd(false)}
        email={currentUser?.email}
        uid={currentUser?.uid}
        onLogout={onLogout}
        accentColor={C.purple}
      />
    </ScrollView>
  );
}

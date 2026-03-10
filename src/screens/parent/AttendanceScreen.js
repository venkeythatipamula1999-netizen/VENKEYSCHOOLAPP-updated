import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import DonutRing from '../../components/DonutRing';
import { apiFetch } from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';
import { getFriendlyError } from '../../utils/errorMessages';

function prevMonth(m) {
  const [y, mo] = m.split('-').map(Number);
  if (mo === 1) return `${y - 1}-12`;
  return `${y}-${String(mo - 1).padStart(2, '0')}`;
}
function nextMonth(m, today) {
  if (m >= today) return m;
  const [y, mo] = m.split('-').map(Number);
  if (mo === 12) return `${y + 1}-01`;
  return `${y}-${String(mo + 1).padStart(2, '0')}`;
}
function fmtMonthLabel(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function fmtDayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
}

const STATUS_COLOR = { Present: '#34D399', Absent: '#FF6B6B', Leave: '#F59E0B', 'Not Marked': '#8A9DBB' };
const STATUS_ICON = { Present: '✅', Absent: '❌', Leave: '📅', 'Not Marked': '–' };

export default function AttendanceScreen({ onBack, currentUser }) {
  const today = new Date();
  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(todayMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const studentId = currentUser?.studentId || '';
  const studentName = currentUser?.studentName || 'Student';
  const studentClass = currentUser?.studentClass || '';

  const canNext = month < todayMonth;

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setError('');
    setData(null);
    apiFetch(`/attendance/student-monthly?studentId=${encodeURIComponent(studentId)}&month=${month}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        else setError(d.error || 'Failed to load attendance');
      })
      .catch(e => setError(getFriendlyError(e, 'Failed to load attendance')))
      .finally(() => setLoading(false));
  }, [studentId, month]);

  const summary = data?.summary;
  const days = data?.days ?? [];
  const pct = summary?.pct ?? 0;
  const pctColor = pct >= 90 ? '#34D399' : pct >= 75 ? C.gold : C.coral;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Attendance</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{studentName}{studentClass ? ' · ' + studentClass : ''}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.navyMid, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
          <TouchableOpacity onPress={() => setMonth(prevMonth(month))} style={{ padding: 8, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}>
            <Icon name="back" size={16} color={C.white} />
          </TouchableOpacity>
          <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{fmtMonthLabel(month)}</Text>
          <TouchableOpacity onPress={() => canNext && setMonth(nextMonth(month, todayMonth))} style={{ padding: 8, borderRadius: 10, backgroundColor: canNext ? C.card : C.navyMid, borderWidth: 1, borderColor: canNext ? C.border : 'transparent', opacity: canNext ? 1 : 0.3 }}>
            <Icon name="arrow" size={16} color={C.white} />
          </TouchableOpacity>
        </View>

        {!studentId ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>{'👨‍🎓'}</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>Student profile not linked.{'\n'}Please contact the school admin.</Text>
          </View>
        ) : loading ? (
          <LoadingSpinner message="Loading attendance..." />
        ) : error ? (
          <ErrorBanner message={error} onRetry={() => { const cur = month; setMonth(''); setTimeout(() => setMonth(cur), 10); }} onDismiss={() => setError('')} />
        ) : (
          <>
            <View style={[st.heroCard, { borderColor: pctColor + '44' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <DonutRing pct={pct} color={pctColor} size={88} stroke={9} label={`${pct}%`} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Attendance Rate</Text>
                  <Text style={{ fontSize: 38, fontWeight: '900', color: pctColor }}>{pct}%</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{summary?.total ?? 0} working days</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { val: summary?.present ?? 0, lbl: 'Present', color: '#34D399' },
                  { val: summary?.absent ?? 0, lbl: 'Absent', color: C.coral },
                  { val: summary?.leave ?? 0, lbl: 'Leave', color: C.gold },
                ].map(s => (
                  <View key={s.lbl} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.navy + '88', borderRadius: 12 }}>
                    <Text style={{ fontWeight: '800', fontSize: 20, color: s.color }}>{s.val}</Text>
                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.lbl}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={st.card}>
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 14 }}>Daily Breakdown</Text>
              {days.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>{'📋'}</Text>
                  <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No attendance records found for this month.</Text>
                </View>
              ) : (
                days.map((d, i) => {
                  const col = STATUS_COLOR[d.status] || C.muted;
                  return (
                    <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < days.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col, marginRight: 12, flexShrink: 0 }} />
                      <Text style={{ flex: 1, fontSize: 13, color: C.white }}>{fmtDayLabel(d.date)}</Text>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: col + '22' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: col }}>{STATUS_ICON[d.status]} {d.status}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  heroCard: { borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 18, backgroundColor: C.navyMid },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 18 },
});

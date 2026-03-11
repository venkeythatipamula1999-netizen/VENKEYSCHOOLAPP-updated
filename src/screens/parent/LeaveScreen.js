import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';
import ErrorBanner from '../../components/ErrorBanner';
import { getFriendlyError } from '../../utils/errorMessages';

const REASONS = [
  { id: 'sick', icon: '🤒', label: 'Medical / Sick' },
  { id: 'family', icon: '👨‍👩‍👧', label: 'Family Function' },
  { id: 'travel', icon: '✈️', label: 'Travel' },
  { id: 'other', icon: '📝', label: 'Other' },
];

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysBetween(from, to) {
  if (!from || !to) return 1;
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function LeaveScreen({ onBack, currentUser }) {
  const [reason, setReason] = useState('');
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [pastLeaves, setPastLeaves] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const studentId = currentUser?.studentId || '';
  const studentName = currentUser?.studentName || 'Student';
  const studentClass = currentUser?.studentClass || '';
  const rollNumber = currentUser?.rollNumber || '';

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    if (!studentId) return;
    setLoadingHistory(true);
    apiFetch(`/leave-requests/students?studentId=${encodeURIComponent(studentId)}`)
      .then(r => r.json())
      .then(d => {
        const leaves = d.requests || d.leaves || [];
        setPastLeaves(leaves.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [studentId, refreshKey]);

  const handleSubmit = async () => {
    if (!reason) { setSubmitError('Please select a reason.'); return; }
    if (!fromDate || !toDate) { setSubmitError('Please select from and to dates.'); return; }
    if (!studentId) { setSubmitError('Student profile not linked.'); return; }
    setSubmitError('');
    setSubmitting(true);

    const selectedReason = REASONS.find(r => r.id === reason);
    const days = daysBetween(fromDate, toDate);
    const dates = [];
    const cur = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const payload = {
      studentId,
      studentName,
      rollNumber,
      studentClass,
      parentName: currentUser?.parentName || currentUser?.full_name || '',
      parentId: currentUser?.uid || '',
      reasonId: reason,
      reasonLabel: selectedReason?.label || reason,
      icon: selectedReason?.icon || '📝',
      customReason: customReason.trim(),
      dates,
      from: fromDate,
      to: toDate,
      days,
      schoolId: currentUser?.schoolId || 'school_001',
    };

    try {
      const res = await apiFetch('/leave-request/student/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Submission failed. Please try again.');
      } else {
        setSubmitSuccess(data);
        setRefreshKey(k => k + 1);
        setReason('');
        setCustomReason('');
        setFromDate(todayStr());
        setToDate(todayStr());
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch (e) {
      setSubmitError(getFriendlyError(e, 'Failed to submit leave request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Apply Leave</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{studentName}{studentClass ? ' · ' + studentClass : ''}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {submitSuccess ? (
          <View style={{ alignItems: 'center', padding: 28, backgroundColor: '#34D399' + '11', borderWidth: 1, borderColor: '#34D399' + '33', borderRadius: 20, marginBottom: 24 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{'✅'}</Text>
            <Text style={{ fontWeight: '700', fontSize: 18, color: '#34D399', marginBottom: 8 }}>Leave Applied!</Text>
            {submitSuccess.noClassTeacherAssigned ? (
              <View style={{ backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B44', borderRadius: 12, padding: 12, marginTop: 8, width: '100%' }}>
                <Text style={{ fontSize: 12, color: '#F59E0B', textAlign: 'center', fontWeight: '600' }}>
                  {'⚠'} No Class Teacher assigned for {studentClass}.{'\n'}Request sent to Admin only.
                </Text>
              </View>
            ) : (
              <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                {'Sent to class teacher'}
                {submitSuccess.assignedTeacherName ? ' ' + submitSuccess.assignedTeacherName : ''}
                {' and Admin for approval.'}
              </Text>
            )}
          </View>
        ) : (
          <View style={st.card}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 14 }}>New Leave Request</Text>

            {submitError ? (
              <ErrorBanner message={submitError} onDismiss={() => setSubmitError('')} />
            ) : null}

            <Text style={st.label}>Reason for Leave</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {REASONS.map(r => (
                <TouchableOpacity key={r.id} onPress={() => setReason(r.id)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: reason === r.id ? C.gold + '22' : C.navyMid, borderWidth: 1, borderColor: reason === r.id ? C.gold + '66' : C.border }}>
                  <Text style={{ fontSize: 13, color: reason === r.id ? C.gold : C.muted, fontWeight: '600' }}>{r.icon} {r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {reason === 'other' && (
              <>
                <Text style={st.label}>Specify Reason</Text>
                <TextInput
                  style={[st.input, { minHeight: 70, textAlignVertical: 'top' }]}
                  placeholder="Describe the reason..."
                  placeholderTextColor={C.muted}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                />
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={st.label}>From Date</Text>
                <TextInput
                  style={st.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.muted}
                  value={fromDate}
                  onChangeText={setFromDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.label}>To Date</Text>
                <TextInput
                  style={st.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.muted}
                  value={toDate}
                  onChangeText={setToDate}
                />
              </View>
            </View>

            {fromDate && toDate && (
              <View style={{ backgroundColor: C.navyMid, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {'📅'} {fmtDate(fromDate)} to {fmtDate(toDate)}
                  {'  ·  '}
                  <Text style={{ color: C.gold, fontWeight: '700' }}>{daysBetween(fromDate, toDate)} day{daysBetween(fromDate, toDate) > 1 ? 's' : ''}</Text>
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={{ backgroundColor: C.gold, paddingVertical: 16, borderRadius: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={C.navy} />
              ) : (
                <Text style={{ fontWeight: '800', fontSize: 15, color: C.navy }}>Submit Leave Request</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>Leave History</Text>
          {loadingHistory && <ActivityIndicator size="small" color={C.teal} />}
        </View>

        {!studentId ? (
          <Text style={{ color: C.muted, textAlign: 'center', paddingVertical: 20 }}>Student profile not linked.</Text>
        ) : pastLeaves.length === 0 && !loadingHistory ? (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>{'📋'}</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No leave requests found.</Text>
          </View>
        ) : (
          pastLeaves.map((l, i) => {
            const isApproved = l.status === 'Approved';
            const isRejected = l.status === 'Rejected';
            const statusColor = isApproved ? '#34D399' : isRejected ? C.coral : C.gold;
            return (
              <View key={l.id || i} style={[st.leaveCard, { borderLeftColor: statusColor, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{l.icon || '📝'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: C.white, marginBottom: 2 }}>{l.reasonLabel || l.reason}</Text>
                    <Text style={{ fontSize: 12, color: C.muted }}>
                      {fmtDate(l.from)}{l.days > 1 ? ' → ' + fmtDate(l.to) : ''} {'·'} {l.days}d
                    </Text>
                    {isRejected && l.rejectReason ? (
                      <Text style={{ fontSize: 11, color: C.coral, marginTop: 2 }}>Reason: {l.rejectReason}</Text>
                    ) : null}
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: statusColor + '22' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{l.status || 'Pending'}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 14, color: C.white, marginBottom: 14 },
  leaveCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderRadius: 14, padding: 14 },
});

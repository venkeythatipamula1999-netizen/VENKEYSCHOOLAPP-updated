import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';
import { getFriendlyError } from '../../utils/errorMessages';
import Toast from '../../components/Toast';

export default function FeeScreen({ onBack, currentUser }) {
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [ackLoading, setAckLoading] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [error, setError] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeError, setFeeError] = useState(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  const studentId = currentUser?.studentId || currentUser?.activeStudentId || '';

  useEffect(() => {
    if (!studentId) { setFeeLoading(false); return; }
    setFeeLoading(true);
    apiFetch(`/parent/fee-summary?studentId=${encodeURIComponent(studentId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.fee) setFeeData(data.fee);
        else setFeeError('No fee records found');
      })
      .catch(() => setFeeError('Failed to load fee details'))
      .finally(() => setFeeLoading(false));
  }, [studentId]);

  useEffect(() => {
    setRemindersLoading(true);
    apiFetch(`/fee-reminders?studentId=${studentId}`)
      .then(r => r.json())
      .then(data => setReminders(data.reminders || []))
      .catch(() => {})
      .finally(() => setRemindersLoading(false));
  }, [studentId]);

  const acknowledgeReminder = async (reminderId) => {
    setAckLoading(reminderId);
    try {
      const res = await apiFetch('/fee-reminder/acknowledge', {
        method: 'POST',
        body: JSON.stringify({ reminderId }),
      });
      if (res.ok) {
        setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, parentAcknowledged: true } : r));
        setToast({ visible: true, message: 'Acknowledgement sent to school', type: 'success' });
      }
    } catch (e) { setError(getFriendlyError(e, 'Failed to load fee details')); }
    setAckLoading(null);
  };

  const INR = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');
  const pendingReminders = reminders.filter(r => !r.parentAcknowledged);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      {error ? <Text style={{ color: 'red', padding: 12, textAlign: 'center' }}>{error}</Text> : null}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Fee Details</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Academic Year 2024{'–'}25</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {feeLoading && (
          <ActivityIndicator color={C.gold} style={{ marginTop: 40 }} />
        )}
        {!feeLoading && feeError && (
          <Text style={{ color: C.coral, textAlign: 'center', marginTop: 40 }}>{feeError}</Text>
        )}
        {!feeLoading && feeData && (() => {
          const paidPct = Math.round(((feeData.paid || 0) / (feeData.total || 1)) * 100);
          return (
            <>
              <View style={st.heroCard}>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {[
                    { val: INR(feeData.total), lbl: 'Total Fee', color: C.gold },
                    { val: INR(feeData.paid), lbl: 'Paid', color: '#34D399' },
                    { val: INR(feeData.pending), lbl: 'Pending', color: C.coral },
                  ].map(m => (
                    <View key={m.lbl} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.navy + '88', borderRadius: 12 }}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: m.color }}>{m.val}</Text>
                      <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{m.lbl}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: paidPct + '%', backgroundColor: '#34D399', borderRadius: 4 }} />
                </View>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 8, textAlign: 'center' }}>{paidPct}% paid</Text>
              </View>

              <View style={st.secHead}><Text style={st.secTitle}>Payment History</Text></View>
              {(feeData.history || []).length === 0 && (
                <Text style={{ color: C.muted, textAlign: 'center', marginBottom: 16 }}>No payment records yet</Text>
              )}
              {(feeData.history || []).map((inst, i) => (
                <View key={i} style={[st.card, { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#34D399' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{'Payment ' + (i + 1)}</Text>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#34D39922' }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#34D399' }}>Paid</Text>
                    </View>
                  </View>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: C.white, marginBottom: 6 }}>{INR(inst.amount)}</Text>
                  <Text style={{ fontSize: 12, color: '#34D399', marginTop: 4 }}>
                    Paid on {inst.date || '—'}{inst.ref ? ' · Ref: ' + inst.ref : ''}
                  </Text>
                </View>
              ))}
            </>
          );
        })()}

        <Toast {...toast} onHide={() => setToast(t => ({...t, visible: false}))} />

        {remindersLoading ? (
          <View style={{ paddingVertical:20, alignItems:'center' }}>
            <ActivityIndicator size="small" color={C.teal} />
          </View>
        ) : pendingReminders.length > 0 ? (
          <View>
            <View style={[st.secHead, { marginTop:10 }]}>
              <Text style={st.secTitle}>Fee Reminders</Text>
              <View style={{ paddingVertical:3, paddingHorizontal:10, borderRadius:99, backgroundColor:C.coral+'22' }}>
                <Text style={{ fontSize:11, fontWeight:'700', color:C.coral }}>{pendingReminders.length} Pending</Text>
              </View>
            </View>
            {pendingReminders.map(r => (
              <View key={r.id} style={[st.card, { marginBottom:10, borderLeftWidth:3, borderLeftColor:C.coral, borderColor:C.coral+'44' }]}>
                <View style={{ flexDirection:'row', alignItems:'flex-start', gap:12 }}>
                  <View style={{ width:40, height:40, borderRadius:12, backgroundColor:C.coral+'22', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:20 }}>{'\uD83D\uDD14'}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontWeight:'700', fontSize:14, color:C.white, marginBottom:4 }}>Fee Reminder</Text>
                    <Text style={{ fontSize:13, color:C.muted, marginBottom:6, lineHeight:18 }}>{r.message || `A balance of ${INR(r.amount)} is pending. Please pay by ${r.dueDate}.`}</Text>
                    <View style={{ flexDirection:'row', gap:12, marginBottom:8 }}>
                      <Text style={{ fontSize:11, color:C.coral, fontWeight:'700' }}>Due: {r.dueDate}</Text>
                      <Text style={{ fontSize:11, color:C.white, fontWeight:'700' }}>Amount: {INR(r.amount)}</Text>
                    </View>
                    <Text style={{ fontSize:10, color:C.muted }}>From: {r.senderName || 'School Admin'} {'·'} {new Date(r.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => acknowledgeReminder(r.id)}
                  disabled={ackLoading === r.id}
                  style={{ marginTop:12, paddingVertical:10, borderRadius:12, backgroundColor:C.teal, alignItems:'center', opacity:ackLoading===r.id?0.6:1 }}
                >
                  {ackLoading === r.id ? (
                    <ActivityIndicator size="small" color={C.navy} />
                  ) : (
                    <Text style={{ fontWeight:'800', fontSize:13, color:C.navy }}>{'\u2705'} Acknowledge & Mark as Paid</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : reminders.length > 0 ? (
          <View style={[st.secHead, { marginTop:10 }]}>
            <Text style={st.secTitle}>Fee Reminders</Text>
            <View style={{ paddingVertical:3, paddingHorizontal:10, borderRadius:99, backgroundColor:'#34D39922' }}>
              <Text style={{ fontSize:11, fontWeight:'700', color:'#34D399' }}>All Acknowledged</Text>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  heroCard: { backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.gold + '44', borderRadius: 24, padding: 20, marginBottom: 18 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 18 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white },
});

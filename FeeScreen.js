import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

export default function FeeScreen({ onBack, currentUser }) {
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [ackLoading, setAckLoading] = useState(null);
  const [ackMsg, setAckMsg] = useState("");

  const studentId = currentUser?.studentId || 'student-101';

  useEffect(() => {
    setRemindersLoading(true);
    fetch(`/api/fee-reminders?studentId=${studentId}`)
      .then(r => r.json())
      .then(data => setReminders(data.reminders || []))
      .catch(() => {})
      .finally(() => setRemindersLoading(false));
  }, [studentId]);

  const acknowledgeReminder = async (reminderId) => {
    setAckLoading(reminderId);
    try {
      const res = await fetch('/api/fee-reminder/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId }),
      });
      if (res.ok) {
        setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, parentAcknowledged: true } : r));
        setAckMsg("Acknowledgement sent to school");
        setTimeout(() => setAckMsg(""), 3000);
      }
    } catch (e) {}
    setAckLoading(null);
  };

  const INR = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');
  const feeData = {
    total: 85000, paid: 63750, pending: 21250,
    installments: [
      { label: 'Term 1', amount: 28500, due: 'Jun 15, 2024', status: 'Paid', paidOn: 'Jun 12, 2024', ref: 'FEE-001' },
      { label: 'Term 2', amount: 28500, due: 'Oct 15, 2024', status: 'Paid', paidOn: 'Oct 10, 2024', ref: 'FEE-002' },
      { label: 'Term 3', amount: 28000, due: 'Jan 15, 2025', status: 'Pending', paidOn: null, ref: null },
    ],
    breakdown: [
      { label: 'Tuition Fee', amount: 48000, color: C.gold },
      { label: 'Transport Fee', amount: 18000, color: C.teal },
      { label: 'Lab & Library', amount: 8000, color: C.purple },
      { label: 'Sports & Activities', amount: 6000, color: C.coral },
      { label: 'Exam Fee', amount: 5000, color: '#60A5FA' },
    ],
  };

  const paidPct = Math.round((feeData.paid / feeData.total) * 100);
  const pendingReminders = reminders.filter(r => !r.parentAcknowledged);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Fee Details</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Academic Year 2024{'–'}25</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
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

        <View style={st.secHead}><Text style={st.secTitle}>Installments</Text></View>
        {feeData.installments.map((inst, i) => {
          const isPaid = inst.status === 'Paid';
          return (
            <View key={i} style={[st.card, { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: isPaid ? '#34D399' : C.coral }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{inst.label}</Text>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: (isPaid ? '#34D399' : C.coral) + '22' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isPaid ? '#34D399' : C.coral }}>{inst.status}</Text>
                </View>
              </View>
              <Text style={{ fontWeight: '800', fontSize: 20, color: C.white, marginBottom: 6 }}>{INR(inst.amount)}</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>Due: {inst.due}</Text>
              {isPaid && <Text style={{ fontSize: 12, color: '#34D399', marginTop: 4 }}>Paid on {inst.paidOn} {'·'} Ref: {inst.ref}</Text>}
            </View>
          );
        })}

        <View style={[st.secHead, { marginTop: 10 }]}><Text style={st.secTitle}>Fee Breakdown</Text></View>
        <View style={st.card}>
          {feeData.breakdown.map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < feeData.breakdown.length - 1 ? 14 : 0, marginBottom: i < feeData.breakdown.length - 1 ? 14 : 0, borderBottomWidth: i < feeData.breakdown.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: b.color }} />
                <Text style={{ fontSize: 13, color: C.white }}>{b.label}</Text>
              </View>
              <Text style={{ fontWeight: '700', fontSize: 14, color: b.color }}>{INR(b.amount)}</Text>
            </View>
          ))}
        </View>

        {ackMsg ? (
          <View style={{ paddingVertical:10, paddingHorizontal:16, borderRadius:12, backgroundColor:'#34D39922', marginBottom:14, alignItems:'center' }}>
            <Text style={{ fontSize:13, fontWeight:'600', color:'#34D399' }}>{ackMsg}</Text>
          </View>
        ) : null}

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

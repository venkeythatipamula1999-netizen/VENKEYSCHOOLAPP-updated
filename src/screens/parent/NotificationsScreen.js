import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

export default function NotificationsScreen({ onBack, currentUser }) {
  const [liveNotifs, setLiveNotifs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  const studentId = currentUser?.studentId || '';

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    apiFetch(`/parent-notifications?studentId=${encodeURIComponent(studentId)}`)
      .then(r => r.json())
      .then(data => {
        const notifs = (data.notifications || []).map(n => {
          const isProximity = n.type === 'proximity_alert';
          const isFee = n.type === 'fee_reminder';
          const isFile = n.type === 'file_upload' || (n.message && n.message.includes('New File'));
          const isAck = n.type === 'payment_acknowledgement';
          const isEvent = n.type === 'event';
          return {
            ...n,
            icon: isProximity ? '\uD83D\uDE8C' : isFee ? '\uD83D\uDD14' : isFile ? '\uD83D\uDCC1' : isAck ? '\u2705' : isEvent ? '\uD83D\uDCC5' : '\uD83D\uDCE2',
            title: isProximity ? 'Bus Approaching!' : isFee ? 'Fee Reminder' : isFile ? 'New Document' : isAck ? 'Payment Acknowledged' : (n.title || 'Notification'),
            desc: n.message || '',
            time: new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            color: isProximity ? C.teal : isFee ? C.coral : isFile ? C.purple : isAck ? '#34D399' : isEvent ? '#60A5FA' : C.gold,
            isLive: true,
          };
        });
        setLiveNotifs(notifs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);


  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Notifications</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Today, {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {loading && (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={C.teal} />
          </View>
        )}

        {liveNotifs.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.teal, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Live Updates</Text>
            <View style={st.card}>
              {liveNotifs.map((n, i) => (
                <View key={n.id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i < liveNotifs.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                  <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: n.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{n.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={{ fontWeight: '600', fontSize: 14, color: C.white }}>{n.title}</Text>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal }} />
                    </View>
                    <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, lineHeight: 16 }}>{n.desc}</Text>
                    <Text style={{ fontSize: 11, color: n.color }}>{n.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {!loading && liveNotifs.length === 0 && (
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>No notifications yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden' },
});

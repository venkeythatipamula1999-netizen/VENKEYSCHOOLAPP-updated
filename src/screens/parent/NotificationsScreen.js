import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

export default function NotificationsScreen({ onBack, currentUser }) {
  const [liveNotifs, setLiveNotifs] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const staticNotifs = [
    { icon: '\uD83D\uDE8C', title: 'Bus near your location', desc: 'Route 3 is 0.8 km away', time: '7:38 AM', color: C.teal, category: 'Morning' },
    { icon: '\u2705', title: 'Arjun boarded the bus', desc: 'QR scan confirmed at Stop 4', time: '7:42 AM', color: '#34D399', category: 'Morning' },
    { icon: '\uD83C\uDFEB', title: 'Bus reached school', desc: 'All students safely arrived', time: '8:15 AM', color: C.gold, category: 'Morning' },
    { icon: '\uD83D\uDCDD', title: 'Maths marks updated', desc: 'Arjun scored 88/100 in Term 2 test', time: '2:30 PM', color: C.purple, category: 'Afternoon' },
    { icon: '\uD83D\uDE8C', title: 'Return bus departed', desc: 'Bus left school premises', time: '3:45 PM', color: C.teal, category: 'Evening' },
    { icon: '\uD83D\uDC66', title: 'Arjun deboarded safely', desc: 'Arrived at home stop', time: '4:28 PM', color: '#34D399', category: 'Evening' },
  ];

  const groups = ['Morning', 'Afternoon', 'Evening'];

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

        {groups.map(g => {
          const items = staticNotifs.filter(n => n.category === g);
          if (items.length === 0) return null;
          return (
            <View key={g} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{g}</Text>
              <View style={st.card}>
                {items.map((n, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: n.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>{n.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 2 }}>{n.title}</Text>
                      <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{n.desc}</Text>
                      <Text style={{ fontSize: 11, color: n.color }}>{n.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden' },
});

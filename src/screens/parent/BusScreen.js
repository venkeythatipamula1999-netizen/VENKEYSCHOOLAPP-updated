import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

export default function BusScreen({ onBack, currentUser }) {
  const studentId = currentUser?.student_id || currentUser?.studentId || currentUser?.role_id || '';
  const [loading, setLoading] = useState(true);
  const [busData, setBusData] = useState(null);
  const [eta, setEta] = useState('—');
  const [events, setEvents] = useState([]);
  const [busRoute, setBusRoute] = useState('—');
  const [vehicleNo, setVehicleNo] = useState('—');
  const [speed, setSpeed] = useState('—');
  const [liveStatus, setLiveStatus] = useState(false);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    fetch(`/api/student/bus-tracking?studentId=${encodeURIComponent(studentId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setBusData(data);
          setEvents(data.events || []);
          setBusRoute(data.busRoute || '—');
          setVehicleNo(data.busNumber || '—');
          setLiveStatus(data.tripStatus === 'active');
          if (data.busLocation) setSpeed(Math.round(data.busLocation.speed || 0) + ' km/h');
          const estMins = data.tripStatus === 'active' ? '~8' : '—';
          setEta(estMins);
        }
      })
      .catch(e => console.error('Bus tracking fetch error:', e.message))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.teal} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Bus Tracking</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{busRoute} {'·'} {vehicleNo}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={st.mapBox}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: liveStatus ? C.teal : C.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon name="bus" size={26} color={C.white} />
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, backgroundColor: liveStatus ? (C.teal + '22') : (C.muted + '22') }}>
              <Text style={{ color: liveStatus ? C.teal : C.muted, fontSize: 12, fontWeight: '600' }}>{liveStatus ? '🔴 Live Tracking' : '⚪ Trip Not Active'}</Text>
            </View>
          </View>
        </View>

        <View style={st.busCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>Estimated Arrival</Text>
              <Text style={{ fontSize: 36, fontWeight: '700', color: C.teal }}>{eta}</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>{liveStatus ? 'minutes' : 'No active trip'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: liveStatus ? '#34D399' : C.muted, marginBottom: 8 }} />
              <Text style={{ fontSize: 12, color: liveStatus ? '#34D399' : C.muted }}>{liveStatus ? 'Live' : 'Offline'}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{speed}</Text>
            </View>
          </View>
        </View>

        <View style={st.secHead}><Text style={st.secTitle}>Today's Journey</Text></View>
        <View style={st.card}>
          {events.length > 0 ? (
            events.map((e, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 14, paddingBottom: i < events.length - 1 ? 16 : 0, marginBottom: i < events.length - 1 ? 16 : 0, borderBottomWidth: i < events.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                <Text style={{ fontSize: 20 }}>{e.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: e.done ? C.white : C.muted }}>{e.event}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>{e.time}</Text>
                </View>
                {e.done && <Icon name="check" size={16} color={C.teal} />}
              </View>
            ))
          ) : (
            <Text style={{ color: C.muted, fontSize: 13 }}>No trip data available</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  mapBox: { height: 220, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.teal + '44', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  busCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.teal + '44', borderRadius: 18, padding: 18, marginBottom: 20 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 18 },
});

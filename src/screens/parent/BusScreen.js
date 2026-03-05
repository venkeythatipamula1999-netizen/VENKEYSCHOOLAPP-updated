import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

export default function BusScreen({ onBack }) {
  const eta = 8;
  const events = [
    { time: '7:30 AM', event: 'Bus departed from school', icon: '\u{1F68C}', done: true },
    { time: '7:42 AM', event: 'Arjun boarded the bus', icon: '\u2705', done: true },
    { time: '~8:15 AM', event: 'Arrival at home stop', icon: '\u{1F3E0}', done: false },
    { time: '~8:20 AM', event: 'Arjun deboarded', icon: '\u{1F466}', done: false },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Bus Tracking</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Route 3 {'·'} Vehicle MH-01-AB-1234</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={st.mapBox}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon name="bus" size={26} color={C.white} />
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, backgroundColor: C.teal + '22' }}>
              <Text style={{ color: C.teal, fontSize: 12, fontWeight: '600' }}>{'\u{1F534}'} Live Tracking</Text>
            </View>
          </View>
        </View>

        <View style={st.busCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>Estimated Arrival</Text>
              <Text style={{ fontSize: 36, fontWeight: '700', color: C.teal }}>{eta} min</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>Near Gandhi Nagar Junction</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399', marginBottom: 8 }} />
              <Text style={{ fontSize: 12, color: '#34D399' }}>Live</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>45 km/h</Text>
            </View>
          </View>
        </View>

        <View style={st.secHead}><Text style={st.secTitle}>Today's Journey</Text></View>
        <View style={st.card}>
          {events.map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 14, paddingBottom: i < 3 ? 16 : 0, marginBottom: i < 3 ? 16 : 0, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 20 }}>{e.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 13, color: e.done ? C.white : C.muted }}>{e.event}</Text>
                <Text style={{ fontSize: 12, color: C.muted }}>{e.time}</Text>
              </View>
              {e.done && <Icon name="check" size={16} color={C.teal} />}
            </View>
          ))}
        </View>

        <View style={[st.secHead, { marginTop: 20 }]}><Text style={st.secTitle}>Travel Duration (min)</Text></View>
        <View style={st.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 100, alignItems: 'flex-end' }}>
            {[42, 38, 45, 40, 36, 44, 39].map((v, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{v}</Text>
                <View style={{ height: v, width: 14, borderRadius: 4, backgroundColor: C.teal, opacity: 0.75 }} />
                <Text style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>D{i + 1}</Text>
              </View>
            ))}
          </View>
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

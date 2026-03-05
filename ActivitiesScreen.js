import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

export default function ActivitiesScreen({ onBack }) {
  const [filter, setFilter] = useState('all');

  const activities = [
    { title: 'Annual Day Practice', type: 'event', date: 'Feb 10, 2025', time: '3:00 PM', color: C.gold, icon: '\u{1F3AD}', desc: 'Drama rehearsal for annual day celebration' },
    { title: 'Science Exhibition', type: 'academic', date: 'Feb 15, 2025', time: '9:00 AM', color: C.teal, icon: '\u{1F52C}', desc: 'Arjun is presenting Solar System model' },
    { title: 'Inter-School Cricket', type: 'sports', date: 'Feb 18, 2025', time: '2:00 PM', color: C.coral, icon: '\u{1F3CF}', desc: 'District-level cricket tournament' },
    { title: 'Art Competition', type: 'event', date: 'Feb 20, 2025', time: '10:00 AM', color: C.purple, icon: '\u{1F3A8}', desc: 'Painting competition - theme: Nature' },
    { title: 'Math Olympiad', type: 'academic', date: 'Feb 25, 2025', time: '11:00 AM', color: '#60A5FA', icon: '\u{1F9EE}', desc: 'School-level math olympiad selection' },
    { title: 'Sports Day', type: 'sports', date: 'Mar 01, 2025', time: '8:00 AM', color: '#34D399', icon: '\u{1F3C6}', desc: 'Annual sports day - 100m, relay, long jump' },
  ];

  const filters = ['all', 'event', 'academic', 'sports'];
  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Activities</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Upcoming events & activities</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {filters.map(f => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: filter === f ? C.gold : C.navyMid }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f ? C.navy : C.muted, textTransform: 'capitalize' }}>{f === 'all' ? `All (${activities.length})` : f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filtered.map((a, i) => (
          <View key={i} style={[st.card, { marginBottom: 12, borderLeftWidth: 3, borderLeftColor: a.color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{a.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 3 }}>{a.title}</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{a.desc}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 11, color: a.color, fontWeight: '600' }}>{a.date}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>{a.time}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16 },
});

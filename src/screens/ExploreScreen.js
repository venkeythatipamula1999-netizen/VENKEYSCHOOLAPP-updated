import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../theme/colors';
import Icon from '../components/Icon';

export default function ExploreScreen({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState({
    name: 'Venkeys International School',
    tagline: 'Excellence in Education Since 2003',
    stats: [['1200+', 'Students'], ['85+', 'Staff'], ['20+', 'Years']]
  });

  useEffect(() => {
    fetch('/api/school-info')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.info) {
          setSchoolInfo({
            name: data.info.name || 'Venkeys International School',
            tagline: data.info.tagline || 'Excellence in Education Since 2003',
            stats: [
              [data.info.studentCount || '1200+', 'Students'],
              [data.info.staffCount || '85+', 'Staff'],
              [data.info.yearsCount || '20+', 'Years']
            ]
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const events = [
    { name: 'Annual Day 2025', date: 'Feb 15', icon: '\u{1F3AD}' },
    { name: 'Science Fair', date: 'Mar 8', icon: '\u{1F52C}' },
    { name: 'Sports Meet', date: 'Mar 22', icon: '\u{1F3C6}' },
  ];

  const achievements = [
    { title: 'State Science Olympiad Winner', year: '2024', icon: '\u{1F3C6}' },
    { title: 'Best School Award – District', year: '2023', icon: '\u2B50' },
    { title: '100% Board Results for 5 Years', year: '2019–24', icon: '\u{1F4DA}' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Explore School</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 50 }} />
        ) : (
          <View style={st.hero}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F3EB}'}</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.white, marginBottom: 8 }}>{schoolInfo.name}</Text>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{schoolInfo.tagline}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 }}>
              {schoolInfo.stats.map(([v, l]) => (
                <View key={l} style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 20, color: C.gold }}>{v}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={st.secHead}><Text style={st.secTitle}>Gallery</Text></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {['\u{1F3DF}\uFE0F', '\u{1F52C}', '\u{1F4DA}', '\u{1F3A8}'].map((e, i) => (
            <View key={i} style={{ width: '47%', height: 90, borderRadius: 16, backgroundColor: i % 2 === 0 ? C.navyLt : C.navyMid, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 40 }}>{e}</Text>
            </View>
          ))}
        </View>

        <View style={st.secHead}><Text style={st.secTitle}>Upcoming Events</Text></View>
        {events.map((e, i) => (
          <View key={i} style={[st.card, { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.gold + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{e.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.white }}>{e.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{e.date}, 2025</Text>
            </View>
            <Icon name="arrow" size={16} color={C.muted} />
          </View>
        ))}

        <View style={[st.secHead, { marginTop: 20 }]}><Text style={st.secTitle}>Achievements</Text></View>
        {achievements.map((a, i) => (
          <View key={i} style={[st.badge, { marginBottom: 10 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.gold + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{a.icon}</Text>
            </View>
            <View>
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.white }}>{a.title}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{a.year}</Text>
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
  hero: { backgroundColor: C.navyLt, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 24, marginBottom: 20, alignItems: 'center' },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.gold + '22', borderRadius: 16, padding: 14 },
});

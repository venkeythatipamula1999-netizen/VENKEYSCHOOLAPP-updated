import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C } from '../theme/colors';
import Icon from './Icon';
import DonutRing from './DonutRing';
import { getGradeColor } from '../data/marks';

export default function UnitDetail({ unit, onBack }) {
  const enteredSubjects = unit.subjects.filter(s => !s.notEntered);
  const obtained = enteredSubjects.reduce((a, s) => a + (s.marks || 0), 0);
  const avg = enteredSubjects.length > 0 ? Math.round(obtained / enteredSubjects.length) : 0;
  const pct = unit.total > 0 ? Math.round((obtained / unit.total) * 100) : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>{unit.label}</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{unit.date} {'·'} Grade 8-B</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={[st.heroCard, { borderColor: C.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 18 }}>
            <DonutRing pct={pct} color={C.gold} size={96} stroke={10} label={`${pct}%`} sublabel="Overall" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 34, fontWeight: '900', color: C.gold }}>{obtained}<Text style={{ fontSize: 16, color: C.muted, fontWeight: '400' }}>/{unit.total}</Text></Text>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Total Marks</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {[
                  { val: avg, label: 'Avg / Sub', color: C.teal },
                  { val: 'A', label: 'Grade', color: '#34D399' },
                  { val: '#7', label: 'Rank', color: C.purple },
                ].map(m => (
                  <View key={m.label} style={{ alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, backgroundColor: C.navy + 'aa', borderRadius: 10 }}>
                    <Text style={{ fontWeight: '700', fontSize: 18, color: m.color }}>{m.val}</Text>
                    <Text style={{ fontSize: 10, color: C.muted }}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {unit.subjects.map((s, i) => (
              <DonutRing key={i} pct={s.notEntered ? 0 : s.marks} color={s.notEntered ? C.muted : s.color} size={46} stroke={5} label={s.notEntered ? '–' : `${s.marks}`} sublabel={s.short} />
            ))}
          </View>
        </View>

        <View style={st.card}>
          <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 4 }}>Subject-wise Marks</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>out of 100 each</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 110, alignItems: 'flex-end' }}>
            {unit.subjects.map((s, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 11, color: s.notEntered ? C.muted : s.color, fontWeight: '700', marginBottom: 4 }}>{s.notEntered ? '–' : s.marks}</Text>
                <View style={{ height: s.notEntered ? 4 : Math.min((s.marks || 0) * 0.8, 80), width: 18, borderRadius: 4, backgroundColor: s.notEntered ? C.border : s.color, opacity: s.notEntered ? 0.4 : 0.85 }} />
                <Text style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{s.short}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={st.card}>
          <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 14 }}>Performance Band</Text>
          {[
            { label: 'Excellent (90–100)', count: enteredSubjects.filter(s => s.marks >= 90).length, color: C.teal },
            { label: 'Good (75–89)', count: enteredSubjects.filter(s => s.marks >= 75 && s.marks < 90).length, color: C.gold },
            { label: 'Average (50–74)', count: enteredSubjects.filter(s => s.marks >= 50 && s.marks < 75).length, color: C.coral },
            { label: 'Below Avg (<50)', count: enteredSubjects.filter(s => s.marks < 50).length, color: '#EF4444' },
          ].map((b, i) => (
            <View key={i} style={{ marginBottom: i < 3 ? 12 : 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontSize: 12, color: C.muted }}>{b.label}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: b.color }}>{b.count} subject{b.count !== 1 ? 's' : ''}</Text>
              </View>
              <View style={st.progressTrack}>
                <View style={[st.progressFill, { width: enteredSubjects.length > 0 ? (b.count / enteredSubjects.length * 100) + '%' : '0%', backgroundColor: b.color }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={st.secHead}><Text style={st.secTitle}>Subject Details</Text></View>
        <View style={st.card}>
          {unit.subjects.map((s, i) => (
            <View key={i} style={{ paddingBottom: i < unit.subjects.length - 1 ? 16 : 0, marginBottom: i < unit.subjects.length - 1 ? 16 : 0, borderBottomWidth: i < unit.subjects.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: (s.notEntered ? C.muted : s.color) + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 13, color: s.notEntered ? C.muted : s.color }}>{s.short[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: s.notEntered ? C.muted : C.white }}>{s.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{s.notEntered ? 'Not Entered' : `${s.marks} / ${s.max} marks`}</Text>
                </View>
                {s.notEntered
                  ? <Text style={{ fontWeight: '600', fontSize: 13, color: C.muted }}>–</Text>
                  : <Text style={{ fontWeight: '800', fontSize: 20, color: getGradeColor(s.grade) }}>{s.grade}</Text>
                }
              </View>
              <View style={st.progressTrack}>
                <View style={[st.progressFill, { width: s.notEntered ? '0%' : ((s.marks / s.max) * 100) + '%', backgroundColor: s.notEntered ? C.border : s.color }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  heroCard: { backgroundColor: C.navyLt, borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 18 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 18 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white },
  progressTrack: { height: 7, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
});

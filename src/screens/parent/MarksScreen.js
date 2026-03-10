import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import DonutRing from '../../components/DonutRing';
import UnitDetail from '../../components/UnitDetail';
import { apiFetch } from '../../api/client';

const SUB_PALETTE = [C.gold, C.teal, C.purple, C.coral, '#34D399', '#60A5FA', '#F59E0B', '#EC4899'];
const subColor = (name, idx) => {
  const map = { maths: C.gold, math: C.gold, mathematics: C.gold, science: C.teal, english: C.purple, social: C.coral, 'social studies': C.coral, tamil: '#34D399', computer: '#60A5FA' };
  return map[(name || '').toLowerCase()] || SUB_PALETTE[idx % SUB_PALETTE.length];
};
const subShort = (name) => (name || '').slice(0, 4);

export default function MarksScreen({ onBack, currentUser }) {
  const [openUnit, setOpenUnit] = useState(null);
  const [marksData, setMarksData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const studentId = currentUser?.studentId;

  const fetchMarks = () => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    apiFetch(`/marks/student/${studentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setMarksData(d);
        else setError('Could not load marks.');
      })
      .catch(e => { console.error('Parent marks fetch error:', e); setError('Network error. Please try again.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMarks();
    // Auto-refresh every 60 seconds to pick up newly published marks
    const interval = setInterval(fetchMarks, 60000);
    return () => clearInterval(interval);
  }, [studentId]);

  if (openUnit && marksData) {
    const examData = marksData.byExam.find(e => e.examType === openUnit);
    if (examData) {
      const unitObj = {
        id: examData.examType, label: examData.examType, date: '',
        subjects: examData.subjects.map((s, i) => ({ name: s.subject, short: subShort(s.subject), color: subColor(s.subject, i), marks: s.marks, max: s.maxMarks || 20, notEntered: s.notEntered || false })),
        total: examData.maxTotal,
      };
      return <UnitDetail unit={unitObj} onBack={() => setOpenUnit(null)} />;
    }
  }

  const byExam = marksData?.byExam ?? [];
  const bySubject = marksData?.bySubject ?? [];
  const overallPct = marksData?.overallPct ?? 0;
  const bestExam = byExam.length ? byExam.reduce((a, b) => a.pct > b.pct ? a : b) : null;
  const bestSubject = bySubject.length ? bySubject.reduce((a, b) => a.pct > b.pct ? a : b) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Academic Performance</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>2024{'–'}25 {'·'} All Units</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 80 }} />
        ) : error ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>{'⚠️'}</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>{error}</Text>
          </View>
        ) : !studentId ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>{'👨‍🎓'}</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>Student profile not linked.\nPlease contact the school admin.</Text>
          </View>
        ) : marksData?.total === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>{'📋'}</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>No marks recorded yet for this student.</Text>
          </View>
        ) : (
          <>
            <View style={[st.heroCard, { borderColor: C.gold + '44' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <DonutRing pct={overallPct} color={C.gold} size={90} stroke={10} label={`${overallPct}%`} sublabel="Overall" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Cumulative Average</Text>
                  <Text style={{ fontSize: 42, fontWeight: '900', color: C.gold }}>{overallPct}<Text style={{ fontSize: 14, color: C.muted, fontWeight: '400' }}>%</Text></Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                    {byExam.length} Exam{byExam.length !== 1 ? 's' : ''} {'·'} {bySubject.length} Subject{bySubject.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: 'Best Exam', val: bestExam?.examType || '—', color: C.teal },
                  { label: 'Best Subject', val: bestSubject ? subShort(bestSubject.subject) : '—', color: '#34D399' },
                  { label: 'Total Exams', val: String(byExam.length), color: C.purple },
                ].map(m => (
                  <View key={m.label} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, backgroundColor: C.navy + '88', borderRadius: 12 }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: m.color }}>{m.val}</Text>
                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {byExam.length > 0 && (
              <>
                <View style={st.secHead}><Text style={st.secTitle}>Exam Units</Text><Text style={{ fontSize: 12, color: C.muted }}>Tap for details</Text></View>
                {byExam.map((unit, ui) => {
                  const trend = ui > 0 ? unit.pct - byExam[ui - 1].pct : null;
                  return (
                    <TouchableOpacity key={unit.examType} style={[st.card, { marginBottom: 12 }]} onPress={() => setOpenUnit(unit.examType)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <DonutRing pct={unit.pct} color={unit.pct >= 75 ? C.teal : C.gold} size={60} stroke={7} label={`${unit.pct}%`} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <Text style={{ fontWeight: '700', fontSize: 16, color: C.white }}>{unit.examType}</Text>
                            {trend !== null && (
                              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: (trend >= 0 ? '#34D399' : C.coral) + '22' }}>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: trend >= 0 ? '#34D399' : C.coral }}>{trend >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(trend)}</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: C.muted }}><Text style={{ color: C.white, fontWeight: '600' }}>{unit.total}</Text>/{unit.maxTotal}</Text>
                            <Text style={{ fontSize: 12, color: C.muted }}>Avg: <Text style={{ color: C.gold, fontWeight: '600' }}>{unit.avg}/20</Text></Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 3, marginTop: 8 }}>
                            {unit.subjects.map((s, si) => (
                              <View key={si} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: subColor(s.subject, si), opacity: 0.8 }} />
                            ))}
                          </View>
                        </View>
                        <Icon name="arrow" size={16} color={C.muted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {byExam.length > 1 && (
              <View style={st.card}>
                <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 4 }}>Score Trend Across Exams</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Overall percentage per exam</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 110, alignItems: 'flex-end' }}>
                  {byExam.map((u, i) => (
                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700', marginBottom: 4 }}>{u.pct}%</Text>
                      <View style={{ height: Math.max(Math.min(u.pct, 80), 4), width: 18, borderRadius: 4, backgroundColor: C.gold, opacity: 0.85 }} />
                      <Text style={{ fontSize: 9, color: C.muted, marginTop: 6, textAlign: 'center' }}>{u.examType.replace('Unit ', 'U')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {bySubject.length > 0 && (
              <>
                <View style={st.secHead}><Text style={st.secTitle}>Subject Avg (All Exams)</Text></View>
                <View style={st.card}>
                  {bySubject.map((s, i) => {
                    const col = subColor(s.subject, i);
                    return (
                      <View key={i} style={{ paddingBottom: i < bySubject.length - 1 ? 14 : 0, marginBottom: i < bySubject.length - 1 ? 14 : 0, borderBottomWidth: i < bySubject.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 7 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: col + '22', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontWeight: '800', fontSize: 12, color: col }}>{subShort(s.subject)[0]}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{s.subject}</Text>
                          </View>
                          <Text style={{ fontWeight: '800', fontSize: 17, color: col }}>{s.avg}<Text style={{ fontSize: 11, color: C.muted, fontWeight: '400' }}>/20</Text></Text>
                        </View>
                        <View style={{ height: 7, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: s.pct + '%', backgroundColor: col, borderRadius: 4 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  heroCard: { borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 18, backgroundColor: C.navyMid },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 18 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white },
});

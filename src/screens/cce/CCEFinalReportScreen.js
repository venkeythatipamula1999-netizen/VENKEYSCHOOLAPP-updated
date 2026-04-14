import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { C } from '../../theme/colors';
import { apiFetch } from '../../api/client';
import { SUBJECTS, GRADE_COLORS } from '../../helpers/cceGradingMobile';

function GradeCell({ score, grade, points }) {
  if (score === null || score === undefined) {
    return (
      <View style={st.cell}>
        <Text style={{ color: C.muted, fontSize: 12 }}>—</Text>
      </View>
    );
  }
  const color = GRADE_COLORS[grade] || C.muted;
  return (
    <View style={st.cell}>
      <Text style={{ color: C.white, fontSize: 12, fontWeight: '700' }}>{score}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={[st.gradePill, { backgroundColor: color + '33', borderColor: color }]}>
          <Text style={[st.gradeText, { color }]}>{grade}</Text>
        </View>
        <Text style={{ color: C.muted, fontSize: 10 }}>{points}pt</Text>
      </View>
    </View>
  );
}

export default function CCEFinalReportScreen({ onBack, params = {} }) {
  const { academicYear, classId, className, section } = params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    const q = new URLSearchParams({ academicYear, classId, section: section || '' }).toString();
    apiFetch(`/cce/results/final?${q}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) throw new Error(d.error || 'Failed');
        const sorted = (d.results || []).sort((a, b) => b.totalPoints - a.totalPoints);
        setResults(sorted);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const gradeDist = () => {
    const counts = {};
    for (const r of results) {
      for (const s of SUBJECTS) {
        const g = r.subjects?.[s]?.grade;
        if (g) counts[g] = (counts[g] || 0) + 1;
      }
    }
    return counts;
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={st.headerTitle}>Final Annual Report</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Class {className} · FA1–FA4 + SA1+SA2 · {academicYear}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={{ color: C.muted, marginTop: 12 }}>Loading results...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: '#ef4444', textAlign: 'center' }}>{error}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
          <Text style={{ color: C.white, fontWeight: '700' }}>No marks entered yet</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Enter all exam marks to view final results</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={st.tableHeader}>
                <Text style={[st.th, st.rankCol]}>Rank</Text>
                <Text style={[st.th, st.nameCol]}>Student</Text>
                {SUBJECTS.map(s => (
                  <View key={s} style={st.subjectHeader}>
                    <Text style={[st.th, { fontSize: 10 }]} numberOfLines={2}>{s}</Text>
                    <Text style={[st.th, { fontSize: 9, color: C.muted }]}>Score/Grd/Pts</Text>
                  </View>
                ))}
                <Text style={[st.th, st.totalCol]}>Total{'\n'}Pts</Text>
                <Text style={[st.th, st.overallCol]}>Overall{'\n'}Grade</Text>
              </View>

              {results.map((r, idx) => {
                const overallColor = GRADE_COLORS[r.overallGrade] || C.muted;
                return (
                  <View key={r.studentId} style={[st.row, idx % 2 === 0 && st.rowEven]}>
                    <View style={[st.rankCol, { alignItems: 'center' }]}>
                      <Text style={[st.td, { fontWeight: '700', color: idx < 3 ? C.gold : C.white }]}>{idx + 1}</Text>
                      {idx === 0 && <Text style={{ fontSize: 12 }}>🥇</Text>}
                      {idx === 1 && <Text style={{ fontSize: 12 }}>🥈</Text>}
                      {idx === 2 && <Text style={{ fontSize: 12 }}>🥉</Text>}
                    </View>
                    <Text style={[st.td, st.nameCol]} numberOfLines={2}>{r.studentId}</Text>
                    {SUBJECTS.map(s => {
                      const sub = r.subjects?.[s];
                      return (
                        <GradeCell
                          key={s}
                          score={sub?.finalScore ?? null}
                          grade={sub?.grade}
                          points={sub?.gradePoints}
                        />
                      );
                    })}
                    <Text style={[st.td, st.totalCol, { fontWeight: '800', color: C.gold }]}>{r.totalPoints ?? '—'}</Text>
                    <View style={[st.overallCol, { alignItems: 'center' }]}>
                      <View style={[st.gradePill, { backgroundColor: overallColor + '33', borderColor: overallColor }]}>
                        <Text style={[st.gradeText, { color: overallColor, fontSize: 13 }]}>{r.overallGrade || '—'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={st.distCard}>
            <Text style={{ color: C.white, fontWeight: '700', marginBottom: 4 }}>Grade Distribution</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>Across all subjects</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(gradeDist()).sort().map(([g, n]) => (
                <View key={g} style={[st.distBadge, { backgroundColor: (GRADE_COLORS[g] || C.border) + '33', borderColor: GRADE_COLORS[g] || C.border }]}>
                  <Text style={{ color: GRADE_COLORS[g] || C.white, fontWeight: '700', fontSize: 14 }}>{g}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>× {n}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const CELL_W = 90;

const st = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.navy },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingTop: 52, backgroundColor: C.navyMid, borderBottomWidth: 1, borderColor: C.border },
  backBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: C.white },
  tableHeader:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f2957', paddingVertical: 10, paddingHorizontal: 8 },
  th:            { color: C.muted, fontWeight: '700', fontSize: 11, textAlign: 'center' },
  rankCol:       { width: 40, textAlign: 'center' },
  nameCol:       { width: 120, paddingLeft: 4 },
  totalCol:      { width: 48, textAlign: 'center' },
  overallCol:    { width: 60, textAlign: 'center' },
  subjectHeader: { width: CELL_W, alignItems: 'center', paddingHorizontal: 4 },
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: C.border + '44' },
  rowEven:       { backgroundColor: C.navyMid + '55' },
  td:            { color: C.white, fontSize: 12 },
  cell:          { width: CELL_W, alignItems: 'center', gap: 3 },
  gradePill:     { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  gradeText:     { fontSize: 10, fontWeight: '800' },
  distCard:      { margin: 16, backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  distBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
});

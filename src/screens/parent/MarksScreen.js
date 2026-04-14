import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, BackHandler } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';
import { getFriendlyError } from '../../utils/errorMessages';

function getCurrentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 5) return `${y}-${String(y + 1).slice(2)}`;
  return `${y - 1}-${String(y).slice(2)}`;
}

const GRADE_COLORS = {
  A1: '#059669', A2: '#10b981', B1: '#3b82f6', B2: '#6366f1',
  C1: '#f59e0b', C2: '#f97316', D: '#ef4444', E: '#dc2626',
};

const SUB_COLORS = {
  mathematics: C.gold, maths: C.gold, math: C.gold,
  science: C.teal, english: C.purple,
  'social studies': C.coral, 'social science': C.coral, social: C.coral,
  telugu: '#34D399', hindi: '#F59E0B',
};

function subColor(name) {
  return SUB_COLORS[(name || '').toLowerCase()] || '#60A5FA';
}

function ScoreBox({ label, value, max, color, wide, highlight }) {
  const display = (value !== null && value !== undefined) ? String(value) : '—';
  const hasValue = value !== null && value !== undefined;
  return (
    <View style={{
      flex: wide ? 2 : 1,
      alignItems: 'center',
      paddingVertical: 8,
      backgroundColor: highlight ? color + '18' : C.navy + '99',
      borderRadius: 10,
      borderWidth: highlight ? 1 : 0,
      borderColor: highlight ? color + '66' : 'transparent',
    }}>
      <Text style={{ fontWeight: highlight ? '800' : '600', fontSize: highlight ? 14 : 13, color: hasValue ? color : C.muted }}>
        {display}
      </Text>
      <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
        {label}{max ? `/${max}` : ''}
      </Text>
    </View>
  );
}

export default function MarksScreen({ onBack, currentUser }) {
  const [reportType, setReportType] = useState('halfyear');
  const [academicYear] = useState(getCurrentAcademicYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const studentId = currentUser?.studentId;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  const fetchSummary = (type) => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    apiFetch(`/cce/student-summary/${studentId}?academicYear=${academicYear}&type=${type}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        else setError(d.error || 'Could not load marks.');
      })
      .catch(e => setError(getFriendlyError(e, 'Failed to load marks')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary(reportType);
  }, [studentId, reportType]);

  const switchType = (t) => {
    if (t === reportType) return;
    setData(null);
    setReportType(t);
  };

  const subjects = data ? Object.entries(data.subjects) : [];
  const hasData = subjects.length > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
        backgroundColor: C.navyMid,
      }}>
        <TouchableOpacity onPress={onBack} style={{ marginRight: 14 }}>
          <Icon name="back" size={20} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Academic Report</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{academicYear} · CCE Grading</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', margin: 20, backgroundColor: C.navyMid, borderRadius: 14, padding: 4 }}>
        {[
          { key: 'halfyear', label: 'Half Year', sub: 'FA1 + FA2 + SA1' },
          { key: 'final', label: 'Annual', sub: 'FA1–FA4 + SA1+SA2' },
        ].map(t => {
          const active = reportType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => switchType(t.key)}
              activeOpacity={0.8}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: active ? C.teal : 'transparent',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 13, color: active ? C.white : C.muted }}>{t.label}</Text>
              <Text style={{ fontSize: 10, color: active ? C.white + 'bb' : C.muted + '77', marginTop: 2 }}>{t.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color={C.teal} style={{ marginTop: 60 }} />

        ) : error ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
            <Text style={{ color: C.coral, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
            <TouchableOpacity
              onPress={() => fetchSummary(reportType)}
              style={{ backgroundColor: C.teal, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 }}
            >
              <Text style={{ color: C.white, fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>

        ) : !studentId ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>👨‍🎓</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
              Student profile not linked.{'\n'}Please contact the school admin.
            </Text>
          </View>

        ) : !hasData ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
              No {reportType === 'halfyear' ? 'half-year' : 'annual'} marks recorded yet.{'\n'}
              Check back after exams are completed.
            </Text>
          </View>

        ) : (
          <>
            <View style={{
              borderRadius: 20, backgroundColor: C.navyMid,
              borderWidth: 1.5, borderColor: (GRADE_COLORS[data.overallGrade] || C.teal) + '55',
              padding: 24, marginBottom: 24, alignItems: 'center',
            }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: (GRADE_COLORS[data.overallGrade] || C.teal) + '22',
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <Text style={{ fontSize: 30, fontWeight: '900', color: GRADE_COLORS[data.overallGrade] || C.teal }}>
                  {data.overallGrade || '—'}
                </Text>
              </View>
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 17 }}>Overall Grade</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                {data.totalPoints} pts · {subjects.length} Subject{subjects.length !== 1 ? 's' : ''}
              </Text>
              <View style={{
                marginTop: 12, paddingHorizontal: 16, paddingVertical: 6,
                backgroundColor: (GRADE_COLORS[data.overallGrade] || C.teal) + '22',
                borderRadius: 20,
              }}>
                <Text style={{ color: GRADE_COLORS[data.overallGrade] || C.teal, fontWeight: '700', fontSize: 12 }}>
                  {reportType === 'halfyear' ? 'Half Year Report' : 'Annual Final Report'}
                </Text>
              </View>
            </View>

            <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 14 }}>
              Subject-wise Results
            </Text>

            {subjects.map(([subjectId, sub]) => {
              const col = subColor(subjectId);
              const grade = sub.grade;
              const gradeCol = sub.gradeColor || GRADE_COLORS[grade] || '#6b7280';
              const hasResult = reportType === 'halfyear' ? sub.halfYear !== null : sub.final !== null;

              return (
                <View key={subjectId} style={{
                  borderRadius: 18, backgroundColor: C.navyMid,
                  borderWidth: 1, borderColor: C.border,
                  padding: 16, marginBottom: 14,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 11,
                      backgroundColor: col + '22',
                      alignItems: 'center', justifyContent: 'center', marginRight: 12,
                    }}>
                      <Text style={{ fontWeight: '900', fontSize: 13, color: col }}>
                        {(subjectId[0] || '?').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: 15, color: C.white }}>{subjectId}</Text>
                    {hasResult ? (
                      <View style={{
                        alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7,
                        backgroundColor: gradeCol + '22', borderRadius: 20,
                      }}>
                        <Text style={{ fontWeight: '900', fontSize: 18, color: gradeCol }}>{grade || '—'}</Text>
                        <Text style={{ fontSize: 9, color: gradeCol + 'cc', marginTop: 1 }}>
                          {sub.gradePoints ?? '—'} pts
                        </Text>
                      </View>
                    ) : (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.border, borderRadius: 20 }}>
                        <Text style={{ color: C.muted, fontSize: 12 }}>Pending</Text>
                      </View>
                    )}
                  </View>

                  {reportType === 'halfyear' ? (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ScoreBox label="FA1" value={sub.fa1} max={20} color={col} />
                        <ScoreBox label="FA2" value={sub.fa2} max={20} color={col} />
                        <ScoreBox label="FA Weight" value={sub.faWeight} max={20} color={C.gold} highlight />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ScoreBox label="SA1" value={sub.sa1} max={80} color={C.teal} wide />
                        <ScoreBox label="Half Year" value={sub.halfYear} max={100} color={gradeCol} wide highlight />
                      </View>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ScoreBox label="FA1" value={sub.fa1} max={20} color={col} />
                        <ScoreBox label="FA2" value={sub.fa2} max={20} color={col} />
                        <ScoreBox label="FA3" value={sub.fa3} max={20} color={col} />
                        <ScoreBox label="FA4" value={sub.fa4} max={20} color={col} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ScoreBox label="SA1" value={sub.sa1} max={80} color={C.teal} />
                        <ScoreBox label="SA2" value={sub.sa2} max={80} color={C.teal} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ScoreBox label="FA Wt" value={sub.faWeight} max={40} color={C.gold} wide />
                        <ScoreBox label="SA Wt" value={sub.saWeight} max={60} color={C.purple} wide />
                        <ScoreBox label="Final" value={sub.final} max={100} color={gradeCol} wide highlight />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={{
              marginTop: 8, padding: 14, backgroundColor: C.navyMid,
              borderRadius: 14, borderWidth: 1, borderColor: C.border,
            }}>
              <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 }}>
                CCE Grading: A1 (≥91) · A2 (≥81) · B1 (≥71) · B2 (≥61) · C1 (≥51) · C2 (≥41) · D (≥35) · E ({'<'}35)
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

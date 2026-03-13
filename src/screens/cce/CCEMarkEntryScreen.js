import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { C } from '../../theme/colors';
import { apiFetch } from '../../api/client';
import {
  getFAGrade, isSAExam, isFAExam, getPrecedingFAs,
  calcHalfYear, MAX_MARKS,
} from '../../helpers/cceGradingMobile';

const GRADE_BG = { A1:'#059669', A2:'#10b981', B1:'#3b82f6', B2:'#6366f1', C1:'#f59e0b', C2:'#f97316', D:'#ef4444', E:'#dc2626' };

export default function CCEMarkEntryScreen({ onBack, params = {} }) {
  const { academicYear, classId, className, section, subjectId, examType } = params;
  const maxM = MAX_MARKS[examType] || 20;
  const isSA = isSAExam(examType);
  const precedingFAs = getPrecedingFAs(examType);
  const isSA1 = examType === 'SA1';

  const [students, setStudents] = useState([]);
  const [marks, setMarks]       = useState({});
  const [faMarks, setFaMarks]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [saveStatus, setSaveStatus] = useState({});
  const timers  = useRef({});
  const inputs  = useRef({});

  useEffect(() => {
    loadAll();
    return () => Object.values(timers.current).forEach(clearTimeout);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [studRes, marksRes] = await Promise.all([
        apiFetch(`/students/list?classId=${encodeURIComponent(classId)}`).then(r => r.json()),
        apiFetch(`/cce/marks?academicYear=${encodeURIComponent(academicYear)}&classId=${encodeURIComponent(classId)}&section=${encodeURIComponent(section || '')}&subjectId=${encodeURIComponent(subjectId)}&examType=${encodeURIComponent(examType)}`).then(r => r.json()),
      ]);

      const studs = (studRes.students || []).sort((a, b) => (a.studentName || a.name || '').localeCompare(b.studentName || b.name || ''));
      setStudents(studs);

      const marksMap = {};
      for (const m of (marksRes.marks || [])) marksMap[m.studentId] = String(m.marks ?? '');
      setMarks(marksMap);

      if (isSA && precedingFAs.length) {
        const faData = {};
        await Promise.all(precedingFAs.map(async fa => {
          const r = await apiFetch(`/cce/marks?academicYear=${encodeURIComponent(academicYear)}&classId=${encodeURIComponent(classId)}&section=${encodeURIComponent(section || '')}&subjectId=${encodeURIComponent(subjectId)}&examType=${fa}`).then(x => x.json());
          for (const m of (r.marks || [])) {
            faData[m.studentId] = faData[m.studentId] || {};
            faData[m.studentId][fa] = m.marks;
          }
        }));
        setFaMarks(faData);
      }
    } catch (e) {
      console.warn('CCEMarkEntry load error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const autoSave = useCallback((studentId, rawValue) => {
    clearTimeout(timers.current[studentId]);
    const n = parseFloat(rawValue);
    if (rawValue === '' || isNaN(n) || n < 0 || n > maxM) return;

    timers.current[studentId] = setTimeout(async () => {
      try {
        const res = await apiFetch('/cce/marks', {
          method: 'POST',
          body: JSON.stringify({ studentId, subjectId, examType, marks: n, academicYear, classId, section: section || '' }),
        });
        if (res.ok) {
          setSaveStatus(p => ({ ...p, [studentId]: 'saved' }));
          setTimeout(() => setSaveStatus(p => { const x = { ...p }; delete x[studentId]; return x; }), 1500);
        }
      } catch (_) {}
    }, 600);
  }, [academicYear, classId, section, subjectId, examType, maxM]);

  const onChangeMark = (studentId, val) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setMarks(p => ({ ...p, [studentId]: cleaned }));
    autoSave(studentId, cleaned);
  };

  const gradeFor = (val) => {
    const n = parseFloat(val);
    if (isNaN(n) || val === '') return null;
    if (isFAExam(examType)) return getFAGrade(n);
    return null;
  };

  const renderStudent = ({ item, index }) => {
    const sid      = item.studentId || item.id;
    const name     = item.studentName || item.name || '';
    const val      = marks[sid] ?? '';
    const n        = parseFloat(val);
    const isValid  = val === '' || (!isNaN(n) && n >= 0 && n <= maxM);
    const grade    = gradeFor(val);
    const status   = saveStatus[sid];

    const fa1 = faMarks[sid]?.[precedingFAs[0]];
    const fa2 = faMarks[sid]?.[precedingFAs[1]];
    const faTotal = (isSA && fa1 !== undefined && fa2 !== undefined)
      ? (Number(fa1) + Number(fa2)) : null;

    let hyPreview = null;
    if (isSA1 && fa1 !== undefined && fa2 !== undefined && val !== '' && !isNaN(n)) {
      const h = calcHalfYear(fa1, fa2, n);
      hyPreview = h.halfYear;
    }

    return (
      <View style={[st.row, index % 2 === 0 ? st.rowEven : {}]}>
        <Text style={st.rowNum}>{index + 1}</Text>
        <Text style={st.rowName} numberOfLines={2}>{name}</Text>

        {isSA && (
          <>
            <View style={st.faCol}>
              <Text style={st.faVal}>{fa1 !== undefined ? fa1 : '—'}</Text>
              <Text style={st.faVal}>{fa2 !== undefined ? fa2 : '—'}</Text>
            </View>
            <Text style={[st.faTotal, { color: faTotal !== null ? '#60a5fa' : C.muted }]}>
              {faTotal !== null ? faTotal : '—'}
            </Text>
          </>
        )}

        <View style={st.inputWrap}>
          <TextInput
            ref={r => { inputs.current[sid] = r; }}
            style={[st.input, !isValid && val !== '' && st.inputErr]}
            value={val}
            onChangeText={v => onChangeMark(sid, v)}
            keyboardType="numeric"
            placeholder="—"
            placeholderTextColor={C.muted}
            maxLength={5}
          />
          {status === 'saved' && <Text style={st.saved}>✓</Text>}
        </View>

        {grade && (
          <View style={[st.badge, { backgroundColor: GRADE_BG[grade.grade] || C.border }]}>
            <Text style={st.badgeText}>{grade.grade}</Text>
          </View>
        )}

        {isSA1 && (
          <Text style={[st.hyPrev, { color: hyPreview !== null ? '#22d38a' : C.muted }]}>
            {hyPreview !== null ? hyPreview : '—'}
          </Text>
        )}
      </View>
    );
  };

  const header = (
    <View>
      <View style={st.tableHeader}>
        <Text style={[st.th, { width: 28 }]}>#</Text>
        <Text style={[st.th, { flex: 1 }]}>Student</Text>
        {isSA && <Text style={[st.th, { width: 60 }]}>{precedingFAs.join('\n')}</Text>}
        {isSA && <Text style={[st.th, { width: 40 }]}>FA Tot</Text>}
        <Text style={[st.th, { width: 56 }]}>/{maxM}</Text>
        {isFAExam(examType) && <Text style={[st.th, { width: 36 }]}>Grd</Text>}
        {isSA1 && <Text style={[st.th, { width: 44 }]}>HY</Text>}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>{examType} — {subjectId}</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Class {className} · Max {maxM} · {academicYear}</Text>
        </View>
        <TouchableOpacity onPress={loadAll} style={st.refreshBtn}>
          <Text style={{ color: C.teal, fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={{ color: C.muted, marginTop: 12 }}>Loading students...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🎓</Text>
          <Text style={{ color: C.white, fontWeight: '700' }}>No students found</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Import students first from Manage Users</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s, i) => s.studentId || s.id || String(i)}
          renderItem={renderStudent}
          ListHeaderComponent={header}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={st.footer}>
        <Text style={{ color: C.muted, fontSize: 12 }}>
          {students.length} students · Auto-saves on entry
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22d38a' }} />
          <Text style={{ color: C.muted, fontSize: 12 }}>Auto-save on</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.navy },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 50, backgroundColor: C.navyMid, borderBottomWidth: 1, borderColor: C.border },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  refreshBtn:  { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f2957', padding: 10, paddingHorizontal: 12 },
  th:          { fontSize: 10, fontWeight: '700', color: C.muted, textAlign: 'center', textTransform: 'uppercase' },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: C.border + '55' },
  rowEven:     { backgroundColor: C.navyMid + '66' },
  rowNum:      { width: 28, fontSize: 12, color: C.muted, textAlign: 'center' },
  rowName:     { flex: 1, fontSize: 13, color: C.white, fontWeight: '500' },
  faCol:       { width: 60, alignItems: 'center' },
  faVal:       { fontSize: 11, color: C.muted, textAlign: 'center' },
  faTotal:     { width: 40, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  inputWrap:   { width: 56, flexDirection: 'row', alignItems: 'center', gap: 2 },
  input:       { flex: 1, backgroundColor: C.navyMid, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },
  inputErr:    { borderColor: '#ef4444' },
  saved:       { color: '#22d38a', fontSize: 14, fontWeight: '700' },
  badge:       { width: 32, borderRadius: 6, paddingVertical: 3, alignItems: 'center' },
  badgeText:   { color: '#fff', fontSize: 10, fontWeight: '800' },
  hyPrev:      { width: 44, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingHorizontal: 16, backgroundColor: C.navyMid, borderTopWidth: 1, borderColor: C.border },
});

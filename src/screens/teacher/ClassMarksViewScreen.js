import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, FlatList,
} from 'react-native';
import { C } from '../../theme/colors';
import Toast from '../../components/Toast';
import { apiFetch } from '../../api/client';
import { getFAGrade, getSAGrade, MAX_MARKS } from '../../helpers/cceGradingMobile';

const GRADE_BG = { A1:'#059669', A2:'#10b981', B1:'#3b82f6', B2:'#6366f1', C1:'#f59e0b', C2:'#f97316', D:'#ef4444', E:'#dc2626' };
const EXAM_TYPES = ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2'];

function getAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function gradeFor(marks, examType) {
  if (marks === undefined || marks === null) return null;
  const n = Number(marks);
  if (isNaN(n)) return null;
  if (['FA1','FA2','FA3','FA4'].includes(examType)) return getFAGrade(n)?.grade || null;
  if (['SA1','SA2'].includes(examType)) return getSAGrade(n, MAX_MARKS[examType])?.grade || null;
  return null;
}

function ClassSelector({ classes, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={drop.btn} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={drop.label} numberOfLines={1}>{selected || 'Select Class'}</Text>
        <Text style={drop.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={drop.menu}>
          <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
            {classes.map(cls => (
              <TouchableOpacity
                key={cls.id || cls.name}
                style={[drop.option, selected === (cls.id || cls.name) && drop.optionActive]}
                onPress={() => { onSelect(cls); setOpen(false); }}
              >
                <Text style={[drop.optText, selected === (cls.id || cls.name) && drop.optTextActive]}>
                  {cls.name || cls.className || cls.id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function ExamSelector({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={drop.btn} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={drop.label}>{selected || 'Exam Type'}</Text>
        <Text style={drop.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={drop.menu}>
          {EXAM_TYPES.map(et => (
            <TouchableOpacity
              key={et}
              style={[drop.option, selected === et && drop.optionActive]}
              onPress={() => { onSelect(et); setOpen(false); }}
            >
              <Text style={[drop.optText, selected === et && drop.optTextActive]}>{et}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ClassMarksViewScreen({ onBack, currentUser }) {
  const [classes, setClasses]       = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClass, setSelectedClass]   = useState(null);
  const [selectedExam, setSelectedExam]     = useState('');
  const [tableData, setTableData]   = useState(null);
  const [fetching, setFetching]     = useState(false);
  const [toast, setToast]           = useState({ visible: false, message: '', type: 'info' });
  const academicYear = getAcademicYear();

  const showToast = (message, type = 'info') => setToast({ visible: true, message, type });

  React.useEffect(() => {
    apiFetch('/classes')
      .then(r => r.json())
      .then(d => setClasses(d.classes || []))
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }, []);

  const loadTable = useCallback(async (cls, exam) => {
    if (!cls || !exam) return;
    setFetching(true);
    setTableData(null);
    try {
      const classId = cls.id || cls.name;
      const res = await apiFetch(
        `/cce/marks/class?classId=${encodeURIComponent(classId)}&examType=${encodeURIComponent(exam)}&academicYear=${encodeURIComponent(academicYear)}`
      );
      const data = await res.json();
      if (res.ok) {
        setTableData(data);
      } else {
        showToast(data.error || 'Failed to load marks', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setFetching(false);
    }
  }, [academicYear]);

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setTableData(null);
    if (selectedExam) loadTable(cls, selectedExam);
  };

  const handleExamSelect = (exam) => {
    setSelectedExam(exam);
    setTableData(null);
    if (selectedClass) loadTable(selectedClass, exam);
  };

  const subjects = tableData?.subjects || [];
  const students = tableData?.students || [];
  const maxM     = tableData?.maxMarks || 0;

  const averages = subjects.map(sub => {
    const vals = students.map(s => s.marks[sub]).filter(v => v !== undefined && v !== null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1);
  });

  const className = selectedClass?.name || selectedClass?.className || selectedClass?.id || '';

  const COL_NAME_W = 130;
  const COL_W      = 72;

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>
            {tableData
              ? `${className} — ${selectedExam} — ${academicYear}`
              : 'Class Marks View'}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>View only · Select class and exam</Text>
        </View>
        <TouchableOpacity
          onPress={() => showToast('Export coming soon', 'info')}
          style={st.exportBtn}
        >
          <Text style={{ color: C.gold, fontSize: 13, fontWeight: '700' }}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Selectors */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 0, zIndex: 20 }}>
        {classesLoading ? (
          <View style={[drop.btn, { flex: 1 }]}>
            <ActivityIndicator size="small" color={C.muted} />
          </View>
        ) : (
          <ClassSelector
            classes={classes}
            selected={className}
            onSelect={handleClassSelect}
          />
        )}
        <ExamSelector selected={selectedExam} onSelect={handleExamSelect} />
      </View>

      {/* Loading */}
      {fetching && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={{ color: C.muted, marginTop: 12 }}>Loading marks...</Text>
        </View>
      )}

      {/* Empty state */}
      {!fetching && !tableData && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ fontSize: 48 }}>📊</Text>
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>Select class and exam</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>Marks table will appear here</Text>
        </View>
      )}

      {/* Table */}
      {!fetching && tableData && (
        <View style={{ flex: 1, marginTop: 12 }}>
          {/* Fixed table head */}
          <View style={st.tableWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Header row */}
                <View style={[st.row, st.headRow]}>
                  <Text style={[st.cell, st.nameCell, st.headCell]}>Student</Text>
                  {subjects.map(sub => (
                    <View key={sub} style={[st.cell, { width: COL_W, alignItems: 'center' }]}>
                      <Text style={[st.headCell, { textAlign: 'center' }]} numberOfLines={2}>{sub}</Text>
                    </View>
                  ))}
                </View>

                {/* Student rows */}
                <ScrollView style={{ flex: 1 }}>
                  {students.length === 0 ? (
                    <View style={{ padding: 30, alignItems: 'center' }}>
                      <Text style={{ color: C.muted }}>No students found for this class</Text>
                    </View>
                  ) : (
                    students.map((s, idx) => (
                      <View key={s.studentId} style={[st.row, idx % 2 === 0 && st.rowEven]}>
                        <Text style={[st.cell, st.nameCell, { color: C.white, fontSize: 13 }]} numberOfLines={1}>
                          {s.studentName || s.studentId}
                        </Text>
                        {subjects.map(sub => {
                          const m = s.marks[sub];
                          const g = gradeFor(m, selectedExam);
                          return (
                            <View key={sub} style={[st.cell, { width: COL_W, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }]}>
                              {m !== undefined ? (
                                <>
                                  <Text style={{ color: C.white, fontSize: 13, fontWeight: '600' }}>{m}</Text>
                                  {g && (
                                    <View style={[st.gradeBadge, { backgroundColor: GRADE_BG[g] || C.border }]}>
                                      <Text style={st.gradeText}>{g}</Text>
                                    </View>
                                  )}
                                </>
                              ) : (
                                <Text style={{ color: C.muted, fontSize: 13 }}>—</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))
                  )}

                  {/* Average row */}
                  {students.length > 0 && (
                    <View style={[st.row, st.avgRow]}>
                      <Text style={[st.cell, st.nameCell, { color: C.gold, fontWeight: '800', fontSize: 12 }]}>
                        Class Avg
                      </Text>
                      {averages.map((avg, i) => (
                        <View key={subjects[i]} style={[st.cell, { width: COL_W, alignItems: 'center' }]}>
                          <Text style={{ color: avg !== null ? C.gold : C.muted, fontWeight: '700', fontSize: 12 }}>
                            {avg !== null ? avg : '—'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            </ScrollView>
          </View>

          {/* Summary footer */}
          <View style={st.footer}>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {students.length} students · {subjects.length} subjects · Max {maxM}
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>View only</Text>
          </View>
        </View>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.navy },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 50, backgroundColor: C.navyMid, borderBottomWidth: 1, borderColor: C.border },
  backBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 15, fontWeight: '700', color: C.white },
  exportBtn:  { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.gold + '55' },
  tableWrap:  { flex: 1 },
  row:        { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: C.border + '44', minHeight: 46 },
  rowEven:    { backgroundColor: C.navyMid + '55' },
  headRow:    { backgroundColor: '#0f2957', borderBottomWidth: 2, borderColor: C.teal + '55' },
  avgRow:     { backgroundColor: '#1a2f4a', borderTopWidth: 2, borderColor: C.gold + '44' },
  cell:       { paddingHorizontal: 10, paddingVertical: 8 },
  nameCell:   { width: 130, borderRightWidth: 1, borderColor: C.border },
  headCell:   { color: C.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  gradeBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  gradeText:  { color: '#fff', fontSize: 9, fontWeight: '800' },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingHorizontal: 16, backgroundColor: C.navyMid, borderTopWidth: 1, borderColor: C.border },
});

const drop = StyleSheet.create({
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  label:       { color: C.white, fontSize: 14, fontWeight: '600', flex: 1 },
  arrow:       { color: C.muted, fontSize: 12, marginLeft: 6 },
  menu:        { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#0f2348', borderWidth: 1, borderColor: C.border, borderRadius: 12, marginTop: 4, zIndex: 100, overflow: 'hidden' },
  option:      { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: C.border + '44' },
  optionActive:{ backgroundColor: C.teal + '22' },
  optText:     { color: C.white, fontSize: 14 },
  optTextActive:{ color: C.teal, fontWeight: '700' },
});

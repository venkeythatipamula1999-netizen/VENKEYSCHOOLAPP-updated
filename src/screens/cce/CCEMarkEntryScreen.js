import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Modal, Alert,
} from 'react-native';
import { C } from '../../theme/colors';
import Toast from '../../components/Toast';
import { apiFetch } from '../../api/client';
import {
  getFAGrade, isSAExam, isFAExam, getPrecedingFAs,
  calcHalfYear, MAX_MARKS, SUBJECTS,
} from '../../helpers/cceGradingMobile';

const GRADE_BG = { A1:'#059669', A2:'#10b981', B1:'#3b82f6', B2:'#6366f1', C1:'#f59e0b', C2:'#f97316', D:'#ef4444', E:'#dc2626' };
const EXAM_TYPES_ALL = ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2'];
const MIN_REASON_LEN = 10;

function ViewOnlySubjectCard({ subjectId, academicYear, classId, section, students }) {
  const [expanded, setExpanded]   = useState(false);
  const [subMarks, setSubMarks]   = useState({});
  const [loading, setLoading]     = useState(false);
  const [loaded, setLoaded]       = useState(false);

  const load = async () => {
    if (loaded) { setExpanded(e => !e); return; }
    setExpanded(true);
    setLoading(true);
    try {
      const results = await Promise.all(
        EXAM_TYPES_ALL.map(et =>
          apiFetch(`/cce/marks?academicYear=${encodeURIComponent(academicYear)}&classId=${encodeURIComponent(classId)}&section=${encodeURIComponent(section || '')}&subjectId=${encodeURIComponent(subjectId)}&examType=${et}`)
            .then(r => r.json())
            .then(d => ({ et, marks: d.marks || [] }))
            .catch(() => ({ et, marks: [] }))
        )
      );
      const map = {};
      for (const { et, marks } of results) {
        for (const m of marks) {
          map[m.studentId] = map[m.studentId] || {};
          map[m.studentId][et] = m.marks;
        }
      }
      setSubMarks(map);
      setLoaded(true);
    } catch (_) {}
    finally { setLoading(false); }
  };

  return (
    <View style={vst.card}>
      <TouchableOpacity style={vst.header} onPress={load} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={vst.icon}>👁 View Only</Text>
          <Text style={vst.title}>{subjectId}</Text>
        </View>
        {loading
          ? <ActivityIndicator size="small" color={C.muted} />
          : <Text style={{ color: C.muted, fontSize: 16 }}>{expanded ? '▲' : '▼'}</Text>
        }
      </TouchableOpacity>

      {expanded && !loading && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={vst.tableHead}>
              <Text style={[vst.th, vst.nameW]}>Student</Text>
              {EXAM_TYPES_ALL.map(et => (
                <Text key={et} style={vst.th}>{et}</Text>
              ))}
            </View>
            {students.map((s, i) => {
              const sid = s.studentId || s.id;
              const row = subMarks[sid] || {};
              return (
                <View key={sid} style={[vst.row, i % 2 === 0 && vst.rowEven]}>
                  <Text style={[vst.td, vst.nameW]} numberOfLines={1}>{s.studentName || s.name}</Text>
                  {EXAM_TYPES_ALL.map(et => (
                    <Text key={et} style={[vst.td, { color: row[et] !== undefined ? C.white : C.muted }]}>
                      {row[et] !== undefined ? row[et] : '—'}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

export default function CCEMarkEntryScreen({ onBack, params = {} }) {
  const { academicYear, classId, className, section, subjectId, examType, assignedSubjects, isAdmin } = params;
  const maxM = MAX_MARKS[examType] || 20;
  const isSA = isSAExam(examType);
  const precedingFAs = getPrecedingFAs(examType);
  const isSA1 = examType === 'SA1';

  // "View Only" other subjects — only shown for admins/principals, not regular teachers
  const otherSubjects = isAdmin
    ? SUBJECTS.filter(s => s !== subjectId && (!assignedSubjects || !assignedSubjects.includes(s)))
    : []; // Teachers cannot view other subjects' marks either


  const [students, setStudents]     = useState([]);
  const [marks, setMarks]           = useState({});
  const [faMarks, setFaMarks]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Edit-reason modal state
  const [editModal, setEditModal]   = useState({ visible: false, studentId: null, pendingValue: null, previousValue: null });
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const reasonInputRef = useRef(null);

  // savedMarkValues tracks which students already have marks in Firestore
  const savedMarkValues = useRef({});

  const inputs = useRef({});

  useEffect(() => {
    loadAll();
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
      savedMarkValues.current = {};
      for (const m of (marksRes.marks || [])) {
        marksMap[m.studentId] = String(m.marks ?? '');
        savedMarkValues.current[m.studentId] = m.marks;
      }
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

  // Called when user types in a mark field
  const onChangeMark = (studentId, val) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const alreadySaved = savedMarkValues.current[studentId] !== undefined;
    if (alreadySaved) {
      // Allow editing in the field, then intercept on valid value to show reason modal
      setMarks(p => ({ ...p, [studentId]: cleaned }));
      const n = parseFloat(cleaned);
      if (cleaned !== '' && !isNaN(n) && n >= 0 && n <= maxM) {
        // Debounce to avoid opening modal mid-typing
        clearTimeout(inputs.current[`timer_${studentId}`]);
        inputs.current[`timer_${studentId}`] = setTimeout(() => {
          setEditModal({
            visible:       true,
            studentId,
            pendingValue:  n,
            previousValue: savedMarkValues.current[studentId],
          });
          setEditReason('');
          setTimeout(() => reasonInputRef.current?.focus(), 200);
        }, 800);
      }
    } else {
      // Not yet saved — just update local state. Submit button will send it.
      setMarks(p => ({ ...p, [studentId]: cleaned }));
    }
  };

  const cancelEdit = () => {
    const { studentId, previousValue } = editModal;
    clearTimeout(inputs.current[`timer_${studentId}`]);
    setMarks(p => ({ ...p, [studentId]: previousValue !== undefined ? String(previousValue) : '' }));
    setEditModal({ visible: false, studentId: null, pendingValue: null, previousValue: null });
    setEditReason('');
  };

  const confirmEdit = async () => {
    const { studentId, pendingValue } = editModal;
    if (!editReason || editReason.trim().length < MIN_REASON_LEN) return;

    setEditSaving(true);
    try {
      // Find student name for the notification
      const studentObj = students.find(s => (s.studentId || s.id) === studentId);
      const studentName = studentObj?.studentName || studentObj?.name || studentId;

      const res = await apiFetch('/cce/marks', {
        method: 'PUT',
        body: JSON.stringify({
          studentId, subjectId, examType,
          marks: pendingValue, academicYear, classId,
          section: section || '',
          reason: editReason.trim(),
          teacherName: params?.teacherName || '',  // passed from nav params if available
          studentName,
        }),
      });
      if (res.ok) {
        savedMarkValues.current[studentId] = pendingValue;
        setMarks(p => ({ ...p, [studentId]: String(pendingValue) }));
        setEditModal({ visible: false, studentId: null, pendingValue: null, previousValue: null });
        setEditReason('');
        showToast('Mark updated successfully ✅', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to update mark', 'error');
      }
    } catch (e) {
      showToast('Network error updating mark', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // Collect all unsaved marks that are valid
  const getUnsavedEntries = useCallback(() => {
    return students.reduce((arr, item) => {
      const sid = item.studentId || item.id;
      const val = marks[sid] ?? '';
      const n   = parseFloat(val);
      const alreadySaved = savedMarkValues.current[sid] !== undefined;
      if (!alreadySaved && val !== '' && !isNaN(n) && n >= 0 && n <= maxM) {
        arr.push({ studentId: sid, marks: n });
      }
      return arr;
    }, []);
  }, [students, marks, maxM]);

  const handleSubmit = () => {
    const entries = getUnsavedEntries();
    if (entries.length === 0) {
      showToast('No new marks to submit', 'info');
      return;
    }
    Alert.alert(
      'Submit Marks',
      `Submit ${entries.length} mark${entries.length > 1 ? 's' : ''} for ${subjectId} — Class ${className}?\n\nOnce submitted, any changes will require a reason.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: () => doSubmit(entries),
        },
      ]
    );
  };

  const doSubmit = async (entries) => {
    setSubmitting(true);
    try {
      const res = await apiFetch('/cce/marks/bulk', {
        method: 'POST',
        body: JSON.stringify({
          entries,
          subjectId, examType, academicYear, classId,
          section: section || '',
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // Mark all submitted entries as saved
        for (const e of entries) {
          savedMarkValues.current[e.studentId] = e.marks;
        }
        // Force re-render to reflect locked state
        setMarks(p => ({ ...p }));
        showToast(`Marks submitted successfully ✅ (${data.count ?? entries.length} saved)`, 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to submit marks', 'error');
      }
    } catch (e) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const gradeFor = (val) => {
    const n = parseFloat(val);
    if (isNaN(n) || val === '') return null;
    if (isFAExam(examType)) return getFAGrade(n);
    return null;
  };

  const renderStudent = ({ item, index }) => {
    const sid        = item.studentId || item.id;
    const name       = item.studentName || item.name || '';
    const val        = marks[sid] ?? '';
    const n          = parseFloat(val);
    const isValid    = val === '' || (!isNaN(n) && n >= 0 && n <= maxM);
    const grade      = gradeFor(val);
    const isSaved    = savedMarkValues.current[sid] !== undefined;

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
          {isSaved ? (
            // Saved mark — locked display
            <View style={st.lockedBadge}>
              <Text style={st.lockedVal}>{val}</Text>
              <Text style={st.savedCheck}>✓</Text>
            </View>
          ) : (
            // Unsaved mark — editable
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
          )}
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

  const tableHeader = (
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

  const listFooter = otherSubjects.length > 0 ? (
    <View style={{ padding: 16, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700' }}>OTHER SUBJECTS (VIEW ONLY)</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>
      {otherSubjects.map(sub => (
        <ViewOnlySubjectCard
          key={sub}
          subjectId={sub}
          academicYear={academicYear}
          classId={classId}
          section={section}
          students={students}
        />
      ))}
    </View>
  ) : null;

  const unsavedCount  = getUnsavedEntries().length;
  const reasonValid   = editReason.trim().length >= MIN_REASON_LEN;

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
          ListHeaderComponent={tableHeader}
          ListFooterComponent={listFooter}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* ── Submit Marks Bar ── */}
      {!loading && students.length > 0 && (
        <View style={st.submitBar}>
          <View>
            <Text style={{ color: C.white, fontSize: 13, fontWeight: '700' }}>
              {unsavedCount > 0 ? `${unsavedCount} unsaved mark${unsavedCount > 1 ? 's' : ''}` : 'All marks saved'}
            </Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
              Tap submit to save · Edits require a reason
            </Text>
          </View>
          <TouchableOpacity
            style={[st.submitBtn, (unsavedCount === 0 || submitting) && st.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={unsavedCount === 0 || submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color={C.white} />
              : <Text style={st.submitBtnText}>Submit Marks</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* ── Edit Reason Modal ── */}
      <Modal
        visible={editModal.visible}
        transparent
        animationType="slide"
        onRequestClose={cancelEdit}
      >
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />

            <Text style={modal.title}>Why are you editing this mark?</Text>
            <Text style={modal.subtitle}>
              {subjectId} · {examType} · Previous: {editModal.previousValue ?? '—'} → New: {editModal.pendingValue ?? '—'}
            </Text>

            <TextInput
              ref={reasonInputRef}
              style={[modal.input, reasonValid && modal.inputValid]}
              placeholder="Enter reason (min 10 characters)..."
              placeholderTextColor={C.muted}
              value={editReason}
              onChangeText={setEditReason}
              multiline
              numberOfLines={3}
              maxLength={300}
              autoCapitalize="sentences"
            />

            <Text style={[modal.counter, { color: reasonValid ? '#22d38a' : C.muted }]}>
              {editReason.trim().length} / {MIN_REASON_LEN} min characters
            </Text>

            <View style={modal.actions}>
              <TouchableOpacity style={modal.cancelBtn} onPress={cancelEdit} disabled={editSaving}>
                <Text style={modal.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modal.confirmBtn, !reasonValid && modal.confirmDisabled]}
                onPress={confirmEdit}
                disabled={!reasonValid || editSaving}
              >
                {editSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={modal.confirmText}>Confirm Edit</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.navy },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 50, backgroundColor: C.navyMid, borderBottomWidth: 1, borderColor: C.border },
  backBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: C.white },
  refreshBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  tableHeader:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f2957', padding: 10, paddingHorizontal: 12 },
  th:           { fontSize: 10, fontWeight: '700', color: C.muted, textAlign: 'center', textTransform: 'uppercase' },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: C.border + '55' },
  rowEven:      { backgroundColor: C.navyMid + '66' },
  rowNum:       { width: 28, fontSize: 12, color: C.muted, textAlign: 'center' },
  rowName:      { flex: 1, fontSize: 13, color: C.white, fontWeight: '500' },
  faCol:        { width: 60, alignItems: 'center' },
  faVal:        { fontSize: 11, color: C.muted, textAlign: 'center' },
  faTotal:      { width: 40, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  inputWrap:    { width: 56, flexDirection: 'row', alignItems: 'center', gap: 2 },
  input:        { flex: 1, backgroundColor: C.navyMid, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },
  inputErr:     { borderColor: '#ef4444' },
  lockedBadge:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#14532d44', borderRadius: 8, borderWidth: 1.5, borderColor: '#22d38a55', paddingVertical: 6, gap: 3 },
  lockedVal:    { fontSize: 14, fontWeight: '700', color: '#22d38a', textAlign: 'center' },
  savedCheck:   { fontSize: 12, color: '#22d38a', fontWeight: '800' },
  badge:        { width: 32, borderRadius: 6, paddingVertical: 3, alignItems: 'center' },
  badgeText:    { color: '#fff', fontSize: 10, fontWeight: '800' },
  hyPrev:       { width: 44, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  submitBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingHorizontal: 16, backgroundColor: '#0f2348', borderTopWidth: 1.5, borderColor: C.teal + '55' },
  submitBtn:    { backgroundColor: C.teal, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, minWidth: 130, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#1a3c5e', opacity: 0.5 },
  submitBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },
});

const modal = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#0f2348', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:         { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:          { fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 6 },
  subtitle:       { fontSize: 13, color: C.muted, marginBottom: 18 },
  input:          { backgroundColor: '#162E50', borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 14, color: C.white, fontSize: 14, minHeight: 90, textAlignVertical: 'top' },
  inputValid:     { borderColor: '#22d38a' },
  counter:        { fontSize: 12, marginTop: 6, marginBottom: 20, textAlign: 'right' },
  actions:        { flexDirection: 'row', gap: 12 },
  cancelBtn:      { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  cancelText:     { color: C.muted, fontSize: 15, fontWeight: '700' },
  confirmBtn:     { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: C.teal, alignItems: 'center' },
  confirmDisabled:{ backgroundColor: '#1a3c5e', opacity: 0.6 },
  confirmText:    { color: C.white, fontSize: 15, fontWeight: '700' },
});

const vst = StyleSheet.create({
  card:    { backgroundColor: C.navyMid + 'CC', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  header:  { flexDirection: 'row', alignItems: 'center', padding: 14 },
  icon:    { fontSize: 10, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title:   { fontSize: 14, color: C.white, fontWeight: '700', marginTop: 2 },
  tableHead: { flexDirection: 'row', backgroundColor: C.navy, paddingVertical: 8, paddingHorizontal: 10 },
  th:      { width: 52, fontSize: 10, fontWeight: '700', color: C.muted, textAlign: 'center' },
  nameW:   { width: 120, textAlign: 'left' },
  row:     { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderColor: C.border + '44' },
  rowEven: { backgroundColor: C.navy + '88' },
  td:      { width: 52, fontSize: 12, color: C.white, textAlign: 'center' },
});

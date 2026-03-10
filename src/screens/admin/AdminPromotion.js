import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, Platform } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';
import Toast from '../../components/Toast';
import { getFriendlyError } from '../../utils/errorMessages';

const STEPS = ['Select Class', 'Preview', 'Confirm', 'Result'];

function getCurrentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 5) return `${y}-${String(y + 1).slice(2)}`;
  return `${y - 1}-${String(y).slice(2)}`;
}

export default function AdminPromotion({ onBack }) {
  const [step, setStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [classDropdown, setClassDropdown] = useState(false);

  const [students, setStudents] = useState([]);
  const [actions, setActions] = useState({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [confirmText, setConfirmText] = useState('');
  const [executing, setExecuting] = useState(false);

  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });

  useEffect(() => {
    apiFetch('/classes')
      .then(r => r.json())
      .then(d => {
        if (d.success || Array.isArray(d)) {
          const list = (d.classes || d || []).map(c => c.name || c.className || c.id).filter(Boolean).sort();
          setClasses(list);
        }
      })
      .catch(() => {});
  }, []);

  const loadPreview = async () => {
    if (!selectedClass) { showToast('Please select a class'); return; }
    if (!academicYear.trim()) { showToast('Academic year is required'); return; }
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const resp = await apiFetch(`/admin/promotion/preview?fromClass=${encodeURIComponent(selectedClass)}&academicYear=${encodeURIComponent(academicYear.trim())}`);
      const d = await resp.json();
      if (!resp.ok || !d.success) throw new Error(d.error || 'Failed to load preview');
      setStudents(d.students || []);
      const defaultActions = {};
      (d.students || []).forEach(s => {
        defaultActions[s.studentId] = s.passStatus === 'pass' ? 'promote' : 'retain';
      });
      setActions(defaultActions);
      setStep(1);
    } catch (e) {
      setPreviewError(getFriendlyError(e, 'Failed to load student data'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const summary = {
    promoted: Object.values(actions).filter(a => a === 'promote').length,
    retained: Object.values(actions).filter(a => a === 'retain').length,
    graduated: Object.values(actions).filter(a => a === 'graduate').length,
  };

  const executePromotion = async () => {
    setExecuting(true);
    try {
      const promotions = Object.entries(actions).map(([studentId, action]) => ({ studentId, action }));
      const resp = await apiFetch('/admin/promotion/execute', {
        method: 'POST',
        body: JSON.stringify({ promotions, academicYear: academicYear.trim() }),
      });
      const d = await resp.json();
      if (!resp.ok || !d.success) throw new Error(d.error || 'Promotion failed');
      setResult(d.results);
      setStep(3);
    } catch (e) {
      showToast(getFriendlyError(e, 'Promotion failed — please try again'));
    } finally {
      setExecuting(false);
    }
  };

  const exportCSV = () => {
    const rows = [['Student ID', 'Name', 'Roll Number', 'Action', 'Class', 'Average Marks', 'Attendance %']];
    students.forEach(s => {
      rows.push([s.studentId, s.name, s.rollNumber, actions[s.studentId] || '', s.className, s.averageMarks, s.attendancePercent]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promotion-log-${selectedClass.replace(/\s+/g, '_')}-${academicYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    showToast('CSV exported!', 'success');
  };

  const renderStepIndicator = () => (
    <View style={st.stepRow}>
      {STEPS.map((label, i) => (
        <View key={label} style={{ flex: 1, alignItems: 'center' }}>
          <View style={[st.stepDot, step >= i && { backgroundColor: C.purple }]}>
            <Text style={{ color: step >= i ? C.white : C.muted, fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
          </View>
          <Text style={{ color: step >= i ? C.white : C.muted, fontSize: 9, marginTop: 4 }}>{label}</Text>
        </View>
      ))}
    </View>
  );

  const renderStep0 = () => (
    <View style={{ padding: 20 }}>
      <Text style={st.label}>Select Class</Text>
      <TouchableOpacity style={st.dropdown} onPress={() => setClassDropdown(!classDropdown)}>
        <Text style={{ color: selectedClass ? C.white : C.muted, flex: 1 }}>{selectedClass || 'Choose a class...'}</Text>
        <Icon name="arrow" size={12} color={C.muted} style={{ transform: [{ rotate: classDropdown ? '-90deg' : '90deg' }] }} />
      </TouchableOpacity>
      {classDropdown && (
        <View style={st.dropdownList}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {classes.map(c => (
              <TouchableOpacity
                key={c}
                style={[st.dropdownItem, selectedClass === c && { backgroundColor: C.purple + '22' }]}
                onPress={() => { setSelectedClass(c); setClassDropdown(false); }}
              >
                <Text style={{ color: selectedClass === c ? C.purple : C.white, fontSize: 14 }}>{c}</Text>
              </TouchableOpacity>
            ))}
            {classes.length === 0 && <Text style={{ color: C.muted, padding: 12 }}>No classes found</Text>}
          </ScrollView>
        </View>
      )}

      <Text style={[st.label, { marginTop: 18 }]}>Academic Year</Text>
      <TextInput
        style={st.input}
        value={academicYear}
        onChangeText={setAcademicYear}
        placeholder="e.g. 2025-26"
        placeholderTextColor={C.muted}
      />

      {previewError ? <ErrorBanner message={previewError} onDismiss={() => setPreviewError('')} /> : null}

      <TouchableOpacity
        style={[st.primaryBtn, { marginTop: 24, opacity: previewLoading ? 0.6 : 1 }]}
        onPress={loadPreview}
        disabled={previewLoading}
      >
        {previewLoading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={st.primaryBtnText}>Load Students</Text>}
      </TouchableOpacity>
    </View>
  );

  const ACTION_OPTS = ['promote', 'retain', 'graduate'];
  const ACTION_COLORS = { promote: C.teal, retain: '#F59E0B', graduate: C.purple };

  const renderStep1 = () => (
    <View style={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>{selectedClass}</Text>
        <Text style={{ color: C.muted, fontSize: 12 }}>{students.length} student{students.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={st.legendRow}>
        <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: '#34D399' }]} /><Text style={st.legendText}>Pass</Text></View>
        <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: C.coral }]} /><Text style={st.legendText}>Fail</Text></View>
      </View>

      {students.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: C.muted, fontSize: 14 }}>No students found in this class.</Text>
        </View>
      ) : students.map(s => (
        <View key={s.studentId} style={st.studentCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={[st.statusDot, { backgroundColor: s.passStatus === 'pass' ? '#34D399' : C.coral }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>{s.name}</Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>Roll #{s.rollNumber || '—'} · Avg: {s.averageMarks}% · Att: {s.attendancePercent}%</Text>
            </View>
          </View>
          <View style={st.segmentRow}>
            {ACTION_OPTS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[st.segmentBtn, actions[s.studentId] === opt && { backgroundColor: ACTION_COLORS[opt], borderColor: ACTION_COLORS[opt] }]}
                onPress={() => setActions(prev => ({ ...prev, [s.studentId]: opt }))}
              >
                <Text style={{ color: actions[s.studentId] === opt ? C.white : C.muted, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <TouchableOpacity style={[st.secondaryBtn, { flex: 1 }]} onPress={() => setStep(0)}>
          <Text style={{ color: C.muted, fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.primaryBtn, { flex: 2 }]}
          onPress={() => { setConfirmText(''); setStep(2); }}
          disabled={students.length === 0}
        >
          <Text style={st.primaryBtnText}>Review & Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={{ padding: 20 }}>
      <Text style={{ color: C.white, fontWeight: '700', fontSize: 18, marginBottom: 18 }}>Confirm Promotion</Text>

      <View style={st.summaryCard}>
        <View style={st.summaryRow}>
          <View style={[st.summaryDot, { backgroundColor: C.teal }]} />
          <Text style={st.summaryLabel}>Promoted</Text>
          <Text style={[st.summaryVal, { color: C.teal }]}>{summary.promoted}</Text>
        </View>
        <View style={st.summaryRow}>
          <View style={[st.summaryDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={st.summaryLabel}>Retained</Text>
          <Text style={[st.summaryVal, { color: '#F59E0B' }]}>{summary.retained}</Text>
        </View>
        <View style={st.summaryRow}>
          <View style={[st.summaryDot, { backgroundColor: C.purple }]} />
          <Text style={st.summaryLabel}>Graduated</Text>
          <Text style={[st.summaryVal, { color: C.purple }]}>{summary.graduated}</Text>
        </View>
      </View>

      <View style={st.warningBox}>
        <Icon name="alert" size={18} color="#EF4444" />
        <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13, flex: 1 }}>This action cannot be undone. Student records will be permanently updated.</Text>
      </View>

      <Text style={[st.label, { marginTop: 18 }]}>Type CONFIRM to proceed</Text>
      <TextInput
        style={st.input}
        value={confirmText}
        onChangeText={setConfirmText}
        placeholder="CONFIRM"
        placeholderTextColor={C.muted}
        autoCapitalize="characters"
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <TouchableOpacity style={[st.secondaryBtn, { flex: 1 }]} onPress={() => setStep(1)} disabled={executing}>
          <Text style={{ color: C.muted, fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.dangerBtn, { flex: 2, opacity: confirmText !== 'CONFIRM' || executing ? 0.4 : 1 }]}
          onPress={executePromotion}
          disabled={confirmText !== 'CONFIRM' || executing}
        >
          {executing ? <ActivityIndicator size="small" color={C.white} /> : <Text style={{ color: C.white, fontWeight: '700' }}>Execute Promotion</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#34D399' + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Icon name="check" size={36} color="#34D399" />
      </View>
      <Text style={{ color: C.white, fontWeight: '700', fontSize: 20, marginBottom: 8 }}>Promotion Complete</Text>
      <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>{selectedClass} · {academicYear}</Text>

      <View style={st.summaryCard}>
        <View style={st.summaryRow}>
          <View style={[st.summaryDot, { backgroundColor: C.teal }]} />
          <Text style={st.summaryLabel}>Promoted</Text>
          <Text style={[st.summaryVal, { color: C.teal }]}>{result?.promoted || 0}</Text>
        </View>
        <View style={st.summaryRow}>
          <View style={[st.summaryDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={st.summaryLabel}>Retained</Text>
          <Text style={[st.summaryVal, { color: '#F59E0B' }]}>{result?.retained || 0}</Text>
        </View>
        <View style={st.summaryRow}>
          <View style={[st.summaryDot, { backgroundColor: C.purple }]} />
          <Text style={st.summaryLabel}>Graduated</Text>
          <Text style={[st.summaryVal, { color: C.purple }]}>{result?.graduated || 0}</Text>
        </View>
        {(result?.errors?.length || 0) > 0 && (
          <View style={st.summaryRow}>
            <View style={[st.summaryDot, { backgroundColor: C.coral }]} />
            <Text style={st.summaryLabel}>Errors</Text>
            <Text style={[st.summaryVal, { color: C.coral }]}>{result.errors.length}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={[st.primaryBtn, { marginTop: 20, width: '100%' }]} onPress={exportCSV}>
        <Icon name="download" size={16} color={C.white} />
        <Text style={[st.primaryBtnText, { marginLeft: 8 }]}>Export Log as CSV</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[st.secondaryBtn, { marginTop: 10, width: '100%' }]} onPress={onBack}>
        <Text style={{ color: C.muted, fontWeight: '600' }}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: 18, color: C.white, flex: 1 }}>Year-End Promotion</Text>
      </View>

      {renderStepIndicator()}

      <ScrollView style={{ flex: 1 }}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(t => ({ ...t, visible: false }))} />
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  stepRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  label: { color: C.muted, fontSize: 12, marginBottom: 6 },
  dropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.navyMid, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  dropdownList: { backgroundColor: C.navyMid, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  input: { backgroundColor: C.navyMid, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, color: C.white, fontSize: 14 },
  primaryBtn: { backgroundColor: C.purple, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  primaryBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },
  secondaryBtn: { backgroundColor: C.navyMid, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  dangerBtn: { backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  studentCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.navyMid },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: C.muted, fontSize: 11 },
  summaryCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 18, marginBottom: 16, width: '100%' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  summaryDot: { width: 10, height: 10, borderRadius: 5 },
  summaryLabel: { flex: 1, color: C.white, fontSize: 14 },
  summaryVal: { fontWeight: '800', fontSize: 20 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EF4444' + '15', borderWidth: 1, borderColor: '#EF4444' + '44', borderRadius: 12, padding: 14 },
});

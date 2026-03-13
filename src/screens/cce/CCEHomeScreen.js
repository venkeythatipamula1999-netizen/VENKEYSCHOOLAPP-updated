import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { C } from '../../theme/colors';
import { apiFetch } from '../../api/client';
import { SUBJECTS, VALID_EXAM_TYPES, ACADEMIC_YEARS } from '../../helpers/cceGradingMobile';

const SECTION_FROM_NAME = (name) => name.replace(/[^A-Za-z]/g, '').toUpperCase() || 'A';

export default function CCEHomeScreen({ onBack, onNavigate }) {
  const [classes, setClasses]       = useState([]);
  const [loadingClasses, setLoading] = useState(true);
  const [academicYear, setAcY]      = useState('2025-26');
  const [selectedClass, setClass]   = useState(null);
  const [subject, setSubject]       = useState(SUBJECTS[0]);
  const [examType, setExamType]     = useState('FA1');
  const [picker, setPicker]         = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    apiFetch('/classes')
      .then(r => r.json())
      .then(d => {
        const list = (d.classes || []).sort((a, b) => a.name.localeCompare(b.name));
        setClasses(list);
        if (list.length) setClass(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buildParams = () => ({
    academicYear,
    classId:   selectedClass?.id   || '',
    className: selectedClass?.name || '',
    section:   SECTION_FROM_NAME(selectedClass?.name || ''),
    subjectId: subject,
    examType,
  });

  const DropPicker = ({ title, options, value, onSelect, display }) => (
    <TouchableOpacity style={st.picker} onPress={() => setPicker({ title, options, onSelect, display, value })}>
      <Text style={st.pickerLabel}>{title}</Text>
      <View style={st.pickerRow}>
        <Text style={st.pickerVal}>{display ? display(value) : value}</Text>
        <Text style={{ color: C.muted }}>▾</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={st.headerTitle}>CCE Marks</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Continuous Comprehensive Evaluation</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <View style={st.card}>
          <Text style={st.sectionTitle}>📋 Select Parameters</Text>

          <DropPicker
            title="Academic Year"
            options={ACADEMIC_YEARS}
            value={academicYear}
            onSelect={setAcY}
          />

          {loadingClasses ? (
            <View style={[st.picker, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={C.teal} />
            </View>
          ) : (
            <DropPicker
              title="Class"
              options={classes}
              value={selectedClass}
              onSelect={setClass}
              display={v => v?.name || 'Select class'}
            />
          )}

          <DropPicker
            title="Subject"
            options={SUBJECTS}
            value={subject}
            onSelect={setSubject}
          />

          <DropPicker
            title="Exam Type"
            options={VALID_EXAM_TYPES}
            value={examType}
            onSelect={setExamType}
          />
        </View>

        <View style={st.infoCard}>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>Selected:</Text>
          <Text style={{ color: C.white, fontSize: 14 }}>
            {selectedClass?.name || '—'} · {subject} · {examType} · {academicYear}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            Max marks: {examType.startsWith('FA') ? 20 : 80}
          </Text>
        </View>

        <TouchableOpacity
          style={[st.btn, { backgroundColor: C.teal, marginBottom: 12 }]}
          onPress={() => selectedClass && onNavigate('cce-mark-entry', buildParams())}
          disabled={!selectedClass}
        >
          <Text style={st.btnText}>✏️  Enter Marks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.btn, { backgroundColor: C.purple }]}
          onPress={() => setShowReport(true)}
          disabled={!selectedClass}
        >
          <Text style={st.btnText}>📊  View Report</Text>
        </TouchableOpacity>
      </ScrollView>

      {picker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPicker(null)}>
          <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => setPicker(null)}>
            <View style={st.sheet}>
              <Text style={st.sheetTitle}>{picker.title}</Text>
              <ScrollView>
                {picker.options.map((opt, i) => {
                  const label = picker.display ? picker.display(opt) : opt;
                  const isSelected = picker.display
                    ? picker.value?.id === opt?.id
                    : picker.value === opt;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[st.sheetItem, isSelected && { backgroundColor: C.teal + '22' }]}
                      onPress={() => { picker.onSelect(opt); setPicker(null); }}
                    >
                      <Text style={{ color: isSelected ? C.teal : C.white, fontWeight: isSelected ? '700' : '400' }}>
                        {label}
                      </Text>
                      {isSelected && <Text style={{ color: C.teal }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showReport && selectedClass && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowReport(false)}>
          <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => setShowReport(false)}>
            <View style={st.sheet}>
              <Text style={st.sheetTitle}>View Report</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
                {selectedClass.name} · {academicYear}
              </Text>
              <TouchableOpacity
                style={[st.reportBtn, { backgroundColor: C.teal }]}
                onPress={() => {
                  setShowReport(false);
                  onNavigate('cce-halfyear', { academicYear, classId: selectedClass.id, className: selectedClass.name, section: SECTION_FROM_NAME(selectedClass.name) });
                }}
              >
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>📄 Half-Year Report</Text>
                <Text style={{ color: C.white + 'BB', fontSize: 12, marginTop: 2 }}>FA1 + FA2 + SA1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.reportBtn, { backgroundColor: C.purple, marginTop: 12 }]}
                onPress={() => {
                  setShowReport(false);
                  onNavigate('cce-final', { academicYear, classId: selectedClass.id, className: selectedClass.name, section: SECTION_FROM_NAME(selectedClass.name) });
                }}
              >
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>📊 Final Annual Report</Text>
                <Text style={{ color: C.white + 'BB', fontSize: 12, marginTop: 2 }}>FA1+FA2+FA3+FA4+SA1+SA2</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.navy },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingTop: 52, backgroundColor: C.navyMid, borderBottomWidth: 1, borderColor: C.border },
  backBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: C.white },
  card:         { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.white, marginBottom: 14 },
  picker:       { backgroundColor: C.navyMid, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  pickerLabel:  { fontSize: 11, color: C.muted, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerVal:    { fontSize: 15, color: C.white, fontWeight: '600' },
  infoCard:     { backgroundColor: C.teal + '18', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: C.teal + '44' },
  btn:          { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText:      { color: C.white, fontWeight: '700', fontSize: 16 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%', borderTopWidth: 1, borderColor: C.border },
  sheetTitle:   { fontSize: 16, fontWeight: '700', color: C.white, marginBottom: 16 },
  sheetItem:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  reportBtn:    { borderRadius: 14, padding: 16, alignItems: 'center' },
});

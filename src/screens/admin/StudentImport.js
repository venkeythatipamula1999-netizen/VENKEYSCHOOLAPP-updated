import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, Alert, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { C } from '../../theme/colors';
import { apiFetch } from '../../api/client';

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];
const REQUIRED_COLS  = ['Admission Number', 'Student Name', 'Father Name', 'Class', 'Date of Birth'];
const TEMPLATE_CSV   = `Admission Number,Student Name,Father Name,Class,Date of Birth\r\n1001,Venkatesh Kumar,Ramesh Kumar,6A,15-06-2012\r\n1002,Priya Sharma,Suresh Sharma,7B,22-09-2011\r\n`;

export default function StudentImport({ onBack, onNavigate }) {
  const [step, setStep]               = useState(1);
  const [rows, setRows]               = useState([]);
  const [fileName, setFileName]       = useState('');
  const [parseError, setParseError]   = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [importing, setImporting]     = useState(false);
  const [progress, setProgress]       = useState(0);
  const [result, setResult]           = useState(null);
  const [showQR, setShowQR]           = useState(null);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const downloadTemplate = async () => {
    try {
      const uri = FileSystem.documentDirectory + 'StudentImportTemplate.csv';
      await FileSystem.writeAsStringAsync(uri, TEMPLATE_CSV, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Save Student Import Template' });
      } else {
        Alert.alert('Download', 'File saved: ' + uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not create template: ' + e.message);
    }
  };

  const parseCSV = (text) => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('File is empty or has no data rows');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    for (const col of REQUIRED_COLS) {
      if (!headers.includes(col)) throw new Error(`Missing column: ${col}`);
    }
    const colIdx = {};
    REQUIRED_COLS.forEach(col => { colIdx[col] = headers.indexOf(col); });
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return {
        admissionNumber: vals[colIdx['Admission Number']] || '',
        studentName:     vals[colIdx['Student Name']]     || '',
        fatherName:      vals[colIdx['Father Name']]      || '',
        className:       vals[colIdx['Class']]            || '',
        dateOfBirth:     vals[colIdx['Date of Birth']]    || '',
      };
    }).filter(r => r.admissionNumber && r.studentName);
  };

  const parseExcel = async (uri) => {
    const XLSX = require('xlsx');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const workbook = XLSX.read(base64, { type: 'base64' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (data.length < 2) throw new Error('File is empty or has no data rows');
    const headers = data[0].map(h => String(h).trim());
    for (const col of REQUIRED_COLS) {
      if (!headers.includes(col)) throw new Error(`Missing column: ${col}`);
    }
    const colIdx = {};
    REQUIRED_COLS.forEach(col => { colIdx[col] = headers.indexOf(col); });
    return data.slice(1).filter(row => row[colIdx['Admission Number']] && row[colIdx['Student Name']]).map(row => ({
      admissionNumber: String(row[colIdx['Admission Number']]).trim(),
      studentName:     String(row[colIdx['Student Name']]).trim(),
      fatherName:      String(row[colIdx['Father Name']] || '').trim(),
      className:       String(row[colIdx['Class']] || '').trim(),
      dateOfBirth:     String(row[colIdx['Date of Birth']] || '').trim(),
    }));
  };

  const pickFile = async () => {
    setParseError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const name = asset.name || '';
      setFileName(name);
      let parsed;
      if (name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls')) {
        parsed = await parseExcel(asset.uri);
      } else {
        const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
        parsed = parseCSV(text);
      }
      if (parsed.length === 0) { setParseError('No valid rows found in file.'); return; }
      setRows(parsed);
      setStep(2);
    } catch (e) {
      setParseError(e.message || 'Failed to read file.');
    }
  };

  const doImport = async () => {
    setImporting(true);
    setStep(3);
    setProgress(0);

    const BATCH = 10;
    let imported = 0, skippedCount = 0;
    const skippedList = [];
    const importedStudents = [];

    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const res = await apiFetch('/students/import', {
          method: 'POST',
          body: JSON.stringify({ students: chunk, academicYear }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Import failed');
        imported     += data.imported   || 0;
        skippedCount += data.skipped    || 0;
        skippedList.push(...(data.skippedList || []));
        importedStudents.push(...(data.students || []));
        setProgress(Math.min(i + BATCH, rows.length));
      }
      setResult({ imported, skipped: skippedCount, skippedList, students: importedStudents });
      setStep(4);
    } catch (e) {
      Alert.alert('Import Error', e.message);
      setStep(2);
    } finally {
      setImporting(false);
    }
  };

  if (step === 1) {
    return (
      <ScrollView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={onBack} style={st.backBtn}>
            <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={st.headerTitle}>Import Students</Text>
        </View>
        <View style={{ padding: 20 }}>
          <TouchableOpacity style={st.templateBtn} onPress={downloadTemplate}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>📄</Text>
            <Text style={{ color: C.teal, fontWeight: '700', fontSize: 14 }}>Download Template</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.uploadBox} onPress={pickFile}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📂</Text>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 15, marginBottom: 6 }}>Tap to select file</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>CSV or Excel (.xlsx)</Text>
          </TouchableOpacity>

          {parseError ? (
            <View style={st.errorBox}>
              <Text style={{ color: C.coral, fontSize: 13, fontWeight: '600' }}>⚠️ {parseError}</Text>
            </View>
          ) : null}

          <View style={[st.card, { marginTop: 20 }]}>
            <Text style={{ color: C.muted, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>Required columns:</Text>
            {REQUIRED_COLS.map(col => (
              <Text key={col} style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>• {col}</Text>
            ))}
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Date format: DD-MM-YYYY</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (step === 2) {
    return (
      <View style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => setStep(1)} style={st.backBtn}>
            <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={st.headerTitle}>Preview</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ padding: 20, paddingBottom: 8 }}>
            <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
              📋 {rows.length} students found
            </Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{fileName}</Text>

            <View style={{ flexDirection: 'row', backgroundColor: C.navyMid, borderRadius: 10, padding: 8, marginBottom: 4 }}>
              <Text style={[st.col, { color: C.muted, flex: 1 }]}>Adm No</Text>
              <Text style={[st.col, { color: C.muted, flex: 2 }]}>Name</Text>
              <Text style={[st.col, { color: C.muted, flex: 1 }]}>Class</Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
            {rows.slice(0, 100).map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: C.border }}>
                <Text style={[st.col, { flex: 1 }]}>{row.admissionNumber}</Text>
                <Text style={[st.col, { flex: 2 }]} numberOfLines={1}>{row.studentName}</Text>
                <Text style={[st.col, { flex: 1 }]}>{row.className}</Text>
              </View>
            ))}
            {rows.length > 100 && (
              <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: 12 }}>
                ... and {rows.length - 100} more
              </Text>
            )}
            <View style={{ height: 160 }} />
          </ScrollView>

          <View style={{ padding: 20, borderTopWidth: 1, borderColor: C.border, backgroundColor: C.navy }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.navyMid, borderRadius: 10, padding: 14, marginBottom: 14 }}
              onPress={() => setShowYearPicker(true)}
            >
              <Text style={{ color: C.white, flex: 1, fontWeight: '600' }}>Academic Year</Text>
              <Text style={{ color: C.teal, fontWeight: '700' }}>{academicYear} ▼</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[st.btn, { flex: 1, backgroundColor: C.navyMid }]} onPress={() => setStep(1)}>
                <Text style={{ color: C.muted, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btn, { flex: 2, backgroundColor: C.teal }]} onPress={doImport}>
                <Text style={{ color: C.white, fontWeight: '700' }}>Import {rows.length} Students →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Modal visible={showYearPicker} transparent animationType="fade" onRequestClose={() => setShowYearPicker(false)}>
          <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setShowYearPicker(false)}>
            <View style={st.picker}>
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 16, marginBottom: 16 }}>Select Academic Year</Text>
              {ACADEMIC_YEARS.map(yr => (
                <TouchableOpacity key={yr} style={[st.pickerItem, academicYear === yr && { backgroundColor: C.teal + '33' }]}
                  onPress={() => { setAcademicYear(yr); setShowYearPicker(false); }}>
                  <Text style={{ color: academicYear === yr ? C.teal : C.white, fontWeight: academicYear === yr ? '700' : '400' }}>{yr}</Text>
                  {academicYear === yr && <Text style={{ color: C.teal }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  if (step === 3) {
    const pct = rows.length > 0 ? Math.round((progress / rows.length) * 100) : 0;
    return (
      <View style={[st.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>📊</Text>
        <Text style={{ color: C.white, fontSize: 18, fontWeight: '700', marginBottom: 32 }}>Importing students...</Text>
        <View style={{ width: '80%', marginBottom: 12 }}>
          <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Processing {progress} / {rows.length}</Text>
          <View style={{ height: 8, backgroundColor: C.navyMid, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: C.teal, borderRadius: 4 }} />
          </View>
        </View>
        <ActivityIndicator color={C.teal} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (step === 4 && result) {
    return (
      <ScrollView style={st.container}>
        <View style={st.header}>
          <Text style={st.headerTitle}>Import Complete</Text>
        </View>
        <View style={{ padding: 20 }}>
          <View style={[st.card, { marginBottom: 20 }]}>
            <Text style={{ color: C.white, fontSize: 20, fontWeight: '800', marginBottom: 16 }}>✅ Import Complete!</Text>
            <View style={{ gap: 8 }}>
              <Text style={st.resultRow}><Text style={{ color: '#22d38a' }}>✅ Imported: </Text>{result.imported} students</Text>
              <Text style={st.resultRow}><Text style={{ color: C.teal }}>🔲 QR Generated: </Text>{result.imported}</Text>
              {result.skipped > 0 && (
                <Text style={st.resultRow}><Text style={{ color: C.gold }}>⏭️ Skipped: </Text>{result.skipped}</Text>
              )}
            </View>
            {result.skipped > 0 && (
              <View style={{ marginTop: 12, padding: 10, backgroundColor: C.navyMid, borderRadius: 8 }}>
                <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>Skipped (already exist):</Text>
                {result.skippedList.slice(0, 5).map((s, i) => (
                  <Text key={i} style={{ color: C.muted, fontSize: 12 }}>• {s.admissionNumber}: {s.reason}</Text>
                ))}
              </View>
            )}
          </View>

          {result.students.slice(0, 3).map((s, i) => {
            let qrVal = s.qrData || s.studentId;
            return (
              <View key={i} style={[st.card, { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }]}>
                <View style={{ borderWidth: 2, borderColor: C.border, borderRadius: 8, padding: 4, backgroundColor: C.white }}>
                  <QRCode value={qrVal} size={64} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>{s.studentName}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{s.studentId}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>Class {s.className}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowQR(s)} style={{ padding: 8 }}>
                  <Text style={{ color: C.teal, fontSize: 12, fontWeight: '600' }}>View</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={[st.btn, { flex: 1, backgroundColor: C.navyMid }]} onPress={() => { setStep(1); setRows([]); setResult(null); setFileName(''); }}>
              <Text style={{ color: C.muted, fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.btn, { flex: 2, backgroundColor: C.purple }]} onPress={() => onNavigate && onNavigate('student-list')}>
              <Text style={{ color: C.white, fontWeight: '700' }}>View All Students</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={!!showQR} transparent animationType="fade" onRequestClose={() => setShowQR(null)}>
          <View style={st.modalOverlay}>
            <View style={[st.picker, { alignItems: 'center', maxWidth: 320, width: '90%' }]}>
              {showQR && (
                <>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 15, marginBottom: 20, textAlign: 'center' }}>
                    {showQR.studentName}
                  </Text>
                  <View style={{ backgroundColor: C.white, padding: 16, borderRadius: 16, marginBottom: 16 }}>
                    <QRCode value={showQR.qrData || showQR.studentId} size={180} />
                  </View>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{showQR.studentId}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>Class {showQR.className}</Text>
                  <TouchableOpacity style={[st.btn, { marginTop: 20, backgroundColor: C.navyMid, width: '100%' }]} onPress={() => setShowQR(null)}>
                    <Text style={{ color: C.muted, fontWeight: '700' }}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return null;
}

const st = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0B1F3A' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 52, borderBottomWidth: 1, borderColor: '#213D62' },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#162E50', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  templateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#162E50', borderWidth: 1.5, borderColor: '#00B8A9', borderRadius: 12, padding: 14, marginBottom: 16 },
  uploadBox:   { borderWidth: 2, borderColor: '#213D62', borderStyle: 'dashed', borderRadius: 16, padding: 40, alignItems: 'center', marginBottom: 16, backgroundColor: '#122848' },
  errorBox:    { backgroundColor: '#FF6B6B22', borderWidth: 1, borderColor: '#FF6B6B55', borderRadius: 10, padding: 12, marginTop: 8 },
  card:        { backgroundColor: '#162E50', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#213D62' },
  btn:         { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  col:         { fontSize: 13, color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  picker:      { backgroundColor: '#162E50', borderRadius: 20, padding: 24, width: '85%', borderWidth: 1, borderColor: '#213D62' },
  pickerItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  resultRow:   { fontSize: 15, color: '#FFFFFF' },
});

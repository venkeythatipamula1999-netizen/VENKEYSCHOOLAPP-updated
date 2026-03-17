import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, BackHandler,
  StyleSheet, Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { getFriendlyError } from '../../utils/errorMessages';
import { apiFetch } from '../../api/client';

const PRODUCTION_URL = 'https://vidyalayam.replit.app';

const CLASS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function AdminStudentQR({ onBack, currentUser }) {
  const [classes, setClasses]                 = useState([]);
  const [selectedClass, setSelectedClass]     = useState(null);
  const [students, setStudents]               = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [qrData, setQrData]                   = useState('');
  const [loading, setLoading]                 = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchText, setSearchText]           = useState('');

  const [printHtml, setPrintHtml]             = useState('');
  const [printLoading, setPrintLoading]       = useState(false);
  const [showPrint, setShowPrint]             = useState(false);
  const [shareLoading, setShareLoading]       = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showPrint)       { setShowPrint(false); return true; }
      if (selectedStudent) { setSelectedStudent(null); return true; }
      if (selectedClass)   { setSelectedClass(null); setStudents([]); return true; }
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack, showPrint, selectedStudent, selectedClass]);

  useEffect(() => {
    apiFetch('/classes')
      .then(r => r.json())
      .then(data => setClasses(data.classes || data || []))
      .catch(e => console.error('Failed to load classes:', getFriendlyError(e, 'Could not load classes')))
      .finally(() => setLoading(false));
  }, []);

  const selectClass = async (cls) => {
    setSelectedClass(cls);
    setSelectedStudent(null);
    setQrData('');
    setShowPrint(false);
    setPrintHtml('');
    setStudentsLoading(true);
    try {
      const res = await apiFetch(`/students/${encodeURIComponent(cls.id || cls.name)}`);
      const data = await res.json();
      setStudents(data.students || data || []);
    } catch (e) {
      console.error('Failed to load students:', getFriendlyError(e, 'Could not load students'));
    } finally {
      setStudentsLoading(false);
    }
  };

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    try {
      const res = await apiFetch(`/student/qr/${encodeURIComponent(student.studentId)}`, {});
      const data = await res.json();
      setQrData(data.success && data.qrCode ? data.qrCode : `SREE_PRAGATHI|school_001|${student.studentId}`);
    } catch (_) {
      setQrData(`SREE_PRAGATHI|school_001|${student.studentId}`);
    }
  };

  const openPrintSheet = async () => {
    if (!selectedClass) return;
    setPrintLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const classId = encodeURIComponent(selectedClass.id || selectedClass.name);
      const url = `${PRODUCTION_URL}/api/students/qr-sheet-html/${classId}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const html = await resp.text();
      setPrintHtml(html);
      setShowPrint(true);
    } catch (e) {
      Alert.alert('Error', 'Could not load QR sheet. Please check your connection and try again.');
      console.error('[qr-sheet-html]', e.message);
    } finally {
      setPrintLoading(false);
    }
  };

  const shareSheet = async () => {
    if (!printHtml) return;
    setShareLoading(true);
    try {
      const className = (selectedClass?.name || selectedClass?.id || 'class').replace(/\s+/g, '_');
      const fileName = `QR_Sheet_${className}.html`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, printHtml, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: `QR Sheet — ${selectedClass?.name || ''}`,
          UTI: 'public.html',
        });
      } else {
        Alert.alert('Saved', `File saved to:\n${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not share file: ' + e.message);
    } finally {
      setShareLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    !searchText ||
    (s.name || s.studentName || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(s.rollNumber || '').includes(searchText) ||
    String(s.admissionNumber || '').includes(searchText)
  );

  // ── PRINT SHEET WEBVIEW ────────────────────────────────────────────────────
  if (showPrint) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy }}>
        <View style={[st.header, { paddingTop: 52 }]}>
          <TouchableOpacity onPress={() => setShowPrint(false)} style={st.backBtn}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 17 }}>
              QR Sheet — {selectedClass?.name || ''}
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {students.length} student{students.length !== 1 ? 's' : ''} · tap 🖨️ Print inside to save PDF
            </Text>
          </View>
          <TouchableOpacity
            onPress={shareSheet}
            disabled={shareLoading}
            style={[st.shareBtn, shareLoading && { opacity: 0.5 }]}
          >
            {shareLoading
              ? <ActivityIndicator color={C.white} size="small" />
              : <>
                  <Text style={{ fontSize: 16 }}>📤</Text>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 12 }}>Share</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        <WebView
          source={{ html: printHtml, baseUrl: 'https://cdnjs.cloudflare.com' }}
          style={{ flex: 1 }}
          startInLoadingState
          renderLoading={() => (
            <View style={st.webviewLoader}>
              <ActivityIndicator color="#1a3c5e" size="large" />
              <Text style={{ color: '#1a3c5e', marginTop: 12, fontWeight: '600' }}>
                Generating QR Codes…
              </Text>
            </View>
          )}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
        />
      </View>
    );
  }

  // ── SINGLE STUDENT QR ─────────────────────────────────────────────────────
  if (selectedStudent) {
    const studentName = selectedStudent.name || selectedStudent.studentName || '';
    return (
      <View style={{ flex: 1, backgroundColor: C.navy }}>
        <View style={[st.header, { paddingTop: 52 }]}>
          <TouchableOpacity onPress={() => setSelectedStudent(null)} style={st.backBtn}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 18 }}>Student QR Code</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{studentName}</Text>
          </View>
        </View>

        <ScrollView>
          <View style={{ alignItems: 'center', padding: 24 }}>
            <View style={st.qrCard}>
              {qrData ? (
                <QRCode value={qrData} size={200} color="#1a3c5e" backgroundColor="#ffffff" />
              ) : (
                <ActivityIndicator color={C.teal} size="large" style={{ width: 200, height: 200 }} />
              )}
            </View>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 18, marginBottom: 4 }}>
              {studentName}
            </Text>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 2 }}>
              {selectedStudent.studentId}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {selectedStudent.className ? (
                <View style={st.chip}>
                  <Text style={st.chipText}>Class {selectedStudent.className}</Text>
                </View>
              ) : null}
              {selectedStudent.admissionNumber ? (
                <View style={[st.chip, { backgroundColor: C.teal + '22', borderColor: C.teal + '55' }]}>
                  <Text style={[st.chipText, { color: C.teal }]}>
                    Adm: {selectedStudent.admissionNumber}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[st.card, { margin: 16 }]}>
            <Text style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>
              BUS ASSIGNMENT
            </Text>
            {selectedStudent.busId ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>🚌</Text>
                <View>
                  <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>Assigned to Bus</Text>
                  <Text style={{ color: C.teal, fontSize: 13 }}>{selectedStudent.busId}</Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>⚠️</Text>
                <View>
                  <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>No Bus Assigned</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    Go to Bus Management → Assign Students
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={[st.card, { margin: 16, marginTop: 0, backgroundColor: C.teal + '11', borderColor: C.teal + '33' }]}>
            <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
              📋 How to use this QR
            </Text>
            <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>
              Screenshot this white QR card and print it. Give it to the student to carry in their
              school bag. The driver or cleaner scans it when the student boards or exits the bus.
            </Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── STUDENT LIST (class selected) ─────────────────────────────────────────
  if (selectedClass) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy }}>
        <View style={[st.header, { paddingTop: 52 }]}>
          <TouchableOpacity
            onPress={() => { setSelectedClass(null); setStudents([]); setSearchText(''); }}
            style={st.backBtn}
          >
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 18 }}>
              {selectedClass.name || selectedClass.id}
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {studentsLoading ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>

        {/* ── PRINT ALL BUTTON ── */}
        <TouchableOpacity
          style={[
            st.printAllBtn,
            (printLoading || studentsLoading || students.length === 0) && { opacity: 0.5 },
          ]}
          onPress={openPrintSheet}
          disabled={printLoading || studentsLoading || students.length === 0}
        >
          {printLoading
            ? <ActivityIndicator color={C.navy} size="small" />
            : <Text style={{ fontSize: 20 }}>🖨️</Text>
          }
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.navy, fontWeight: '800', fontSize: 14 }}>
              {printLoading ? 'Generating Sheet…' : 'Print All QR Codes'}
            </Text>
            <Text style={{ color: '#1a3c5e99', fontSize: 11, marginTop: 1 }}>
              {students.length > 0
                ? `${students.length} QR cards · print-ready sheet`
                : 'No students in this class yet'}
            </Text>
          </View>
          {!printLoading && (
            <View style={st.printArrow}>
              <Text style={{ color: C.navy, fontWeight: '800', fontSize: 16 }}>→</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <TextInput
            style={st.searchInput}
            placeholder="Search by name or admission no…"
            placeholderTextColor={C.muted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {studentsLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.teal} size="large" />
            <Text style={{ color: C.muted, marginTop: 12 }}>Loading students…</Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔲</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
              {searchText
                ? 'No students match your search'
                : 'No students in this class yet.\nImport students via CSV to generate QR codes.'}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
              Tap a student to view their individual QR code
            </Text>
            {filteredStudents.map((s, i) => {
              const name = s.name || s.studentName || 'Unknown';
              const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <TouchableOpacity
                  key={s.studentId || i}
                  style={st.studentRow}
                  onPress={() => selectStudent(s)}
                >
                  <View style={[st.avatar, { backgroundColor: CLASS_COLORS[i % CLASS_COLORS.length] + '33' }]}>
                    <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>{name}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                      {s.admissionNumber ? (
                        <Text style={{ color: C.muted, fontSize: 12 }}>Adm: {s.admissionNumber}</Text>
                      ) : null}
                      {s.rollNumber ? (
                        <Text style={{ color: C.muted, fontSize: 12 }}>Roll: {s.rollNumber}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {s.busId ? (
                      <View style={[st.chip, { backgroundColor: C.teal + '22', borderColor: C.teal + '44' }]}>
                        <Text style={{ color: C.teal, fontSize: 10, fontWeight: '600' }}>🚌 Bus</Text>
                      </View>
                    ) : null}
                    <Icon name="next" size={16} color={C.muted} />
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    );
  }

  // ── CLASS LIST ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={[st.header, { paddingTop: 52 }]}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 18 }}>Student QR Codes</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Select a class to view or print QR codes</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={{ color: C.muted, marginTop: 12 }}>Loading classes…</Text>
        </View>
      ) : classes.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🏫</Text>
          <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
            No classes found. Add classes from Class Management first.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Info banner */}
          <View style={st.infoBanner}>
            <Text style={{ fontSize: 22 }}>🖨️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 13 }}>Print QR Sheets</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                Select a class to print all student QR codes on one A4 sheet
              </Text>
            </View>
          </View>

          {classes.map((cls, i) => (
            <TouchableOpacity
              key={cls.id || i}
              style={st.classRow}
              onPress={() => selectClass(cls)}
            >
              <View style={[st.classIcon, { backgroundColor: CLASS_COLORS[i % CLASS_COLORS.length] + '22' }]}>
                <Text style={{ fontSize: 22 }}>🏫</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>
                  {cls.name || cls.id}
                </Text>
                {cls.teacherName ? (
                  <Text style={{ color: C.muted, fontSize: 12 }}>Teacher: {cls.teacherName}</Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={st.printTag}>
                  <Text style={{ fontSize: 13 }}>🖨️</Text>
                  <Text style={{ color: C.gold, fontSize: 11, fontWeight: '600' }}>Print</Text>
                </View>
                <Icon name="next" size={16} color={C.muted} />
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, borderBottomWidth: 1, borderColor: C.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.teal, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  webviewLoader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8',
  },
  printAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.gold, margin: 16, marginBottom: 8,
    borderRadius: 14, padding: 14,
  },
  printArrow: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  searchInput: {
    backgroundColor: C.card, borderRadius: 10, borderWidth: 1,
    borderColor: C.border, color: C.white, padding: 11, fontSize: 14,
  },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  qrCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
    backgroundColor: C.purple + '22', borderWidth: 1, borderColor: C.purple + '44',
  },
  chipText: { fontSize: 11, fontWeight: '600', color: C.purple },
  card: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  classRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  classIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  printTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.gold + '18', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: C.gold + '44',
  },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e3a5f', borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
  },
});

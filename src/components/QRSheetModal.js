import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { C } from '../theme/colors';
import { apiFetch } from '../api/client';

const COLS = 4;

export default function QRSheetModal({ visible, classId, className, onClose }) {
  const [loading, setLoading]     = useState(true);
  const [students, setStudents]   = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [error, setError]         = useState('');
  const sheetRef = useRef(null);

  useEffect(() => {
    if (visible && classId) {
      setError('');
      setStudents([]);
      setLoading(true);
      apiFetch(`/students/qr-sheet/${encodeURIComponent(classId)}`)
        .then(r => r.json())
        .then(data => {
          if (!data.success) throw new Error(data.error || 'Failed');
          setStudents(data.students || []);
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [visible, classId]);

  const handleCapture = async () => {
    if (!sheetRef.current) return;
    setCapturing(true);
    try {
      const uri = await captureRef(sheetRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `QR Sheet — Class ${className}`,
        });
      } else {
        Alert.alert('Saved', 'QR sheet saved: ' + uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not capture QR sheet: ' + e.message);
    } finally {
      setCapturing(false);
    }
  };

  const rows = [];
  for (let i = 0; i < students.length; i += COLS) {
    rows.push(students.slice(i, i + COLS));
  }

  let schoolName = '';
  if (students.length > 0 && students[0].qrData) {
    try { schoolName = JSON.parse(students[0].qrData)?.schoolName || ''; } catch {}
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={st.container}>
        <View style={st.topBar}>
          <TouchableOpacity onPress={onClose} style={st.backBtn}>
            <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 16, flex: 1 }}>
            QR Sheet — Class {className}
          </Text>
          {!loading && students.length > 0 && (
            <TouchableOpacity
              onPress={handleCapture}
              disabled={capturing}
              style={st.shareBtn}
            >
              {capturing
                ? <ActivityIndicator size="small" color={C.navy} />
                : <Text style={{ color: C.navy, fontWeight: '700', fontSize: 13 }}>📤 Share</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={{ color: C.muted, marginTop: 12 }}>Loading students...</Text>
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ color: C.coral, textAlign: 'center' }}>{error}</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 40 }}>🎓</Text>
            <Text style={{ color: C.muted, marginTop: 12 }}>No students with QR data in this class</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 0 }}>
            <View
              ref={sheetRef}
              collapsable={false}
              style={st.sheet}
            >
              <View style={st.sheetHeader}>
                {schoolName ? (
                  <Text style={st.schoolName}>{schoolName.toUpperCase()}</Text>
                ) : null}
                <Text style={st.sheetTitle}>Class {className} — QR Codes Sheet</Text>
                <Text style={st.sheetSub}>{students.length} Students</Text>
              </View>

              {rows.map((row, ri) => (
                <View key={ri} style={st.row}>
                  {row.map((s, ci) => (
                    <View key={ci} style={st.cell}>
                      <View style={st.qrWrap}>
                        <QRCode value={s.qrData || s.studentId || 'student'} size={80} />
                      </View>
                      <Text style={st.cellName} numberOfLines={2}>{s.studentName}</Text>
                      <Text style={st.cellId}>{s.studentId}</Text>
                      <Text style={st.cellClass}>Class {s.className}</Text>
                    </View>
                  ))}
                  {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, ei) => (
                    <View key={`e${ei}`} style={st.cellEmpty} />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1F3A' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, paddingTop: 52,
    backgroundColor: '#162E50', borderBottomWidth: 1, borderColor: '#213D62',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#0B1F3A', alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    backgroundColor: '#F2A900', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    minHeight: 200,
  },
  sheetHeader: {
    alignItems: 'center', marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 2, borderColor: '#1a3c5e',
  },
  schoolName: {
    fontSize: 13, fontWeight: '800', color: '#1a3c5e',
    letterSpacing: 1, marginBottom: 4,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1a3c5e', marginBottom: 2 },
  sheetSub:   { fontSize: 12, color: '#666' },
  row:  { flexDirection: 'row', marginBottom: 8 },
  cell: {
    flex: 1, alignItems: 'center', padding: 8,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, margin: 2,
    backgroundColor: '#fafafa',
  },
  cellEmpty: { flex: 1, margin: 2 },
  qrWrap:    { backgroundColor: '#fff', padding: 4, borderRadius: 4, marginBottom: 6 },
  cellName:  { fontSize: 10, fontWeight: '700', color: '#1a3c5e', textAlign: 'center', lineHeight: 13 },
  cellId:    { fontSize: 9,  color: '#555', textAlign: 'center', marginTop: 2 },
  cellClass: { fontSize: 9,  color: '#888', textAlign: 'center' },
});

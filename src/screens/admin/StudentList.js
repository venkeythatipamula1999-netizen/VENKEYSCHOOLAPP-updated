import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Modal, StyleSheet,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { C } from '../../theme/colors';
import { apiFetch } from '../../api/client';

export default function StudentList({ onBack }) {
  const [loading, setLoading]       = useState(true);
  const [students, setStudents]     = useState([]);
  const [grouped, setGrouped]       = useState([]);
  const [search, setSearch]         = useState('');
  const [showQR, setShowQR]         = useState(null);
  const [error, setError]           = useState('');

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await apiFetch('/students/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch students');
      const list = data.students || [];
      setStudents(list);
      groupStudents(list, '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const groupStudents = (list, q) => {
    const filtered = q
      ? list.filter(s =>
          (s.studentName || s.name || '').toLowerCase().includes(q.toLowerCase()) ||
          (s.studentId   || '').toLowerCase().includes(q.toLowerCase()) ||
          (s.admissionNumber || '').toLowerCase().includes(q.toLowerCase())
        )
      : list;
    const map = {};
    filtered.forEach(s => {
      const cls = s.className || 'Unknown';
      if (!map[cls]) map[cls] = [];
      map[cls].push(s);
    });
    const sortedGroups = Object.keys(map).sort().map(cls => ({ cls, items: map[cls] }));
    setGrouped(sortedGroups);
  };

  useEffect(() => { groupStudents(students, search); }, [search]);

  const total = grouped.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Students</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{total} students</Text>
        </View>
        <TouchableOpacity onPress={fetchStudents} style={{ padding: 8 }}>
          <Text style={{ color: C.teal, fontSize: 20 }}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={st.searchBox}>
          <Text style={{ color: C.muted, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: C.white, fontSize: 14 }}
            placeholder="Search by name, ID, or admission no..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={{ color: C.muted, marginTop: 12 }}>Loading students...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: C.coral, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
          <TouchableOpacity style={st.retryBtn} onPress={fetchStudents}>
            <Text style={{ color: C.white, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : grouped.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🎓</Text>
          <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>No Students Found</Text>
          <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>
            {search ? 'Try a different search' : 'Import students to see them here'}
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {grouped.map(group => (
            <View key={group.cls} style={{ marginBottom: 20 }}>
              <View style={st.classHeader}>
                <Text style={{ color: C.gold, fontWeight: '800', fontSize: 13 }}>
                  CLASS {group.cls}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{group.items.length} students</Text>
              </View>
              <View style={{ height: 1, backgroundColor: C.border, marginBottom: 8 }} />
              {group.items.map((s, i) => {
                const name = s.studentName || s.name || '';
                const sid  = s.studentId || '';
                const adm  = s.admissionNumber || '';
                return (
                  <View key={i} style={st.studentRow}>
                    <View style={st.qrThumb}>
                      <QRCode value={s.qrData || sid || 'student'} size={36} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{name}</Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>{sid}{adm ? ` • Adm: ${adm}` : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowQR(s)} style={st.viewQRBtn}>
                      <Text style={{ color: C.teal, fontSize: 11, fontWeight: '700' }}>View QR</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!showQR} transparent animationType="fade" onRequestClose={() => setShowQR(null)}>
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            {showQR && (() => {
              const name   = showQR.studentName || showQR.name || '';
              const sid    = showQR.studentId || '';
              const cls    = showQR.className || '';
              const qrVal  = showQR.qrData || sid || 'student';
              let schoolName = '';
              try { schoolName = JSON.parse(qrVal)?.schoolName || ''; } catch {}
              return (
                <>
                  {schoolName ? (
                    <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginBottom: 12 }}>
                      {schoolName.toUpperCase()}
                    </Text>
                  ) : null}
                  <View style={{ backgroundColor: C.white, padding: 16, borderRadius: 16, marginBottom: 16 }}>
                    <QRCode value={qrVal} size={200} />
                  </View>
                  <Text style={{ color: C.white, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4 }}>{name}</Text>
                  <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>{sid}{cls ? ` • Class ${cls}` : ''}</Text>
                  <TouchableOpacity style={[st.retryBtn, { marginTop: 20, backgroundColor: C.navyMid }]} onPress={() => setShowQR(null)}>
                    <Text style={{ color: C.muted, fontWeight: '700' }}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0B1F3A' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 52, borderBottomWidth: 1, borderColor: '#213D62' },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#162E50', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#162E50', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#213D62' },
  classHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  studentRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#213D62', gap: 10 },
  qrThumb:     { backgroundColor: '#FFFFFF', padding: 4, borderRadius: 6 },
  viewQRBtn:   { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#00B8A9' },
  retryBtn:    { backgroundColor: '#00B8A9', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  modalCard:   { backgroundColor: '#162E50', borderRadius: 24, padding: 28, width: '85%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: '#213D62' },
});

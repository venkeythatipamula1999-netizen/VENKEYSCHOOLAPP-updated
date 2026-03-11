import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, BackHandler,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { getFriendlyError } from '../../utils/errorMessages';
import { apiFetch } from '../../api/client';

export default function AdminStudentQR({ onBack, currentUser }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [qrData, setQrData] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  // Fetch all classes on mount
  useEffect(() => {
    apiFetch('/classes')
      .then(r => r.json())
      .then(data => {
        const cls = data.classes || data || [];
        setClasses(cls);
      })
      .catch(e => console.error('Failed to load classes:', getFriendlyError(e, 'Could not load classes')))
      .finally(() => setLoading(false));
  }, []);

  // Fetch students when class selected
  const selectClass = async (cls) => {
    setSelectedClass(cls);
    setSelectedStudent(null);
    setQrData('');
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

  // Fetch QR code for selected student
  const selectStudent = async (student) => {
    setSelectedStudent(student);
    try {
      const res = await apiFetch(`/student/qr/${encodeURIComponent(student.studentId)}`, {});
      const data = await res.json();
      if (data.success && data.qrCode) {
        setQrData(data.qrCode);
      } else {
        // Generate locally if endpoint fails
        setQrData(`SREE_PRAGATHI|school_001|${student.studentId}`);
      }
    } catch (e) {
      setQrData(`SREE_PRAGATHI|school_001|${student.studentId}`);
    }
  };

  const filteredStudents = students.filter(s =>
    !searchText ||
    (s.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(s.rollNumber || '').includes(searchText)
  );

  const inputStyle = {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    color: C.white,
    padding: 11,
    fontSize: 14,
    marginBottom: 12
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingTop: 24 }}>
        <TouchableOpacity
          onPress={selectedStudent ? () => setSelectedStudent(null) : selectedClass ? () => { setSelectedClass(null); setStudents([]); } : onBack}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
        >
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 18 }}>Student QR Codes</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {selectedStudent
              ? selectedStudent.name
              : selectedClass
                ? selectedClass.name || selectedClass.id
                : 'Select a class'}
          </Text>
        </View>
      </View>

      {/* ── STEP 1: Class Selection ── */}
      {!selectedClass && (
        loading ? (
          <ActivityIndicator size="large" color={C.teal} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12, letterSpacing: 0.5 }}>SELECT CLASS</Text>
            {classes.length === 0 ? (
              <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>No classes found</Text>
            ) : (
              classes.map((cls, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => selectClass(cls)}
                  style={{
                    backgroundColor: C.card, borderRadius: 14, padding: 16,
                    marginBottom: 10, borderWidth: 1, borderColor: C.border,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.teal + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>📚</Text>
                    </View>
                    <Text style={{ color: C.white, fontWeight: '600', fontSize: 15 }}>
                      {cls.name || cls.id}
                    </Text>
                  </View>
                  <Text style={{ color: C.muted, fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )
      )}

      {/* ── STEP 2: Student Selection ── */}
      {selectedClass && !selectedStudent && (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <TextInput
            style={inputStyle}
            placeholder="Search by name or roll number..."
            placeholderTextColor={C.muted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {studentsLoading ? (
            <ActivityIndicator size="large" color={C.teal} style={{ marginTop: 40 }} />
          ) : filteredStudents.length === 0 ? (
            <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>No students found</Text>
          ) : (
            <ScrollView>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12, letterSpacing: 0.5 }}>
                {filteredStudents.length} STUDENTS
              </Text>
              {filteredStudents.map((student, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => selectStudent(student)}
                  style={{
                    backgroundColor: C.card, borderRadius: 14, padding: 14,
                    marginBottom: 8, borderWidth: 1, borderColor: C.border,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.gold + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: C.gold, fontWeight: '700', fontSize: 14 }}>
                        {String(student.rollNumber || i + 1).padStart(2, '0')}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>{student.name}</Text>
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                        ID: {student.studentId}
                        {student.busId ? ` · Bus: ${student.busId}` : ' · No bus assigned'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: C.teal, fontSize: 20 }}>⊙</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── STEP 3: QR Code Display ── */}
      {selectedStudent && (
        <ScrollView style={{ paddingHorizontal: 20 }}>
          {/* QR Card */}
          <View style={{
            backgroundColor: C.white,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            marginBottom: 20,
            marginTop: 8
          }}>
            {/* School name above QR */}
            <Text style={{ color: '#0a1628', fontWeight: '800', fontSize: 15, marginBottom: 4 }}>
              🏫 Sree Pragathi High School
            </Text>
            <Text style={{ color: '#555', fontSize: 11, marginBottom: 20 }}>Gopalraopet</Text>

            {qrData ? (
              <QRCode
                value={qrData}
                size={200}
                color="#0a1628"
                backgroundColor="white"
              />
            ) : (
              <ActivityIndicator size="large" color={C.teal} />
            )}

            {/* Student info below QR */}
            <Text style={{ color: '#0a1628', fontWeight: '700', fontSize: 17, marginTop: 20 }}>
              {selectedStudent.name}
            </Text>
            <Text style={{ color: '#444', fontSize: 13, marginTop: 4 }}>
              {selectedClass?.name || selectedClass?.id} · Roll No. {selectedStudent.rollNumber}
            </Text>
            <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
              ID: {selectedStudent.studentId}
            </Text>

            {/* QR data string */}
            <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, marginTop: 16, width: '100%' }}>
              <Text style={{ color: '#333', fontSize: 10, textAlign: 'center', fontFamily: 'monospace' }}>
                {qrData}
              </Text>
            </View>
          </View>

          {/* Bus assignment status */}
          <View style={{
            backgroundColor: C.card, borderRadius: 14, padding: 16,
            borderWidth: 1, borderColor: C.border, marginBottom: 12
          }}>
            <Text style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>BUS ASSIGNMENT</Text>
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
                  <Text style={{ color: C.muted, fontSize: 12 }}>Go to Bus Management → Assign Students</Text>
                </View>
              </View>
            )}
          </View>

          {/* Print instructions */}
          <View style={{
            backgroundColor: C.teal + '11', borderRadius: 14, padding: 16,
            borderWidth: 1, borderColor: C.teal + '33', marginBottom: 40
          }}>
            <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
              📋 How to use this QR
            </Text>
            <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>
              Take a screenshot of the white QR card and print it. Give it to the student to carry in their school bag. The cleaner scans this code every morning when the student boards the bus.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

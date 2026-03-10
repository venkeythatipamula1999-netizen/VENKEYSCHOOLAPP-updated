import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, TextInput
} from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import { getFriendlyError } from '../../utils/errorMessages';

export default function AdminBuses({ onBack, currentUser }) {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState(null);
  const [onboardStudents, setOnboardStudents] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add Bus form state
  const [form, setForm] = useState({
    busId: '', busNumber: '', route: '', routeId: '',
    driverName: '', driverId: '', cleanerName: '', cleanerId: ''
  });

  // Assign Students state
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ visible: true, message: msg, type });

  const fetchBuses = async () => {
    try {
      const res = await apiFetch('/admin/buses');
      const data = await res.json();
      if (data.success) setBuses(data.buses || []);
    } catch (e) {
      console.error('Failed to load buses:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBuses(); }, []);

  const openOnboardModal = async (bus) => {
    setSelectedBus(bus);
    setShowOnboardModal(true);
    setModalLoading(true);
    try {
      const res = await apiFetch(`/bus/onboard-students?busId=${encodeURIComponent(bus.busId || bus.id)}`);
      const data = await res.json();
      if (data.success) setOnboardStudents(data.students || []);
    } catch (err) {
      console.error('Failed to fetch onboard students:', err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const openAssignModal = async (bus) => {
    setSelectedBus(bus);
    setSelectedStudentIds(bus.studentIds || []);
    setShowAssignModal(true);
    setStudentsLoading(true);
    try {
      // Fetch all classes then all students
      const classRes = await apiFetch('/classes');
      const classData = await classRes.json();
      const classes = classData.classes || classData || [];
      let allS = [];
      for (const cls of classes) {
        const sRes = await apiFetch(`/students/${encodeURIComponent(cls.id || cls.name)}`);
        const sData = await sRes.json();
        const students = sData.students || sData || [];
        allS = allS.concat(students.map(s => ({ ...s, className: cls.name })));
      }
      setAllStudents(allS);
    } catch (err) {
      console.error('Failed to load students:', err.message);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleAddBus = async () => {
    if (!form.busId.trim() || !form.busNumber.trim()) {
      showToast('Bus ID and Bus Number are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/admin/buses/add', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bus');
      setShowAddModal(false);
      setForm({ busId: '', busNumber: '', route: '', routeId: '', driverName: '', driverId: '', cleanerName: '', cleanerId: '' });
      fetchBuses();
    } catch (err) {
      showToast(getFriendlyError(err, 'Failed to create bus.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignStudents = async () => {
    if (!selectedBus) return;
    setSaving(true);
    try {
      const res = await apiFetch('/admin/buses/assign-students', {
        method: 'POST',
        body: JSON.stringify({
          busId: selectedBus.busId || selectedBus.id,
          studentIds: selectedStudentIds
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign students');
      setShowAssignModal(false);
      fetchBuses();
    } catch (err) {
      showToast(getFriendlyError(err, 'Failed to assign students.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = allStudents.filter(s =>
    !searchText || (s.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (s.className || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const inputStyle = {
    backgroundColor: C.navyMid || '#0d2137',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    color: C.white,
    padding: 12,
    fontSize: 14,
    marginBottom: 10
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 18 }}>Bus Management</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{buses.length} buses registered</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={{ backgroundColor: C.teal, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 13 }}>+ Add Bus</Text>
        </TouchableOpacity>
      </View>

      {/* Bus List */}
      {loading ? (
        <ActivityIndicator size="large" color={C.teal} style={{ marginTop: 40 }} />
      ) : buses.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🚌</Text>
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>No Buses Yet</Text>
          <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>Tap "+ Add Bus" to register your first school bus</Text>
        </View>
      ) : (
        <ScrollView style={{ paddingHorizontal: 20 }}>
          {buses.map((bus, i) => (
            <View key={i} style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>🚌 {bus.busNumber || bus.vehicleNo || 'Bus ' + (i + 1)}</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>ID: {bus.busId || bus.id}</Text>
                  {bus.route ? <Text style={{ color: C.muted, fontSize: 12 }}>Route: {bus.route}</Text> : null}
                  {bus.driverName ? <Text style={{ color: C.muted, fontSize: 12 }}>Driver: {bus.driverName}</Text> : null}
                  <Text style={{ color: C.teal, fontSize: 12, marginTop: 4 }}>
                    {(bus.studentIds || []).length} students assigned
                  </Text>
                </View>
                <View style={{ backgroundColor: bus.status === 'active' ? C.teal + '22' : C.muted + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                  <Text style={{ color: bus.status === 'active' ? C.teal : C.muted, fontSize: 11 }}>
                    {bus.status === 'active' ? '🟢 Active' : '⚪ Inactive'}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => openOnboardModal(bus)}
                  style={{ flex: 1, backgroundColor: C.teal + '22', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: C.teal + '44' }}
                >
                  <Text style={{ color: C.teal, fontSize: 12, fontWeight: '600' }}>👁 View Onboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openAssignModal(bus)}
                  style={{ flex: 1, backgroundColor: C.gold + '22', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: C.gold + '44' }}
                >
                  <Text style={{ color: C.gold, fontSize: 12, fontWeight: '600' }}>👥 Assign Students</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── ADD BUS MODAL ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.navy, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 17 }}>🚌 Add New Bus</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={{ color: C.muted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>BUS ID *</Text>
              <TextInput style={inputStyle} placeholder="e.g. BUS001" placeholderTextColor={C.muted} value={form.busId} onChangeText={t => setForm(f => ({ ...f, busId: t }))} />

              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>VEHICLE NUMBER *</Text>
              <TextInput style={inputStyle} placeholder="e.g. TN-07-1234" placeholderTextColor={C.muted} value={form.busNumber} onChangeText={t => setForm(f => ({ ...f, busNumber: t }))} />

              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>ROUTE NAME</Text>
              <TextInput style={inputStyle} placeholder="e.g. Route 7 - OMR" placeholderTextColor={C.muted} value={form.route} onChangeText={t => setForm(f => ({ ...f, route: t }))} />

              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>ROUTE ID</Text>
              <TextInput style={inputStyle} placeholder="e.g. ROUTE007" placeholderTextColor={C.muted} value={form.routeId} onChangeText={t => setForm(f => ({ ...f, routeId: t }))} />

              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>DRIVER NAME</Text>
              <TextInput style={inputStyle} placeholder="e.g. Suresh R" placeholderTextColor={C.muted} value={form.driverName} onChangeText={t => setForm(f => ({ ...f, driverName: t }))} />

              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>DRIVER ROLE ID</Text>
              <TextInput style={inputStyle} placeholder="e.g. DRV-1234" placeholderTextColor={C.muted} value={form.driverId} onChangeText={t => setForm(f => ({ ...f, driverId: t }))} />

              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>CLEANER NAME</Text>
              <TextInput style={inputStyle} placeholder="e.g. Kumar" placeholderTextColor={C.muted} value={form.cleanerName} onChangeText={t => setForm(f => ({ ...f, cleanerName: t }))} />

              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>CLEANER ROLE ID</Text>
              <TextInput style={inputStyle} placeholder="e.g. CLN-5678" placeholderTextColor={C.muted} value={form.cleanerId} onChangeText={t => setForm(f => ({ ...f, cleanerId: t }))} />

              <TouchableOpacity
                onPress={handleAddBus}
                disabled={saving}
                style={{ backgroundColor: C.teal, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 24, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? <ActivityIndicator color={C.white} /> : <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>Create Bus</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ASSIGN STUDENTS MODAL ── */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.navy, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 17 }}>👥 Assign Students</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {selectedBus?.busNumber} · {selectedStudentIds.length} selected
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Text style={{ color: C.muted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={{ ...inputStyle, marginBottom: 12 }}
              placeholder="Search students..."
              placeholderTextColor={C.muted}
              value={searchText}
              onChangeText={setSearchText}
            />

            {studentsLoading ? (
              <ActivityIndicator size="large" color={C.teal} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 340 }}>
                {filteredStudents.map((student, i) => {
                  const isSelected = selectedStudentIds.includes(student.studentId);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => toggleStudent(student.studentId)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                        borderBottomWidth: 1, borderBottomColor: C.border, gap: 12
                      }}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                        borderColor: isSelected ? C.teal : C.border,
                        backgroundColor: isSelected ? C.teal : 'transparent',
                        alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSelected && <Text style={{ color: C.white, fontSize: 13, fontWeight: '700' }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.white, fontSize: 13, fontWeight: '600' }}>{student.name}</Text>
                        <Text style={{ color: C.muted, fontSize: 11 }}>{student.className} · Roll {student.rollNumber}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={handleAssignStudents}
              disabled={saving}
              style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16, opacity: saving ? 0.6 : 1 }}
            >
              {saving
                ? <ActivityIndicator color={C.navy} />
                : <Text style={{ color: C.navy, fontWeight: '700', fontSize: 15 }}>Save — {selectedStudentIds.length} Students</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast {...toast} onHide={() => setToast(t => ({...t, visible: false}))} />

      {/* ── ONBOARD STUDENTS MODAL ── */}
      <Modal visible={showOnboardModal} transparent animationType="slide" onRequestClose={() => setShowOnboardModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.navy, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 17 }}>
                  🚌 {selectedBus?.busNumber} — Today's Onboard
                </Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {onboardStudents.length} students scanned today
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowOnboardModal(false)}>
                <Text style={{ color: C.muted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color={C.teal} style={{ marginVertical: 30 }} />
            ) : onboardStudents.length === 0 ? (
              <Text style={{ color: C.muted, textAlign: 'center', marginVertical: 30 }}>No students scanned today</Text>
            ) : (
              <ScrollView>
                {onboardStudents.map((student, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < onboardStudents.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                    <View>
                      <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>{student.studentName}</Text>
                      <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                        {student.status === 'Onboard' ? '🚌 On the bus' : '🏫 Arrived at school'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ backgroundColor: student.status === 'Onboard' ? C.teal + '22' : C.gold + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                        <Text style={{ color: student.status === 'Onboard' ? C.teal : C.gold, fontSize: 11, fontWeight: '600' }}>{student.status}</Text>
                      </View>
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                        {new Date(student.lastScan).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

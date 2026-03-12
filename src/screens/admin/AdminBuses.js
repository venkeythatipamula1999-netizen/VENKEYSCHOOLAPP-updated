import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, TextInput, BackHandler,
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

  const emptyForm = { busNumber: '', route: '', driverId: '', driverName: '', cleanerId: '', cleanerName: '' };
  const [form, setForm] = useState(emptyForm);

  const [drivers, setDrivers] = useState([]);
  const [cleaners, setCleaners] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [showCleanerPicker, setShowCleanerPicker] = useState(false);

  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

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

  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const res = await apiFetch('/logistics-staff');
      const data = await res.json();
      const staff = data.staff || [];
      setDrivers(staff.filter(s => s.type === 'driver'));
      setCleaners(staff.filter(s => s.type === 'cleaner'));
    } catch (e) {
      console.error('Failed to load staff:', e.message);
    } finally {
      setStaffLoading(false);
    }
  };

  const openAddModal = () => {
    setForm(emptyForm);
    setShowDriverPicker(false);
    setShowCleanerPicker(false);
    setShowAddModal(true);
    fetchStaff();
  };

  const selectDriver = (driver) => {
    setForm(f => ({ ...f, driverName: driver.full_name, driverId: driver.staff_id || driver.id }));
    setShowDriverPicker(false);
  };

  const selectCleaner = (cleaner) => {
    setForm(f => ({ ...f, cleanerName: cleaner.full_name, cleanerId: cleaner.staff_id || cleaner.id }));
    setShowCleanerPicker(false);
  };

  const handleAddBus = async () => {
    if (!form.busNumber.trim()) {
      showToast('Vehicle Number is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        busNumber: form.busNumber.trim(),
        route: form.route.trim(),
        driverId: form.driverId,
        driverName: form.driverName,
        cleanerId: form.cleanerId,
        cleanerName: form.cleanerName,
      };
      const res = await apiFetch('/admin/buses/add', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bus');
      setShowAddModal(false);
      setForm(emptyForm);
      fetchBuses();
      showToast(`Bus created! Bus ID: ${data.busId || data.id || ''}`, 'success');
    } catch (err) {
      showToast(getFriendlyError(err, 'Failed to create bus.'), 'error');
    } finally {
      setSaving(false);
    }
  };

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
    marginBottom: 10,
  };

  const pickerButtonStyle = {
    backgroundColor: C.navyMid || '#0d2137',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const nextRouteNumber = String(buses.length + 1).padStart(3, '0');

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
          onPress={openAddModal}
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
          <View style={{ backgroundColor: C.navy, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 17 }}>🚌 Add New Bus</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={{ color: C.muted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">

              {/* Vehicle Number */}
              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>VEHICLE NUMBER *</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. TN-07-1234"
                placeholderTextColor={C.muted}
                value={form.busNumber}
                onChangeText={t => setForm(f => ({ ...f, busNumber: t }))}
              />

              {/* Route Name + Route ID preview */}
              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>ROUTE NAME</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. Route 7 - OMR"
                placeholderTextColor={C.muted}
                value={form.route}
                onChangeText={t => setForm(f => ({ ...f, route: t }))}
              />
              <Text style={{ color: C.teal, fontSize: 11, marginTop: -6, marginBottom: 12 }}>
                Route ID will be: auto-generated (e.g. SG-Route-{nextRouteNumber})
              </Text>

              {/* Driver Dropdown */}
              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>DRIVER</Text>
              <TouchableOpacity
                style={pickerButtonStyle}
                onPress={() => { setShowDriverPicker(v => !v); setShowCleanerPicker(false); }}
              >
                <Text style={{ color: form.driverName ? C.white : C.muted, fontSize: 14 }}>
                  {form.driverName || (staffLoading ? 'Loading drivers...' : 'Select a driver')}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{showDriverPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDriverPicker && (
                <View style={{ backgroundColor: C.navyMid || '#0d2137', borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 10, maxHeight: 180 }}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {drivers.length === 0 ? (
                      <Text style={{ color: C.muted, padding: 12, fontSize: 13 }}>
                        {staffLoading ? 'Loading...' : 'No drivers found'}
                      </Text>
                    ) : drivers.map((d, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => selectDriver(d)}
                        style={{ padding: 12, borderBottomWidth: i < drivers.length - 1 ? 1 : 0, borderBottomColor: C.border }}
                      >
                        <Text style={{ color: C.white, fontSize: 14 }}>{d.full_name}</Text>
                        {d.staff_id ? <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>ID: {d.staff_id}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {form.driverId ? (
                <Text style={{ color: C.muted, fontSize: 11, marginTop: -6, marginBottom: 10 }}>Driver ID: {form.driverId}</Text>
              ) : null}

              {/* Cleaner Dropdown */}
              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>CLEANER</Text>
              <TouchableOpacity
                style={pickerButtonStyle}
                onPress={() => { setShowCleanerPicker(v => !v); setShowDriverPicker(false); }}
              >
                <Text style={{ color: form.cleanerName ? C.white : C.muted, fontSize: 14 }}>
                  {form.cleanerName || (staffLoading ? 'Loading cleaners...' : 'Select a cleaner')}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{showCleanerPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showCleanerPicker && (
                <View style={{ backgroundColor: C.navyMid || '#0d2137', borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 10, maxHeight: 180 }}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {cleaners.length === 0 ? (
                      <Text style={{ color: C.muted, padding: 12, fontSize: 13 }}>
                        {staffLoading ? 'Loading...' : 'No cleaners found'}
                      </Text>
                    ) : cleaners.map((c, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => selectCleaner(c)}
                        style={{ padding: 12, borderBottomWidth: i < cleaners.length - 1 ? 1 : 0, borderBottomColor: C.border }}
                      >
                        <Text style={{ color: C.white, fontSize: 14 }}>{c.full_name}</Text>
                        {c.staff_id ? <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>ID: {c.staff_id}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {form.cleanerId ? (
                <Text style={{ color: C.muted, fontSize: 11, marginTop: -6, marginBottom: 10 }}>Cleaner ID: {form.cleanerId}</Text>
              ) : null}

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
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 }}
                    >
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? C.teal : C.border, backgroundColor: isSelected ? C.teal : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
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

      <Toast {...toast} onHide={() => setToast(t => ({ ...t, visible: false }))} />

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

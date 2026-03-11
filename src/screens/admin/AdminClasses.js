import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../../api/client';
import AdminStudents from './AdminStudents';
import Toast from '../../components/Toast';
import { getFriendlyError } from '../../utils/errorMessages';

function AdminClasses({ onBack, currentUser, onNavigate }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ visible: true, message: msg, type });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setClasses([]);
    setLoading(true);
    try {
      const res = await apiFetch('/classes?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.classes) {
        const sorted = [...data.classes].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
        setClasses(sorted);
      } else {
        setClasses([]);
      }
    } catch (err) {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    const name = newClassName.trim();
    setSaving(true);
    try {
      const res = await apiFetch('/classes/add', {
        method: 'POST',
        body: JSON.stringify({ className: name }),
      });
      const data = await res.json();
      if (data.success) {
        const newEntry = { id: data.id, name, studentCount: 0 };
        setClasses(prev =>
          [...prev, newEntry].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        );
        setNewClassName('');
        setShowAddModal(false);
        fetchClasses();
      } else {
        showToast(data.error || 'Failed to add class', 'error');
      }
    } catch (err) {
      showToast(getFriendlyError(err, 'Error adding class.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (id) => {
    setClasses(prev => prev.filter(cls => cls.id !== id));
    try {
      const res = await apiFetch(`/classes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) fetchClasses();
    } catch (err) {
      fetchClasses();
    }
  };

  if (selectedClass) {
    return (
      <AdminStudents
        onBack={() => { setSelectedClass(null); fetchClasses(); }}
        classItem={selectedClass}
      />
    );
  }

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Icon name="back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Class Management</Text>
        <TouchableOpacity
          onPress={() => onNavigate && onNavigate('admin-student-qr')}
          style={{
            backgroundColor: C.teal + '22', borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 8,
            borderWidth: 1, borderColor: C.teal + '44',
            flexDirection: 'row', alignItems: 'center', gap: 6
          }}
        >
          <Text style={{ color: C.teal, fontWeight: '600', fontSize: 13 }}>⊙ QR Codes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={st.addBtn}>
          <Text style={{ color: C.navy, fontWeight: '700' }}>+ Add Class</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 50 }} />
        ) : classes.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 30 }}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>{'\uD83C\uDFEB'}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.white, marginBottom: 8 }}>
              No Classes Available
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 }}>
              Tap "+ Add Class" above to create your first class and section.
            </Text>
          </View>
        ) : (
          <View style={st.classGrid}>
            {classes.map(cls => (
              <TouchableOpacity
                key={cls.id}
                onPress={() => {
                  if (currentUser) currentUser.selectedClass = cls;
                  onNavigate('admin-students');
                }}
                style={st.classCard}
              >
                <LinearGradient colors={[C.navyLt, C.navyMid]} style={st.classGradient}>
                  <Text style={st.className}>{cls.name}</Text>
                  <Text style={st.classDetail}>{cls.studentCount || 0} Students</Text>
                  <View style={st.manageTag}>
                    <Text style={st.manageTagText}>Manage Students</Text>
                  </View>
                  <TouchableOpacity
                    onPress={e => {
                      e.stopPropagation && e.stopPropagation();
                      handleDeleteClass(cls.id);
                    }}
                    style={{ position: 'absolute', top: 10, right: 10 }}
                  >
                    <Icon name="close" size={14} color={C.coral} />
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Toast {...toast} onHide={() => setToast(t => ({...t, visible: false}))} />

      {showAddModal && (
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <Text style={st.modalTitle}>Add New Class</Text>
            <TextInput
              style={st.input}
              placeholder="e.g. 10-C"
              placeholderTextColor={C.muted}
              value={newClassName}
              onChangeText={setNewClassName}
              autoFocus
            />
            <View style={st.modalButtons}>
              <TouchableOpacity
                onPress={() => { setShowAddModal(false); setNewClassName(''); }}
                style={[st.modalBtn, { backgroundColor: C.border }]}
              >
                <Text style={{ color: C.white }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddClass}
                disabled={saving}
                style={[st.modalBtn, { backgroundColor: C.gold }]}
              >
                {saving
                  ? <ActivityIndicator size="small" color={C.navy} />
                  : <Text style={{ color: C.navy, fontWeight: '700' }}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: C.navyMid, gap: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.white, flex: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center',
  },
  addBtn: { backgroundColor: C.gold, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  classCard: { width: '47%', height: 140, borderRadius: 18, overflow: 'hidden' },
  classGradient: { flex: 1, padding: 15, justifyContent: 'center', alignItems: 'center' },
  className: { fontSize: 22, fontWeight: '800', color: C.white },
  classDetail: { fontSize: 12, color: C.muted, marginTop: 4 },
  manageTag: {
    marginTop: 10, backgroundColor: C.gold + '22',
    borderWidth: 1, borderColor: C.gold + '55',
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10,
  },
  manageTagText: { fontSize: 11, color: C.gold, fontWeight: '600' },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 1000,
  },
  modalContent: {
    backgroundColor: C.navyMid, width: '100%',
    borderRadius: 20, padding: 25, borderWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.white, marginBottom: 20 },
  input: {
    backgroundColor: C.navy, borderRadius: 12, padding: 15,
    color: C.white, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
});

export default AdminClasses;

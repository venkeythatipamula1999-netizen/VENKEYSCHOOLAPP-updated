import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

export default function AdminSettings({ onBack, currentUser }) {
  const [school, setSchool] = useState({
    name: 'Venkeys International School',
    tagline: 'Excellence in Education Since 1995',
    phone: '+91 44 2345 6789',
    email: 'info@venkeys.edu',
    board: 'CBSE',
    address: '123 School Road, Chennai - 600001',
    studentCount: '1200+',
    staffCount: '85+',
    yearsCount: '20+',
    galleryImages: [],
    website: '',
    principalName: '',
    foundedYear: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const boards = ['CBSE', 'ICSE', 'State Board (Tamil Nadu)', 'IB', 'Cambridge IGCSE'];
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/school-info')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.info) {
          setSchool(prev => ({ ...prev, ...data.info }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/school-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role-id': currentUser?.role_id || currentUser?.roleId || '' },
        body: JSON.stringify(school),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 500 * 1024) {
      alert('Image must be under 500KB. Please compress it first.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/school-info/upload-image', {
        method: 'POST',
        headers: { 'x-role-id': currentUser?.role_id || currentUser?.roleId || '' },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSchool(prev => ({
          ...prev,
          galleryImages: [...(prev.galleryImages || []), { url: data.imageUrl, name: file.name }]
        }));
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => {
    setSchool(prev => ({
      ...prev,
      galleryImages: (prev.galleryImages || []).filter((_, i) => i !== idx)
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.secHead}><Text style={styles.secTitle}>School Information</Text></View>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="small" color={C.gold} />
          ) : (
            <>
              {[
                ['School Name', 'name'],
                ['Tagline', 'tagline'],
                ['Principal Name', 'principalName'],
                ['Founded Year', 'foundedYear'],
                ['Phone', 'phone'],
                ['Email', 'email'],
                ['Website', 'website'],
                ['Address', 'address'],
                ['Student Count', 'studentCount'],
                ['Staff Count', 'staffCount'],
                ['Years of Excellence', 'yearsCount'],
              ].map(([lbl, key]) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={styles.label}>{lbl}</Text>
                  <TextInput style={styles.input} value={school[key] || ''} onChangeText={(v) => setSchool((p) => ({ ...p, [key]: v }))} placeholderTextColor={C.muted} placeholder={lbl} />
                </View>
              ))}
              <Text style={styles.label}>About / Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={school.description || ''}
                onChangeText={(v) => setSchool((p) => ({ ...p, description: v }))}
                placeholderTextColor={C.muted}
                placeholder="Brief description of the school..."
                multiline
              />
              <View style={{ marginBottom: 12 }} />
              <Text style={styles.label}>Board of Affiliation</Text>
              <TouchableOpacity onPress={() => setSelectedBoard(!selectedBoard)} style={styles.input}>
                <Text style={{ color: C.white, fontSize: 14 }}>{school.board || 'Select Board'}</Text>
              </TouchableOpacity>
              {selectedBoard && (
                <View style={{ marginTop: 4, backgroundColor: C.navyMid, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
                  {boards.map((b) => (
                    <TouchableOpacity key={b} onPress={() => { setSchool((p) => ({ ...p, board: b })); setSelectedBoard(false); }}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                      <Text style={{ color: school.board === b ? C.gold : C.white, fontSize: 13, fontWeight: school.board === b ? '700' : '400' }}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity onPress={save} disabled={saving} style={[styles.saveBtn, { backgroundColor: saved ? '#22d38a' : C.gold }]}>
                {saving ? (
                  <ActivityIndicator size="small" color={C.navy} />
                ) : (
                  <Text style={{ color: C.navy, fontWeight: '800', fontSize: 14 }}>{saved ? '\u2705 Saved!' : '\uD83D\uDCBE Save Settings'}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.secHead}><Text style={styles.secTitle}>School Gallery</Text></View>
        <View style={styles.card}>
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          )}
          <Text style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 18 }}>
            Upload photos of the school (max 500KB each). These appear on the Explore page for visitors.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            {(school.galleryImages || []).map((img, idx) => (
              <View key={idx} style={{ width: '47%', height: 100, borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
                <Image source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => removeImage(idx)}
                  style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="x" size={12} color={C.white} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={uploading}
              style={{ width: '47%', height: 100, borderRadius: 14, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: C.navyMid }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={C.gold} />
              ) : (
                <>
                  <Icon name="cam" size={24} color={C.muted} />
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: C.muted }}>
            {(school.galleryImages || []).length} photo{(school.galleryImages || []).length !== 1 ? 's' : ''} uploaded. Remember to tap Save Settings above after making changes.
          </Text>
        </View>

        <View style={styles.secHead}><Text style={styles.secTitle}>Roles & Permissions</Text></View>
        <View style={styles.card}>
          {[
            { role: 'Master Admin', perms: 'Full Access · All Modules', color: C.gold },
            { role: 'Teacher', perms: 'Attendance · Marks · Schedule', color: C.teal },
            { role: 'PET / Driver', perms: 'Bus Module · Pickup Logs', color: C.coral },
            { role: 'Parent', perms: 'View Only · Marks · Bus · Alerts', color: '#60a5fa' },
          ].map((r) => (
            <View key={r.role} style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: r.color + '22', borderColor: r.color + '44' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: r.color }}>{r.role}</Text>
              </View>
              <Text style={{ fontSize: 11, color: C.muted, flex: 1 }}>{r.perms}</Text>
            </View>
          ))}
        </View>

        <View style={styles.secHead}><Text style={styles.secTitle}>Notification Preferences</Text></View>
        <View style={styles.card}>
          {[['SMS Notifications', C.teal, true], ['Email Notifications', '#60a5fa', true], ['Push Notifications', C.purple, false]].map(([l, c, on]) => (
            <View key={l} style={styles.notifRow}>
              <Text style={{ fontSize: 13, color: C.white }}>{l}</Text>
              <View style={[styles.toggle, { backgroundColor: on ? c : C.border }]}>
                <View style={[styles.toggleDot, { left: on ? 21 : 3 }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '700', fontSize: 18, color: C.white },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  secHead: { marginBottom: 14, marginTop: 8 },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 14, color: C.white },
  saveBtn: { width: '100%', marginTop: 14, padding: 14, borderRadius: 14, alignItems: 'center' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, padding: 10, paddingHorizontal: 12, backgroundColor: C.navyMid, borderRadius: 12 },
  roleBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, flexShrink: 0 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  toggle: { width: 42, height: 24, borderRadius: 12, position: 'relative' },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.white, position: 'absolute', top: 3 },
});

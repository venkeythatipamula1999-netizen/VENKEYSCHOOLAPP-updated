import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Platform, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import Toast from '../../components/Toast';
import { getFriendlyError } from '../../utils/errorMessages';
import { apiFetch } from '../../api/client';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function AdminProfile({ onBack, currentUser, onLogout, onUpdateUser }) {
  const adminName = currentUser?.full_name || 'Principal';
  const adminEmail = currentUser?.email || '';
  const adminId = currentUser?.role_id || 'ADMIN';
  const initials = adminName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const [mobile, setMobile] = useState(currentUser?.mobile || '');
  const [bloodGroup, setBloodGroup] = useState(currentUser?.blood_group || '');
  const [showBGPicker, setShowBGPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ visible: true, message: msg, type });
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage || null);
  const [showChangePwd, setShowChangePwd] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await apiFetch('/admin/update-profile', {
        method: 'POST',
        body: JSON.stringify({ uid: currentUser?.uid, mobile, bloodGroup }),
      });
      const data = await resp.json();
      if (!resp.ok) { showToast(data.error || 'Update failed', 'error'); setSaving(false); return; }
      showToast('Profile updated successfully!');
      setEditing(false);
      if (onUpdateUser) onUpdateUser({ ...currentUser, mobile, blood_group: bloodGroup });
    } catch (err) {
      showToast(getFriendlyError(err, 'Network error. Please try again.'), 'error');
    }
    setSaving(false);
  };

  const handlePhotoUpload = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Photo must be under 5MB', 'error'); return; }
        setUploading(true);
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('uid', currentUser?.uid);
        try {
          const resp = await apiFetch('/admin/upload-photo', { method: 'POST', body: formData });
          const data = await resp.json();
          if (!resp.ok) { showToast(data.error || 'Upload failed', 'error'); setUploading(false); return; }
          setProfileImage(data.profileImage);
          if (onUpdateUser) onUpdateUser({ ...currentUser, profileImage: data.profileImage });
          showToast('Photo uploaded successfully!');
        } catch (err) {
          showToast(getFriendlyError(err, 'Upload failed. Please try again.'), 'error');
        }
        setUploading(false);
      };
      input.click();
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Principal Profile</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Account Settings</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <LinearGradient colors={[C.purple + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.purple + '44', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={handlePhotoUpload} disabled={uploading} activeOpacity={0.7}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={{ width: 90, height: 90, borderRadius: 45, marginBottom: 14, borderWidth: 3, borderColor: C.purple }} />
            ) : (
              <LinearGradient colors={[C.purple, '#9B7AD8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Text style={{ fontWeight: '800', fontSize: 30, color: C.white }}>{initials}</Text>
              </LinearGradient>
            )}
            {uploading ? (
              <View style={{ position: 'absolute', top: 0, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={C.white} />
              </View>
            ) : (
              <View style={{ position: 'absolute', bottom: 10, right: -4, backgroundColor: C.purple, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.navyMid }}>
                <Icon name="cam" size={14} color={C.white} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>{adminName}</Text>
          <Text style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Principal</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.purple + '26' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.purple }}>{adminId}</Text>
            </View>
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: 'rgba(52,211,153,0.15)' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#34D399' }}>Active</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
          {[
            { label: 'Full Name', value: adminName, icon: '\uD83D\uDC64' },
            { label: 'Email', value: adminEmail, icon: '\uD83D\uDCE7' },
            { label: 'Role', value: 'Principal (Admin)', icon: '\uD83C\uDF93' },
            { label: 'System ID', value: adminId, icon: '\uD83E\uDEAA' },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: 18, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 18 }}>{row.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.muted, fontSize: 11 }}>{row.label}</Text>
                <Text style={{ fontWeight: '600', fontSize: 14, marginTop: 2, color: C.white }}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: C.purple + '11', borderWidth: 1, borderColor: C.purple + '33', borderRadius: 20, padding: 18, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: C.purple, fontWeight: '700', fontSize: 14 }}>{'\u270F\uFE0F'} Editable Information</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)} style={{ paddingVertical: 5, paddingHorizontal: 14, borderRadius: 50, backgroundColor: C.purple + '22' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.purple }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: C.muted, fontSize: 11, marginBottom: 6, fontWeight: '600' }}>MOBILE NUMBER</Text>
            {editing ? (
              <TextInput
                value={mobile}
                onChangeText={t => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="Enter mobile number"
                placeholderTextColor={C.border}
                keyboardType="number-pad"
                maxLength={10}
                style={{ backgroundColor: C.navy, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: C.white, fontSize: 14 }}
              />
            ) : (
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.white }}>{mobile || 'Not set'}</Text>
            )}
          </View>

          <View style={{ marginBottom: editing ? 14 : 0 }}>
            <Text style={{ color: C.muted, fontSize: 11, marginBottom: 6, fontWeight: '600' }}>BLOOD GROUP</Text>
            {editing ? (
              <TouchableOpacity onPress={() => setShowBGPicker(!showBGPicker)} style={{ backgroundColor: C.navy, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: bloodGroup ? C.white : C.border, fontSize: 14 }}>{bloodGroup || 'Select blood group'}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{showBGPicker ? '\u25B2' : '\u25BC'}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.white }}>{bloodGroup || 'Not set'}</Text>
            )}
            {showBGPicker && editing && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {BLOOD_GROUPS.map(bg => (
                  <TouchableOpacity key={bg} onPress={() => { setBloodGroup(bg); setShowBGPicker(false); }}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: bloodGroup === bg ? C.purple : C.navyMid, borderWidth: 1, borderColor: bloodGroup === bg ? C.purple : C.border }}>
                    <Text style={{ color: bloodGroup === bg ? C.white : C.muted, fontWeight: '600', fontSize: 13 }}>{bg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {editing && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity onPress={() => { setEditing(false); setMobile(currentUser?.mobile || ''); setBloodGroup(currentUser?.blood_group || ''); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', fontSize: 14, color: C.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.purple, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                {saving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Toast {...toast} onHide={() => setToast(t => ({...t, visible: false}))} />

        <View style={{ gap: 10, marginTop: 6 }}>
          <TouchableOpacity
            onPress={() => setShowChangePwd(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 14 }}
          >
            <Icon name="lock" size={18} color={C.purple} />
            <Text style={{ fontWeight: '600', fontSize: 15, color: C.purple }}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onLogout}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.coral + '15', borderWidth: 1, borderColor: C.coral + '33', borderRadius: 16, paddingVertical: 14 }}
          >
            <Icon name="logout" size={18} color={C.coral} />
            <Text style={{ fontWeight: '600', fontSize: 15, color: C.coral }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ChangePasswordModal
        visible={showChangePwd}
        onClose={() => setShowChangePwd(false)}
        email={currentUser?.email}
        uid={currentUser?.uid}
        onLogout={onLogout}
        accentColor={C.purple}
      />
    </ScrollView>
  );
}

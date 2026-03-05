import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { C } from '../../theme/colors';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function CompleteProfileScreen({ currentUser, onComplete }) {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [mobile, setMobile] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showBGPicker, setShowBGPicker] = useState(false);

  const validatePhone = (num) => /^[6-9]\d{9}$/.test(num.replace(/\s/g, ''));

  const handleSave = async () => {
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!mobile.trim() || !validatePhone(mobile)) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!bloodGroup) {
      setErrorMsg('Please select your blood group');
      return;
    }
    if (!emergencyContact.trim() || !validatePhone(emergencyContact)) {
      setErrorMsg('Please enter a valid 10-digit emergency contact number');
      return;
    }
    if (mobile.replace(/\s/g, '') === emergencyContact.replace(/\s/g, '')) {
      setErrorMsg('Emergency contact must be different from your mobile number');
      return;
    }
    const d = parseInt(dobDay, 10);
    const m = parseInt(dobMonth, 10);
    const y = parseInt(dobYear, 10);
    if (!dobDay || !dobMonth || !dobYear || isNaN(d) || isNaN(m) || isNaN(y)) {
      setErrorMsg('Please enter your complete date of birth');
      return;
    }
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1940 || y > new Date().getFullYear()) {
      setErrorMsg('Please enter a valid date of birth');
      return;
    }
    const dobDate = new Date(y, m - 1, d);
    if (dobDate.getDate() !== d || dobDate.getMonth() !== m - 1 || dobDate.getFullYear() !== y) {
      setErrorMsg('Please enter a valid date of birth');
      return;
    }
    const dob = `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    setLoading(true);
    try {
      const res = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          docId: currentUser.id,
          fullName: fullName.trim(),
          mobile: mobile.replace(/\s/g, ''),
          bloodGroup,
          emergencyContact: emergencyContact.replace(/\s/g, ''),
          dateOfBirth: dob,
          role: currentUser.role,
          roleId: currentUser.role_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onComplete) {
          onComplete({
            ...currentUser,
            full_name: fullName.trim(),
            mobile: mobile.replace(/\s/g, ''),
            blood_group: bloodGroup,
            emergency_contact: emergencyContact.replace(/\s/g, ''),
            date_of_birth: dob,
            profileCompleted: true,
          });
        }
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = {
    principal: 'Principal',
    teacher: 'Teacher',
    parent: 'Parent',
    driver: 'Driver',
    cleaner: 'Cleaner',
    staff: 'Staff',
    student: 'Student',
  }[currentUser?.role] || 'User';

  const roleColor = {
    principal: C.purple,
    driver: C.teal,
    cleaner: C.gold,
  }[currentUser?.role] || C.gold;

  if (showSuccess) {
    return (
      <LinearGradient colors={[C.navyLt, C.navy]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 0.6 }} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: roleColor + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Icon name="check" size={40} color={roleColor} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.white, marginBottom: 10, textAlign: 'center' }}>Profile Verified</Text>
          <Text style={{ fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22 }}>
            Your profile has been saved successfully.{'\n'}Redirecting to your dashboard...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[C.navyLt, C.navy]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 0.6 }} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 50 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: roleColor + '25', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name="user" size={32} color={roleColor} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.white, marginBottom: 6 }}>Complete Your Profile</Text>
            <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 }}>
              Please fill in your details to continue
            </Text>
            <View style={{ marginTop: 10, backgroundColor: roleColor + '20', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: roleColor }}>{roleLabel} • {currentUser?.role_id || ''}</Text>
            </View>
          </View>

          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' }}>Personal Information</Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: C.white, marginBottom: 6 }}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={C.muted}
              style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 15, color: C.white, marginBottom: 16 }}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: C.white, marginBottom: 6 }}>Mobile Number</Text>
            <TextInput
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              maxLength={10}
              style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 15, color: C.white, marginBottom: 16 }}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: C.white, marginBottom: 6 }}>Blood Group</Text>
            <TouchableOpacity
              onPress={() => setShowBGPicker(true)}
              style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
            >
              <Text style={{ fontSize: 15, color: bloodGroup ? C.white : C.muted }}>
                {bloodGroup || 'Select blood group'}
              </Text>
              <Text style={{ fontSize: 12, color: C.muted }}>▼</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 13, fontWeight: '600', color: C.white, marginBottom: 6 }}>Date of Birth</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TextInput
                value={dobDay}
                onChangeText={(t) => setDobDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="DD"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                maxLength={2}
                style={{ flex: 1, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 15, color: C.white, textAlign: 'center' }}
              />
              <TextInput
                value={dobMonth}
                onChangeText={(t) => setDobMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="MM"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                maxLength={2}
                style={{ flex: 1, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 15, color: C.white, textAlign: 'center' }}
              />
              <TextInput
                value={dobYear}
                onChangeText={(t) => setDobYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="YYYY"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                maxLength={4}
                style={{ flex: 1.5, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 15, color: C.white, textAlign: 'center' }}
              />
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: C.white, marginBottom: 6 }}>Emergency Contact Number</Text>
            <TextInput
              value={emergencyContact}
              onChangeText={(t) => setEmergencyContact(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10-digit emergency contact"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              maxLength={10}
              style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 15, color: C.white }}
            />
          </View>

          {errorMsg ? (
            <View style={{ backgroundColor: C.coral + '20', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="alert" size={16} color={C.coral} />
              <Text style={{ color: C.coral, fontSize: 13, fontWeight: '600', marginLeft: 8, flex: 1 }}>{errorMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{ backgroundColor: roleColor, borderRadius: 16, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: currentUser?.role === 'driver' ? C.white : C.navy }}>
              {loading ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 14, lineHeight: 18 }}>
            This information is required for school records and emergency purposes.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showBGPicker} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowBGPicker(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 20, width: 300, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.white, marginBottom: 16, textAlign: 'center' }}>Select Blood Group</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => { setBloodGroup(bg); setShowBGPicker(false); }}
                  style={{
                    width: 60, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: bloodGroup === bg ? roleColor + '30' : C.navyMid,
                    borderWidth: 1.5,
                    borderColor: bloodGroup === bg ? roleColor : C.border,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: bloodGroup === bg ? roleColor : C.white }}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setShowBGPicker(false)}
              style={{ marginTop: 16, alignItems: 'center', padding: 10 }}
            >
              <Text style={{ color: C.muted, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

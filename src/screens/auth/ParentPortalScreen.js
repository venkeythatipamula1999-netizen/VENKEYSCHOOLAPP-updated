import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { C } from '../../theme/colors';
import { S } from '../../theme/styles';

const ROLES = [
  {
    id: 'parent',
    label: 'Parent',
    icon: '👨‍👩‍👧',
    accent: C.gold,
    idLabel: 'Student ID',
    idPlaceholder: 'e.g. STU17725247907682810',
    idHint: 'Find this on your child\'s school ID card',
    apiRole: 'parent',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    icon: '👩‍🏫',
    accent: C.teal,
    idLabel: 'Teacher ID',
    idPlaceholder: 'e.g. TCH-1234',
    idHint: 'Found on your appointment letter or staff card',
    apiRole: 'teacher',
  },
  {
    id: 'driver',
    label: 'Driver',
    icon: '🚌',
    accent: '#A78BFA',
    idLabel: 'Driver Staff ID',
    idPlaceholder: 'e.g. DRV-1234',
    idHint: 'Found on your appointment letter from admin',
    apiRole: 'driver',
  },
  {
    id: 'cleaner',
    label: 'Cleaner / Attender',
    icon: '🧹',
    accent: C.gold,
    idLabel: 'Cleaner Staff ID',
    idPlaceholder: 'e.g. CLN-1234',
    idHint: 'Found on your appointment letter from admin',
    apiRole: 'cleaner',
  },
];

function StrengthBar({ password }) {
  if (!password) return null;
  const has6 = password.length >= 6;
  const hasNum = /[0-9]/.test(password);
  const hasSpec = /[^a-zA-Z0-9]/.test(password);
  const score = [has6, hasNum, hasSpec].filter(Boolean).length;
  const colors = [C.coral, '#F59E0B', '#34D399'];
  const labels = ['Weak', 'Fair', 'Strong'];
  return (
    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < score ? colors[score - 1] : C.border }} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: colors[score - 1] || C.muted }}>Strength: {labels[score - 1] || 'Weak'}</Text>
    </View>
  );
}

export default function ParentPortalScreen({ onBack, onLoginSuccess, onNavigate, initialRole = 'parent' }) {
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const role = ROLES.find(r => r.id === selectedRole);
  const accent = role.accent;

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!studentId.trim()) { setError('Please enter your ' + role.idLabel); return; }

    setLoading(true);
    try {
      if (selectedRole === 'parent') {
        const checkRes = await fetch(`/api/parent/check-student?studentId=${encodeURIComponent(studentId.trim())}`);
        const checkData = await checkRes.json();
        if (!checkRes.ok) { setError(checkData.error || 'Student ID not found. Please check and try again.'); return; }
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: role.apiRole,
          roleId: studentId.trim(),
          ...(selectedRole === 'parent' ? {
            studentId: studentId.trim(),
            studentIds: [studentId.trim()],
            parentName: fullName.trim(),
            accountStatus: 'active',
          } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed. Please try again.'); return; }
      setDone(true);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <LinearGradient colors={[C.navyLt, C.navy]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 0.6 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: '#34D39922', borderWidth: 2, borderColor: '#34D39944', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 36 }}>{'✅'}</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#34D399', marginBottom: 10, textAlign: 'center' }}>Account Created!</Text>
        <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
          Welcome, <Text style={{ color: C.white, fontWeight: '700' }}>{fullName}</Text>!
        </Text>
        <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
          {selectedRole === 'parent'
            ? 'Your account is linked to Student ID:\n' + studentId
            : 'Your ' + role.label + ' account is ready.'}
          {'\n\n'}Please sign in to continue.
        </Text>
        <TouchableOpacity
          onPress={() => onNavigate && onNavigate('parent-login')}
          style={{ backgroundColor: accent, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ fontWeight: '800', fontSize: 16, color: C.navy }}>Go to Sign In</Text>
          <Icon name="arrow" size={16} color={C.navy} />
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[C.navyLt, C.navy]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 0.6 }} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

        <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={S.backBtn} onPress={onBack}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>Create Account</Text>
            <Text style={{ fontSize: 13, color: C.muted }}>Register to get started</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingBottom: 48, paddingTop: 12 }}>

          <View style={{ backgroundColor: C.navyMid, borderRadius: 18, padding: 4, flexDirection: 'row', gap: 3, marginBottom: 20 }}>
            {ROLES.map(r => {
              const active = r.id === selectedRole;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => { setSelectedRole(r.id); setStudentId(''); setError(''); }}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center', backgroundColor: active ? r.accent : 'transparent' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? C.navy : C.muted }}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: accent + '15', borderWidth: 1, borderColor: accent + '33', borderRadius: 14, padding: 12, marginBottom: 20 }}>
            <Text style={{ fontSize: 22 }}>{role.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: accent }}>
                {selectedRole === 'parent' ? 'Parent / Guardian' : selectedRole === 'teacher' ? 'Teacher / Staff' : 'Bus Driver'}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, lineHeight: 15 }}>
                {selectedRole === 'parent' ? "Register using your child's Student ID" : selectedRole === 'teacher' ? 'Use your Teacher ID from administration' : 'Use your Driver Staff ID from transport dept.'}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={{ backgroundColor: C.coral + '18', borderWidth: 1, borderColor: C.coral + '40', borderRadius: 14, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: C.coral, fontSize: 13, fontWeight: '600' }}>{error}</Text>
            </View>
          ) : null}

          <Text style={lbl}>Full Name</Text>
          <TextInput style={inp} placeholder="Enter your full name" placeholderTextColor={C.muted} value={fullName} onChangeText={setFullName} />

          <Text style={lbl}>Email</Text>
          <TextInput style={inp} placeholder="Enter your email" placeholderTextColor={C.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

          <Text style={lbl}>Password <Text style={{ color: C.muted, fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(min 6 characters)</Text></Text>
          <View style={{ position: 'relative', marginBottom: 0 }}>
            <TextInput style={[inp, { marginBottom: 0, paddingRight: 50 }]} placeholder="Min 6 characters" placeholderTextColor={C.muted} value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: 14 }}>
              <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          <StrengthBar password={password} />

          <Text style={[lbl, { marginTop: 8 }]}>Confirm Password</Text>
          <View style={{ position: 'relative', marginBottom: 4 }}>
            <TextInput
              style={[inp, { marginBottom: 0, paddingRight: 50, borderColor: confirmPassword && password !== confirmPassword ? C.coral + '80' : '#1E3052' }]}
              placeholder="Re-enter password"
              placeholderTextColor={C.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 14, top: 14 }}>
              <Text style={{ fontSize: 16 }}>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {confirmPassword && password !== confirmPassword ? (
            <Text style={{ color: C.coral, fontSize: 11, marginBottom: 10 }}>Passwords do not match</Text>
          ) : <View style={{ height: 14 }} />}

          <Text style={lbl}>{role.idLabel}</Text>
          <TextInput
            style={[inp, { fontFamily: 'monospace', letterSpacing: selectedRole === 'parent' ? 0.5 : 1, borderColor: accent + '60' }]}
            placeholder={role.idPlaceholder}
            placeholderTextColor={C.muted}
            value={studentId}
            onChangeText={setStudentId}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={{ fontSize: 11, color: C.muted, marginTop: -12, marginBottom: 20 }}>{'📋  '}{role.idHint}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
              {'Role: '}<Text style={{ color: accent, fontWeight: '700' }}>{role.label.toUpperCase()}</Text>
              {'  •  Data saved to Firebase Firestore'}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{ backgroundColor: accent, borderRadius: 16, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <ActivityIndicator color={C.navy} /> : (
              <>
                <Text style={{ fontWeight: '800', fontSize: 16, color: C.navy }}>Register</Text>
                <Icon name="arrow" size={17} color={C.navy} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const dest = selectedRole === 'teacher' ? 'teacher-login' : selectedRole === 'driver' ? 'driver-login' : selectedRole === 'cleaner' ? 'cleaner-login' : 'parent-login';
              onNavigate && onNavigate(dest);
            }}
            style={{ alignItems: 'center', paddingVertical: 4 }}
          >
            <Text style={{ color: C.muted, fontSize: 13 }}>
              Already have an account?{'  '}
              <Text style={{ color: accent, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const lbl = { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 };
const inp = { backgroundColor: '#122848', borderWidth: 1.5, borderColor: '#1E3052', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#FFFFFF', marginBottom: 16 };

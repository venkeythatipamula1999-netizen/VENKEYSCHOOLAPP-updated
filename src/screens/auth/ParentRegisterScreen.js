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
    color: C.gold,
    idLabel: 'Student ID',
    idPlaceholder: 'e.g. STU17725247907682810',
    idHint: 'Found on the school ID card or admission letter',
    apiRole: 'parent',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    icon: '👩‍🏫',
    color: C.teal,
    idLabel: 'Teacher ID',
    idPlaceholder: 'e.g. TCH-1234',
    idHint: 'Found on your appointment letter or staff card',
    apiRole: 'teacher',
  },
  {
    id: 'driver',
    label: 'Driver',
    icon: '🚌',
    color: '#A78BFA',
    idLabel: 'Driver Staff ID',
    idPlaceholder: 'e.g. DRV-1234',
    idHint: 'Found on your appointment letter or staff card',
    apiRole: 'driver',
  },
];

function PasswordStrength({ password }) {
  if (!password) return null;
  const has6 = password.length >= 6;
  const hasNum = /[0-9]/.test(password);
  const hasSpec = /[^a-zA-Z0-9]/.test(password);
  const score = [has6, hasNum, hasSpec].filter(Boolean).length;
  const colors = ['#FF6B6B', '#F59E0B', '#34D399'];
  const labels = ['Weak', 'Fair', 'Strong'];
  const color = colors[score - 1] || '#FF6B6B';
  const label = labels[score - 1] || 'Weak';
  return (
    <View style={{ marginTop: 8, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < score ? color : C.border }} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color }}>Strength: {label}</Text>
    </View>
  );
}

export default function ParentRegisterScreen({ onBack, onSuccess, onNavigate }) {
  const [selectedRole, setSelectedRole] = useState('parent');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const role = ROLES.find(r => r.id === selectedRole);
  const accentColor = role.color;

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!roleId.trim()) { setError('Please enter your ' + role.idLabel); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: role.apiRole,
          roleId: roleId.trim(),
          ...(selectedRole === 'parent' ? {
            studentId: roleId.trim(),
            studentIds: [roleId.trim()],
            parentName: fullName.trim(),
          } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed. Please try again.'); return; }
      setSuccess(true);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <LinearGradient colors={[C.navyLt, C.navy]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 0.6 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: '#34D39922', borderWidth: 2, borderColor: '#34D39944', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 38 }}>{'✅'}</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#34D399', marginBottom: 10, textAlign: 'center' }}>Account Created!</Text>
        <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
          Welcome, <Text style={{ color: C.white, fontWeight: '700' }}>{fullName}</Text>!
        </Text>
        <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
          {selectedRole === 'parent'
            ? 'Your parent account is linked to Student ID:\n' + roleId
            : 'Your ' + role.label.toLowerCase() + ' account is ready. You can now sign in.'}
        </Text>
        <TouchableOpacity
          onPress={() => onSuccess ? onSuccess() : onNavigate && onNavigate('parent-login')}
          style={{ backgroundColor: accentColor, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 8 }}
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

        <View style={{ padding: 12, paddingHorizontal: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={S.backBtn} onPress={onBack}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>Create Account</Text>
            <Text style={{ fontSize: 13, color: C.muted }}>Register to get started</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 48, paddingTop: 8 }}>

          <View style={{ backgroundColor: C.navyMid, borderRadius: 18, padding: 4, flexDirection: 'row', gap: 3, marginBottom: 22 }}>
            {ROLES.map(r => {
              const active = r.id === selectedRole;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => { setSelectedRole(r.id); setRoleId(''); setError(''); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: active ? r.color : 'transparent' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? C.navy : C.muted }}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: accentColor + '15', borderWidth: 1, borderColor: accentColor + '33', borderRadius: 14, padding: 12, marginBottom: 20 }}>
            <Text style={{ fontSize: 22 }}>{role.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: accentColor }}>
                {role.id === 'parent' ? 'Parent / Guardian' : role.id === 'teacher' ? 'Teacher / Staff' : 'Bus Driver'}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, lineHeight: 16 }}>
                {role.id === 'parent' ? "Register using your child's Student ID" : role.id === 'teacher' ? 'Use your Teacher ID issued by administration' : 'Use your Driver Staff ID from transportation dept.'}
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
          <TextInput style={inp} placeholder="Enter your email" placeholderTextColor={C.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <Text style={lbl}>Password <Text style={{ color: C.muted, fontWeight: '400', textTransform: 'none' }}>(min 6 characters)</Text></Text>
          <View style={{ position: 'relative', marginBottom: 4 }}>
            <TextInput style={[inp, { marginBottom: 0, paddingRight: 50 }]} placeholder="Min 6 characters" placeholderTextColor={C.muted} value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: 14 }}>
              <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          <PasswordStrength password={password} />

          <Text style={[lbl, { marginTop: 12 }]}>Confirm Password</Text>
          <View style={{ position: 'relative', marginBottom: 16 }}>
            <TextInput
              style={[inp, { marginBottom: 0, paddingRight: 50, borderColor: confirmPassword && password !== confirmPassword ? C.coral + '80' : C.border }]}
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
          {confirmPassword && password !== confirmPassword && (
            <Text style={{ color: C.coral, fontSize: 11, marginBottom: 12, marginTop: -12 }}>Passwords do not match</Text>
          )}

          <Text style={lbl}>{role.idLabel}</Text>
          <TextInput
            style={[inp, { fontFamily: 'monospace', letterSpacing: 1, borderColor: accentColor + '50' }]}
            placeholder={role.idPlaceholder}
            placeholderTextColor={C.muted}
            value={roleId}
            onChangeText={setRoleId}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={{ fontSize: 11, color: C.muted, marginTop: -12, marginBottom: 20 }}>{'📋 '}{role.idHint}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ fontSize: 11, color: C.muted }}>
              Role: <Text style={{ color: accentColor, fontWeight: '700' }}>{role.label.toUpperCase()}</Text>
              {'  •  '}Data saved to Firebase Firestore
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{ backgroundColor: accentColor, borderRadius: 16, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.7 : 1, marginBottom: 20 }}
          >
            {loading ? (
              <ActivityIndicator color={C.navy} />
            ) : (
              <>
                <Text style={{ fontWeight: '800', fontSize: 16, color: C.navy }}>Register</Text>
                <Icon name="arrow" size={17} color={C.navy} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onBack && onBack()} style={{ alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>
              Already have an account?{'  '}
              <Text style={{ color: accentColor, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const lbl = { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 };
const inp = { backgroundColor: '#122848', borderWidth: 1.5, borderColor: '#1E3052', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#FFFFFF', marginBottom: 16 };

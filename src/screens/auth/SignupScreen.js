import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { C } from '../../theme/colors';
import { S } from '../../theme/styles';
import { registerUser } from '../../api/client';

export default function SignupScreen({ onBack, onSignup }) {
  const [role, setRole] = useState('teacher');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isTeacher = role === 'teacher';
  const isDriver = role === 'driver';

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    }
  };

  const handleRegister = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName || !email || !password || !confirmPassword || !roleId) {
      setErrorMsg('Please fill in all fields');
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      showAlert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      console.log('Registering user:', { fullName, email, role, roleId });
      const data = await registerUser({ fullName, email, password, role, roleId });
      console.log('Registration response:', JSON.stringify(data));
      setSuccessMsg('Registration successful!');
      showAlert('Success', 'Registration successful!');
      if (onSignup) onSignup(data);
    } catch (err) {
      console.error('Registration error:', err.message);
      setErrorMsg(err.message || 'Registration failed. Please try again.');
      showAlert('Error', err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[C.navyLt, C.navy]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 0.6 }}
      style={{ flex: 1 }}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ padding: 12, paddingHorizontal: 20 }}>
          <TouchableOpacity style={S.backBtn} onPress={onBack}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40, flex: 1 }}>
          <View style={{ marginBottom: 36 }}>
            <Text style={{ fontSize: 30, fontWeight: '700', color: C.white, marginBottom: 8 }}>
              Create Account
            </Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>Register to get started</Text>
          </View>

          <View style={{ flexDirection: 'row', backgroundColor: C.navyMid, borderRadius: 12, padding: 4, gap: 4, marginBottom: 24 }}>
            {[
              { id: 'teacher', label: 'Teacher' },
              { id: 'parent', label: 'Parent' },
              { id: 'driver', label: 'Driver' },
            ].map(r => (
              <TouchableOpacity
                key={r.id}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 9,
                  alignItems: 'center',
                  backgroundColor: role === r.id ? (r.id === 'driver' ? C.teal : C.gold) : C.navyMid,
                }}
                onPress={() => setRole(r.id)}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: role === r.id ? (r.id === 'driver' ? C.white : C.navy) : C.muted,
                }}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {errorMsg ? (
            <View style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '55', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: C.coral, fontSize: 13, fontWeight: '600' }}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={{ backgroundColor: '#34D399' + '22', borderWidth: 1, borderColor: '#34D399' + '55', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '600' }}>{successMsg}</Text>
            </View>
          ) : null}

          <View style={{ gap: 18, marginBottom: 32 }}>
            <View>
              <Text style={S.label}>Full Name</Text>
              <TextInput
                style={S.inputField}
                placeholder="Enter your full name"
                placeholderTextColor={C.muted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
            <View>
              <Text style={S.label}>Email</Text>
              <TextInput
                style={S.inputField}
                placeholder="Enter your email"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View>
              <Text style={S.label}>Password</Text>
              <TextInput
                style={S.inputField}
                placeholder="Min 6 characters"
                placeholderTextColor={C.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <View>
              <Text style={S.label}>Confirm Password</Text>
              <TextInput
                style={S.inputField}
                placeholder="Re-enter password"
                placeholderTextColor={C.muted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            <View>
              <Text style={S.label}>{isTeacher ? 'Employee ID' : isDriver ? 'Driver ID' : 'Parent ID'}</Text>
              <TextInput
                style={S.inputField}
                placeholder={isTeacher ? 'e.g. TCH-2026-1234' : isDriver ? 'e.g. DRV-1234' : 'e.g. VISPAR001'}
                placeholderTextColor={C.muted}
                value={roleId}
                onChangeText={setRoleId}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={{ backgroundColor: C.navyMid, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.muted, fontSize: 11 }}>
              Role: <Text style={{ color: C.gold, fontWeight: '700' }}>{role.toUpperCase()}</Text>
              {' \u2022 '}Data saved to Firebase Firestore
            </Text>
          </View>

          <TouchableOpacity
            style={[S.btn, S.btnFull, isTeacher ? S.btnGold : S.btnTeal, { marginBottom: 16, opacity: loading ? 0.6 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={isTeacher ? S.btnTextDark : S.btnTextLight}>{loading ? 'Registering...' : 'Register'}</Text>
            <Icon name="arrow" size={16} color={isTeacher ? C.navy : C.white} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onBack}>
            <Text style={{ textAlign: 'center', color: C.muted, fontSize: 13 }}>
              Already have an account? <Text style={{ color: C.gold }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

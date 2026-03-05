import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { C } from '../../theme/colors';
import { S } from '../../theme/styles';

export default function ParentLoginScreen({ onLoginSuccess, onBack, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/parent/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Login failed. Please try again.'); return; }
      onLoginSuccess(data.user, data.requiresPIN);
    } catch {
      setErrorMsg('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOpen = () => {
    setResetEmail(email || '');
    setResetMsg('');
    setResetError('');
    setResetSent(false);
    setShowForgot(true);
  };

  const handleForgotClose = () => {
    setShowForgot(false);
    setResetEmail('');
    setResetMsg('');
    setResetError('');
    setResetSent(false);
  };

  const handleResetSubmit = async () => {
    setResetError('');
    setResetMsg('');
    if (!resetEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/parent/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setResetError(data.error || 'Failed to send reset email'); return; }
      setResetMsg(data.message || 'Reset link sent! Please check your inbox.');
      setResetSent(true);
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[C.navyLt, C.navy]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 0.6 }}
      style={{ flex: 1 }}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ padding: 12, paddingHorizontal: 20 }}>
          <TouchableOpacity style={S.backBtn} onPress={onBack}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40, flex: 1 }}>
          <View style={{ marginBottom: 36 }}>
            <View style={[S.chip, S.chipGold, { marginBottom: 16, alignSelf: 'flex-start' }]}>
              <Text style={[S.chipText, { color: C.gold }]}>
                {'👨‍👩‍👧 Parent Portal'}
              </Text>
            </View>
            <Text style={{ fontSize: 30, fontWeight: '700', color: C.white, marginBottom: 8 }}>
              Welcome Back
            </Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>Sign in to continue</Text>
          </View>

          {errorMsg ? (
            <View style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '55', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: C.coral, fontSize: 13, fontWeight: '600' }}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={{ gap: 18, marginBottom: 32 }}>
            <View>
              <Text style={S.label}>Email</Text>
              <TextInput
                style={S.inputField}
                placeholder="Enter your email"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
            <View>
              <Text style={S.label}>Password</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[S.inputField, { paddingRight: 50 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={C.muted}
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[S.btn, S.btnFull, S.btnTeal, { marginBottom: 16, opacity: loading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <>
                  <Text style={S.btnTextLight}>{loading ? 'Signing In...' : 'Sign In'}</Text>
                  <Icon name="arrow" size={16} color={C.white} />
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotOpen}>
            <Text style={{ textAlign: 'center', color: C.muted, fontSize: 13 }}>
              Forgot Password?{'  '}<Text style={{ color: C.gold, fontWeight: '600' }}>Reset</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('parent-portal')} style={{ marginTop: 16 }}>
            <Text style={{ textAlign: 'center', color: C.muted, fontSize: 13 }}>
              New here?{'  '}<Text style={{ color: C.gold }}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={handleForgotClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 22, padding: 24, width: '100%', maxWidth: 380 }}>
            {resetSent ? (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#22d38a22', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon name="check" size={32} color="#22d38a" />
                </View>
                <Text style={{ fontWeight: '800', fontSize: 18, color: C.white, marginBottom: 10, textAlign: 'center' }}>Email Sent!</Text>
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>{resetMsg}</Text>
                <TouchableOpacity onPress={handleForgotClose} style={{ backgroundColor: C.teal, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: C.white }}>Reset Password</Text>
                  <TouchableOpacity onPress={handleForgotClose} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" size={16} color={C.muted} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 20 }}>
                  Enter your registered email and we'll send you a link to reset your password.
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: C.muted, marginBottom: 6 }}>Registered Email</Text>
                <TextInput
                  style={{ width: '100%', padding: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 14, marginBottom: 4 }}
                  placeholder="e.g. parent@email.com"
                  placeholderTextColor={C.muted}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {resetError ? (
                  <View style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '44', borderRadius: 10, padding: 10, marginTop: 10 }}>
                    <Text style={{ color: C.coral, fontSize: 12, fontWeight: '600' }}>{resetError}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  onPress={handleResetSubmit}
                  disabled={resetLoading}
                  style={{ backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, marginTop: 16, alignItems: 'center', opacity: resetLoading ? 0.6 : 1 }}
                >
                  {resetLoading
                    ? <ActivityIndicator size="small" color={C.navy} />
                    : <Text style={{ color: C.navy, fontWeight: '700', fontSize: 14 }}>Send Reset Link</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

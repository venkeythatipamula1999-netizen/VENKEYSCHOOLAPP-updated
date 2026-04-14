import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, Image, StyleSheet, Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, CameraView } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '../../components/Icon';
import { C } from '../../theme/colors';
import { S } from '../../theme/styles';
import { apiFetch } from '../../api/client';
import { Platform } from 'react-native';

const PRODUCTION_URL = 'https://venkeyschoolapp-updated.replit.app';
const API_BASE = Platform.OS === 'web' ? '' : PRODUCTION_URL;

export default function ParentLoginScreen({ onLoginSuccess, onBack, onNavigate }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showForgot, setShowForgot]       = useState(false);
  const [resetEmail, setResetEmail]       = useState('');
  const [resetLoading, setResetLoading]   = useState(false);
  const [resetMsg, setResetMsg]           = useState('');
  const [resetError, setResetError]       = useState('');
  const [resetSent, setResetSent]         = useState(false);

  const [schoolName, setSchoolName]       = useState('');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState('');
  const [schoolInitials, setSchoolInitials] = useState('');

  const [scanning, setScanning]           = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned]             = useState(false);

  const [confirmModal, setConfirmModal]   = useState(false);
  const [confirmData, setConfirmData]     = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [showIdModal, setShowIdModal]     = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [idLookupLoading, setIdLookupLoading] = useState(false);
  const [idLookupError, setIdLookupError] = useState('');
  const [idStudentData, setIdStudentData] = useState(null);

  useEffect(() => {
    AsyncStorage.multiGet(['schoolName', 'schoolLogoUrl']).then(vals => {
      const name = vals[0][1] || '';
      const logo = vals[1][1] || '';
      setSchoolName(name);
      setSchoolLogoUrl(logo);
      setSchoolInitials(name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase());
    }).catch(() => {});
  }, []);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/parent/email-login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Login failed. Please try again.'); return; }
      if (data.token) {
        await AsyncStorage.setItem('authToken', data.token);
        const storedSchoolId = await AsyncStorage.getItem('schoolId');
        await AsyncStorage.setItem('schoolId', data.user?.schoolId || storedSchoolId || '');
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }
      onLoginSuccess(data.user, false, data.token);
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
      const res = await apiFetch('/parent/forgot-password', {
        method: 'POST',
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

  const openScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    setScanned(false);
    setScanning(true);
  };

  const handleStudentQRScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(100);
    setScanning(false);
    setConfirmLoading(true);
    setConfirmModal(true);
    try {
      const parsed = JSON.parse(data);
      if (parsed.type !== 'student') {
        setConfirmData({ error: 'This is not a student QR code. Please scan a student ID card.' });
        setConfirmLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/students/qr/${encodeURIComponent(parsed.studentId)}`);
      const student = await res.json();
      if (!res.ok || student.error) {
        setConfirmData({ error: student.error || 'Student not found.' });
      } else {
        setConfirmData(student);
      }
    } catch {
      setConfirmData({ error: 'Could not read QR code. Please try again.' });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmYes = async () => {
    if (!confirmData || confirmData.error) return;
    await AsyncStorage.multiSet([
      ['parentStudentId',   confirmData.studentId   || ''],
      ['parentStudentName', confirmData.studentName || ''],
      ['parentClassName',   confirmData.className   || ''],
    ]);
    setConfirmModal(false);
    if (onNavigate) onNavigate('parent-login');
  };

  const handleConfirmNo = () => {
    setConfirmModal(false);
    setConfirmData(null);
    setScanned(false);
  };

  const openIdModal = () => {
    setStudentIdInput('');
    setIdLookupError('');
    setIdStudentData(null);
    setShowIdModal(true);
  };

  const handleVerifyStudentId = async () => {
    const sid = studentIdInput.trim().toUpperCase();
    if (!sid) { setIdLookupError('Please enter a Student ID'); return; }
    setIdLookupError('');
    setIdStudentData(null);
    setIdLookupLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/students/verify/${encodeURIComponent(sid)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setIdLookupError(data.error || 'Student not found. Please check the ID.');
      } else {
        setIdStudentData(data);
      }
    } catch {
      setIdLookupError('Network error. Please try again.');
    } finally {
      setIdLookupLoading(false);
    }
  };

  const handleIdRegisterConfirm = async () => {
    if (!idStudentData) return;
    await AsyncStorage.multiSet([
      ['parentStudentId',   idStudentData.studentId   || ''],
      ['parentStudentName', idStudentData.studentName || ''],
      ['parentClassName',   idStudentData.className   || ''],
    ]);
    setShowIdModal(false);
    if (onNavigate) onNavigate('parent-portal');
  };

  if (scanning) {
    if (hasPermission === false) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: C.coral, fontSize: 15, textAlign: 'center', marginBottom: 20 }}>
            Camera permission denied. Please enable it in device settings.
          </Text>
          <TouchableOpacity onPress={() => setScanning(false)} style={{ padding: 16 }}>
            <Text style={{ color: C.teal, fontSize: 15 }}>← Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleStudentQRScanned}
        />
        <View style={st.scanOverlay}>
          <View style={st.scanFrame} />
          <Text style={st.scanHint}>Scan student ID card QR code</Text>
        </View>
        <TouchableOpacity onPress={() => setScanning(false)} style={st.scanClose}>
          <Text style={{ color: C.white, fontSize: 18, fontWeight: '700' }}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          {schoolName ? (
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              {schoolLogoUrl ? (
                <Image source={{ uri: schoolLogoUrl }} style={{ width: 50, height: 50, borderRadius: 10, marginBottom: 6 }} resizeMode="contain" />
              ) : schoolInitials ? (
                <View style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: C.navyLt, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Text style={{ color: C.teal, fontSize: 18, fontWeight: '800' }}>{schoolInitials}</Text>
                </View>
              ) : null}
              <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600' }}>{schoolName}</Text>
            </View>
          ) : null}

          <View style={{ marginBottom: 28 }}>
            <View style={[S.chip, S.chipGold, { marginBottom: 16, alignSelf: 'flex-start' }]}>
              <Text style={[S.chipText, { color: C.gold }]}>{'👨‍👩‍👧 Parent Portal'}</Text>
            </View>
            <Text style={{ fontSize: 30, fontWeight: '700', color: C.white, marginBottom: 8 }}>
              Welcome Back
            </Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>Sign in to continue</Text>
          </View>

          <TouchableOpacity
            style={{ backgroundColor: C.teal, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 10 }}
            onPress={openScanner}
          >
            <Text style={{ fontSize: 18 }}>📷</Text>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>Scan Student QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ borderWidth: 1.5, borderColor: C.teal, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 10 }}
            onPress={openIdModal}
          >
            <Text style={{ fontSize: 16 }}>🪪</Text>
            <Text style={{ color: C.teal, fontWeight: '700', fontSize: 14 }}>Enter Student ID Instead</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ color: C.muted, marginHorizontal: 14, fontSize: 13 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
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
                  <Text style={S.btnTextLight}>Sign In</Text>
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

      <Modal visible={showIdModal} transparent animationType="slide" onRequestClose={() => setShowIdModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: C.white }}>Register as Parent</Text>
              <TouchableOpacity onPress={() => setShowIdModal(false)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={16} color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
              Enter your child's Student ID (found on their school ID card or admission letter).
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: C.muted, marginBottom: 6 }}>Student ID</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
              <TextInput
                style={{ flex: 1, padding: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 14 }}
                placeholder="e.g. SPGOPA-0042"
                placeholderTextColor={C.muted}
                value={studentIdInput}
                onChangeText={t => { setStudentIdInput(t); setIdLookupError(''); setIdStudentData(null); }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={handleVerifyStudentId}
                disabled={idLookupLoading}
                style={{ backgroundColor: C.teal, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', opacity: idLookupLoading ? 0.6 : 1 }}
              >
                {idLookupLoading
                  ? <ActivityIndicator size="small" color={C.white} />
                  : <Text style={{ color: C.white, fontWeight: '700', fontSize: 13 }}>Verify</Text>}
              </TouchableOpacity>
            </View>
            {idLookupError ? (
              <View style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '44', borderRadius: 10, padding: 10, marginTop: 8 }}>
                <Text style={{ color: C.coral, fontSize: 12, fontWeight: '600' }}>{idLookupError}</Text>
              </View>
            ) : null}
            {idStudentData && (
              <View style={{ marginTop: 16 }}>
                <View style={{ backgroundColor: C.navyMid, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.teal + '44' }}>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>👦</Text>
                  <Text style={{ color: C.white, fontSize: 20, fontWeight: '800', marginBottom: 3 }}>{idStudentData.studentName}</Text>
                  <Text style={{ color: C.muted, fontSize: 13, marginBottom: 2 }}>Class {idStudentData.className}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>ID: {idStudentData.studentId}</Text>
                  {idStudentData.schoolName ? <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>🏫 {idStudentData.schoolName}</Text> : null}
                </View>
                <Text style={{ color: C.white, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>Is this your child?</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => { setIdStudentData(null); setStudentIdInput(''); }}
                    style={{ flex: 1, borderWidth: 1.5, borderColor: C.muted, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ color: C.muted, fontWeight: '700', fontSize: 14 }}>No, Re-enter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleIdRegisterConfirm}
                    style={{ flex: 1, backgroundColor: C.teal, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Yes, Register ✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={confirmModal} transparent animationType="slide" onRequestClose={handleConfirmNo}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, borderWidth: 1, borderColor: C.border }}>
            {confirmLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color={C.teal} />
                <Text style={{ color: C.muted, marginTop: 14 }}>Fetching student details...</Text>
              </View>
            ) : confirmData?.error ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
                <Text style={{ color: C.coral, fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 20 }}>{confirmData.error}</Text>
                <TouchableOpacity
                  onPress={handleConfirmNo}
                  style={{ backgroundColor: C.teal, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }}
                >
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : confirmData ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>🏫</Text>
                  <Text style={{ color: C.white, fontSize: 15, fontWeight: '600', flex: 1 }}>{confirmData.schoolName}</Text>
                </View>
                <View style={{ backgroundColor: C.navyMid, borderRadius: 16, padding: 18, marginBottom: 24 }}>
                  <Text style={{ fontSize: 32, marginBottom: 10 }}>👦</Text>
                  <Text style={{ color: C.white, fontSize: 22, fontWeight: '800', marginBottom: 4 }}>{confirmData.studentName}</Text>
                  <Text style={{ color: C.muted, fontSize: 14, marginBottom: 2 }}>Class {confirmData.className}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>ID: {confirmData.studentId}</Text>
                </View>
                <Text style={{ color: C.white, fontSize: 15, textAlign: 'center', marginBottom: 20 }}>
                  Is this your child?
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={handleConfirmNo}
                    style={{ flex: 1, borderWidth: 1.5, borderColor: C.muted, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ color: C.muted, fontWeight: '700', fontSize: 14 }}>No, Scan Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmYes}
                    style={{ flex: 1, backgroundColor: C.teal, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Yes ✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  scanFrame: {
    width: 240, height: 240,
    borderWidth: 3, borderColor: '#00B8A9', borderRadius: 16,
  },
  scanHint: {
    color: '#FFFFFF', fontSize: 14, marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  scanClose: {
    position: 'absolute', top: 52, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
});

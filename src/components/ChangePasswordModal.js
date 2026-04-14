import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Animated } from 'react-native';
import { C } from '../theme/colors';
import Icon from './Icon';
import { apiFetch } from '../api/client';
import ErrorBanner from './ErrorBanner';
import { getFriendlyError } from '../utils/errorMessages';

export default function ChangePasswordModal({ visible, onClose, email, uid, onLogout, accentColor }) {
  const accent = accentColor || C.gold;
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setLoading(false);
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getStrength = (pwd) => {
    if (!pwd) return { label: '', color: 'transparent', width: '0%' };
    if (pwd.length < 6) return { label: 'Too Short', color: C.coral, width: '20%' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: 'Weak', color: C.coral, width: '40%' };
    if (score === 2) return { label: 'Fair', color: C.gold, width: '60%' };
    if (score === 3) return { label: 'Good', color: C.teal, width: '80%' };
    return { label: 'Strong', color: '#34D399', width: '100%' };
  };

  const strength = getStrength(newPwd);

  const handleSubmit = async () => {
    setError('');

    if (!currentPwd.trim()) {
      setError('Please enter your current password');
      return;
    }
    if (!newPwd.trim()) {
      setError('Please enter a new password');
      return;
    }
    if (newPwd.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match');
      return;
    }
    if (currentPwd === newPwd) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const resp = await apiFetch('/change-password', {
        method: 'POST',
        body: JSON.stringify({ email, uid, currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to change password');
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        reset();
        onClose();
        if (onLogout) onLogout();
      }, 2000);
    } catch (err) {
      setError(getFriendlyError(err, 'Network error. Please try again.'));
      setLoading(false);
    }
  };

  const renderField = (label, value, setValue, showPwd, toggleShow, placeholder) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.navy, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14 }}>
        <Icon name="lock" size={16} color={C.muted} />
        <TextInput
          value={value}
          onChangeText={setValue}
          secureTextEntry={!showPwd}
          placeholder={placeholder}
          placeholderTextColor={C.border}
          style={{ flex: 1, color: C.white, fontSize: 14, paddingVertical: 13, paddingHorizontal: 10 }}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={toggleShow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name={showPwd ? 'check' : 'user'} size={16} color={C.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ width: '100%', maxWidth: 400, backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: accent + '15', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="lock" size={20} color={accent} />
                </View>
                <View>
                  <Text style={{ fontWeight: '700', fontSize: 17, color: C.white }}>Change Password</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Update your account security</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.muted, fontSize: 18, fontWeight: '700' }}>{'\u00D7'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {success ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#34D399' + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon name="check" size={32} color="#34D399" />
              </View>
              <Text style={{ fontWeight: '700', fontSize: 18, color: C.white, marginBottom: 8 }}>Password Changed!</Text>
              <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>You will be logged out shortly. Please sign in with your new password.</Text>
            </View>
          ) : (
            <View style={{ padding: 20 }}>
              {renderField('CURRENT PASSWORD', currentPwd, setCurrentPwd, showCurrent, () => setShowCurrent(!showCurrent), 'Enter current password')}
              {renderField('NEW PASSWORD', newPwd, setNewPwd, showNew, () => setShowNew(!showNew), 'Enter new password')}

              {newPwd.length > 0 && (
                <View style={{ marginTop: -10, marginBottom: 14 }}>
                  <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: 4, backgroundColor: strength.color, width: strength.width, borderRadius: 2 }} />
                  </View>
                  <Text style={{ color: strength.color, fontSize: 11, fontWeight: '600', marginTop: 4 }}>{strength.label}</Text>
                </View>
              )}

              {renderField('CONFIRM NEW PASSWORD', confirmPwd, setConfirmPwd, showConfirm, () => setShowConfirm(!showConfirm), 'Re-enter new password')}

              {confirmPwd.length > 0 && newPwd !== confirmPwd && (
                <Text style={{ color: C.coral, fontSize: 12, marginTop: -10, marginBottom: 10 }}>Passwords do not match</Text>
              )}

              <ErrorBanner message={error} onDismiss={() => setError('')} />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !currentPwd || !newPwd || !confirmPwd || newPwd.length < 6 || newPwd !== confirmPwd}
                style={{
                  backgroundColor: (loading || !currentPwd || !newPwd || !confirmPwd || newPwd.length < 6 || newPwd !== confirmPwd) ? C.border : accent,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <>
                    <Icon name="lock" size={16} color={accent === C.gold ? C.navy : C.white} />
                    <Text style={{ fontWeight: '700', fontSize: 15, color: accent === C.gold ? C.navy : C.white }}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

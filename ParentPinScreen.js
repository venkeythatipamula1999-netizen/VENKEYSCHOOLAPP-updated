import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import { S } from '../../theme/styles';
import Icon from '../../components/Icon';

export default function ParentPinScreen({ currentUser, onSuccess, onLogout }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showForgotPIN, setShowForgotPIN] = useState(false);

  const handleKeyPress = (key) => {
    if (pin.length >= 4) return;
    setPin(prev => prev + key);
    setError('');
  };

  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  const handleSubmit = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/parent/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        setError(newAttempts >= 3 ? 'Too many wrong attempts. Use Forgot PIN.' : (data.error || 'Incorrect PIN'));
        return;
      }
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (pin.length === 4 && !loading) {
      handleSubmit();
    }
  }, [pin]);

  const dots = [0, 1, 2, 3];
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']];

  return (
    <LinearGradient colors={[C.navyLt, C.navy]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 0.6 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.gold + '22', borderWidth: 1.5, borderColor: C.gold + '44', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 30 }}>{'🔐'}</Text>
      </View>

      <Text style={{ fontSize: 24, fontWeight: '800', color: C.white, marginBottom: 8, textAlign: 'center' }}>Enter PIN</Text>
      <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', marginBottom: 36 }}>
        {currentUser?.parentName ? `Welcome, ${currentUser.parentName}!` : 'Enter your 4-digit security PIN'}
      </Text>

      {error ? (
        <View style={{ backgroundColor: C.coral + '22', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: C.coral + '44', width: '100%', maxWidth: 280 }}>
          <Text style={{ color: C.coral, textAlign: 'center', fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 40 }}>
        {dots.map(i => (
          <View key={i} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i < pin.length ? C.gold : 'transparent', borderWidth: 2, borderColor: i < pin.length ? C.gold : C.border }} />
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={C.gold} style={{ marginBottom: 40 }} />
      ) : (
        <View style={{ width: '100%', maxWidth: 260 }}>
          {keys.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
              {row.map((k, ki) => (
                <TouchableOpacity
                  key={ki}
                  onPress={() => k === '⌫' ? handleDelete() : k ? handleKeyPress(k) : null}
                  disabled={!k}
                  style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: k ? (k === '⌫' ? C.navyMid : C.card) : 'transparent', borderWidth: k && k !== '⌫' ? 1 : 0, borderColor: C.border, alignItems: 'center', justifyContent: 'center', opacity: k ? 1 : 0 }}
                >
                  <Text style={{ fontSize: k === '⌫' ? 20 : 24, fontWeight: '700', color: k === '⌫' ? C.coral : C.white }}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity onPress={() => setShowForgotPIN(true)} style={{ marginTop: 12 }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>
          Forgot PIN? <Text style={{ color: C.gold, fontWeight: '700' }}>Reset via Email</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onLogout} style={{ marginTop: 16 }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>Sign out</Text>
      </TouchableOpacity>

      <Modal visible={showForgotPIN} transparent animationType="fade" onRequestClose={() => setShowForgotPIN(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: C.white, marginBottom: 12 }}>{'🔒'} Reset PIN</Text>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 20 }}>
              A password reset link was sent to{'\n'}<Text style={{ color: C.white, fontWeight: '700' }}>{currentUser?.email}</Text>{'\n\n'}After resetting your password, login again to set a new PIN.
            </Text>
            <TouchableOpacity onPress={() => setShowForgotPIN(false)} style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: C.navy, fontWeight: '800', fontSize: 15 }}>OK, I understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

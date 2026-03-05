import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

export default function AdminLoginScreen({ onLogin, onBack }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  return (
    <ScrollView style={styles.bg} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ padding: 12, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40, flex: 1 }}>
        <View style={{ marginBottom: 36 }}>
          <View style={styles.portalBadge}>
            <Text style={{ fontSize: 14 }}>{'\uD83D\uDC68\u200D\uD83D\uDCBC'}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.purple }}>Admin Portal</Text>
          </View>
          <Text style={styles.title}>Master Admin</Text>
          <Text style={{ color: C.muted, fontSize: 14 }}>Sign in to manage your school</Text>
        </View>

        <View style={{ gap: 18, marginBottom: 32 }}>
          <View>
            <Text style={styles.label}>Admin ID / Email</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@venkeys.edu"
              placeholderTextColor={C.muted}
              value={user}
              onChangeText={setUser}
              autoCapitalize="none"
            />
          </View>
          <View>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              placeholderTextColor={C.muted}
              value={pass}
              onChangeText={setPass}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity onPress={onLogin} style={styles.signInBtn}>
          <Text style={{ color: C.white, fontSize: 15, fontWeight: '700' }}>Sign In</Text>
          <Icon name="arrow" size={16} color={C.white} />
        </TouchableOpacity>

        <View style={styles.demoBox}>
          <Text style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Demo Login</Text>
          <Text style={{ fontSize: 13, color: C.white }}>Use any credentials to explore {'\u2728'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.navy },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' },
  portalBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.purple + '22', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: C.purple + '44', alignSelf: 'flex-start', marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '700', color: C.white, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 14, color: C.white },
  signInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.purple, borderRadius: 16, padding: 16, marginBottom: 16 },
  demoBox: { padding: 16, backgroundColor: C.navyMid, borderRadius: 14, borderWidth: 1, borderColor: C.border },
});

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { CLEANER_DEFAULT } from '../../data/cleaner';

export default function CleanerProfile({ onBack, currentUser, onLogout }) {
  const cleanerName = currentUser?.full_name || CLEANER_DEFAULT.name;
  const cleanerId = currentUser?.role_id || CLEANER_DEFAULT.id;
  const initials = cleanerName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const [showChangePwd, setShowChangePwd] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>My Profile</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Cleaner / Attender</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <LinearGradient colors={[C.gold + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.gold + '44', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16 }}>
          <LinearGradient colors={[C.gold, C.goldLt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Text style={{ fontWeight: '800', fontSize: 28, color: C.navy }}>{initials}</Text>
          </LinearGradient>
          <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>{cleanerName}</Text>
          <Text style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Bus Cleaner / Attender</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.gold + '26' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.gold }}>{'\uD83D\uDE8C'} {currentUser?.bus_number || CLEANER_DEFAULT.bus.number}</Text>
            </View>
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: 'rgba(52,211,153,0.15)' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#34D399' }}>{'\u2705'} Active</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
          {[
            { label: 'Employee ID', value: cleanerId, icon: '\uD83E\uDEAA' },
            { label: 'Phone', value: currentUser?.mobile || currentUser?.phone || CLEANER_DEFAULT.phone, icon: '\uD83D\uDCF1' },
            { label: 'Blood Group', value: currentUser?.blood_group || '-', icon: '\uD83E\uDE78' },
            { label: 'Emergency Contact', value: currentUser?.emergency_contact || '-', icon: '\uD83D\uDCDE' },
            { label: 'Experience', value: currentUser?.experience ? currentUser.experience + ' years' : CLEANER_DEFAULT.experience, icon: '\u23F1\uFE0F' },
            { label: 'Joined', value: currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : CLEANER_DEFAULT.joined, icon: '\uD83D\uDCC5' },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: 18, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 18 }}>{row.icon}</Text>
              <View>
                <Text style={{ color: C.muted, fontSize: 11 }}>{row.label}</Text>
                <Text style={{ fontWeight: '600', fontSize: 14, marginTop: 2, color: C.white }}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: C.gold + '11', borderWidth: 1, borderColor: C.gold + '33', borderRadius: 20, padding: 18, marginBottom: 14 }}>
          <Text style={{ color: C.gold, fontWeight: '700', fontSize: 14, marginBottom: 12 }}>{'\uD83D\uDE8C'} Assigned Bus</Text>
          {[
            { label: 'Number', value: currentUser?.bus_number || CLEANER_DEFAULT.bus.number },
            { label: 'Route', value: currentUser?.route || CLEANER_DEFAULT.bus.route },
            { label: 'Capacity', value: CLEANER_DEFAULT.bus.capacity + ' students' },
          ].map(r => (
            <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{r.label}</Text>
              <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{r.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 20 }}>
          <Text style={{ fontWeight: '600', fontSize: 14, marginBottom: 14, color: C.white }}>{'\uD83D\uDE8C'} Assigned Driver</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.teal + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: C.teal }}>{CLEANER_DEFAULT.driver.photo}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{CLEANER_DEFAULT.driver.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{CLEANER_DEFAULT.driver.id}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{CLEANER_DEFAULT.driver.phone}</Text>
            </View>
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.gold + '26' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.gold }}>{'\uD83D\uDE8C'} {currentUser?.bus_number || CLEANER_DEFAULT.bus.number}</Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={() => setShowChangePwd(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 14 }}
          >
            <Icon name="lock" size={18} color={C.gold} />
            <Text style={{ fontWeight: '600', fontSize: 15, color: C.gold }}>Change Password</Text>
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
        accentColor={C.gold}
      />
    </ScrollView>
  );
}

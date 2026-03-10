import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView, Modal } from 'react-native';
import { C } from '../theme/colors';

const DRAWER_WIDTH = 280;

const TEACHER_ITEMS = [
  { icon: '🏠', label: 'Dashboard',       screen: 'teacher-home' },
  { icon: '✓',  label: 'Attendance',      screen: 'teacher-attendance' },
  { icon: '📊', label: 'Marks',           screen: 'teacher-marks' },
  { icon: '🔔', label: 'Alerts',          screen: 'teacher-alerts' },
  { icon: '📅', label: 'Schedule',        screen: 'teacher-schedule' },
  { icon: '🚌', label: 'Bus Monitor',     screen: 'teacher-bus' },
  { divider: true },
  { icon: '📁', label: 'Send to Parents', screen: 'teacher-send-document' },
  { divider: true },
  { icon: '👤', label: 'Profile',         screen: 'teacher-profile' },
  { icon: '🚪', label: 'Logout',          action: 'logout' },
];

const ADMIN_ITEMS = [
  { icon: '🏠', label: 'Overview',        screen: 'admin-home' },
  { icon: '👥', label: 'Users',           screen: 'admin-users' },
  { icon: '🏫', label: 'Classes',         screen: 'admin-classes' },
  { icon: '🚌', label: 'Buses',           screen: 'admin-buses' },
  { icon: '📋', label: 'Leaves',          screen: 'admin-leaves' },
  { icon: '💰', label: 'Fees',            screen: 'admin-fees' },
  { icon: '💵', label: 'Payroll',         screen: 'admin-salary' },
  { icon: '📊', label: 'Reports',         screen: 'admin-reports' },
  { icon: '🔔', label: 'Alerts',          screen: 'admin-alerts' },
  { icon: '📅', label: 'Activities',      screen: 'admin-activities' },
  { divider: true },
  { icon: '📁', label: 'Send to Parents', screen: 'admin-send-document' },
  { divider: true },
  { icon: '⚙️', label: 'Settings',        screen: 'admin-settings' },
  { icon: '👤', label: 'Profile',         screen: 'admin-profile' },
  { icon: '🚪', label: 'Logout',          action: 'logout' },
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SideDrawer({ visible, onClose, currentUser, onNavigate, onLogout, role, currentScreen }) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const items = role === 'principal' ? ADMIN_ITEMS : TEACHER_ITEMS;
  const name = currentUser?.full_name || currentUser?.parentName || 'User';
  const roleLabel = role === 'principal' ? 'Principal' : 'Teacher';
  const schoolName = currentUser?.schoolName || 'Sree Pragathi High School';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.headerSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
            <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
            <Text style={styles.roleText}>{roleLabel} · {schoolName}</Text>
          </View>

          <View style={styles.dividerLine} />

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {items.map((item, index) => {
              if (item.divider) {
                return <View key={`div-${index}`} style={styles.dividerLine} />;
              }
              const isActive = item.screen && item.screen === currentScreen;
              const isLogout = item.action === 'logout';
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => {
                    if (isLogout) { onLogout(); }
                    else { onNavigate(item.screen); }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={[
                    styles.menuLabel,
                    isActive && styles.menuLabelActive,
                    isLogout && styles.menuLabelLogout,
                  ]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: C.navyMid,
    borderRightWidth: 1,
    borderRightColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
  },
  headerSection: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.gold + '33',
    borderWidth: 2,
    borderColor: C.gold + '66',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: C.gold,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    marginBottom: 3,
  },
  roleText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
  },
  dividerLine: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 1,
  },
  menuItemActive: {
    backgroundColor: C.gold + '1A',
  },
  menuIcon: {
    fontSize: 16,
    width: 28,
  },
  menuLabel: {
    fontSize: 14,
    color: C.white,
    fontWeight: '500',
    flex: 1,
  },
  menuLabelActive: {
    color: C.gold,
    fontWeight: '700',
  },
  menuLabelLogout: {
    color: C.coral,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
});

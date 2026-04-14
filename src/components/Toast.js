import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { C } from '../theme/colors';

export default function Toast({ message, type = 'success', visible, onHide }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide && onHide());
    }
  }, [visible]);

  if (!visible) return null;

  const bgColor = type === 'success' ? '#14532d' : type === 'error' ? '#2d1515' : '#1e3a5f';
  const borderColor = type === 'success' ? C.teal : type === 'error' ? C.coral : C.gold;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  return (
    <Animated.View style={[styles.toast, { opacity, backgroundColor: bgColor, borderLeftColor: borderColor }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    elevation: 10,
  },
  icon:    { fontSize: 16, fontWeight: '800', color: C.white },
  message: { flex: 1, color: C.white, fontSize: 13, fontWeight: '500' },
});

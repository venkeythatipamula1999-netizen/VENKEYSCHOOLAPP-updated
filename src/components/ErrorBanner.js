import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../theme/colors';

export default function ErrorBanner({ message, onDismiss, onRetry }) {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message} numberOfLines={3}>{message}</Text>
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#2d1515',
    borderLeftWidth: 3,
    borderLeftColor: C.coral,
    borderRadius: 10,
    padding: 12,
    margin: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon:    { fontSize: 16 },
  message: { flex: 1, color: '#fca5a5', fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  retryBtn:    { backgroundColor: C.coral, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  retryText:   { color: C.white, fontSize: 12, fontWeight: '700' },
  dismissBtn:  { padding: 4 },
  dismissText: { color: '#fca5a5', fontSize: 16, fontWeight: '700' },
});

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { C } from '../theme/colors';

export default function LoadingSpinner({ message = 'Loading...', size = 'large', fullScreen = false }) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={C.teal} />
        <Text style={styles.message}>{message}</Text>
      </View>
    );
  }
  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color={C.teal} />
      {message ? <Text style={styles.inlineMessage}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    color: C.muted,
    fontSize: 14,
    marginTop: 12,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  inlineMessage: {
    color: C.muted,
    fontSize: 13,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const BANNER_HEIGHT = 36;

export default function OfflineBanner() {
  const [status, setStatus] = useState('hidden');
  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const timerRef = useRef(null);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;

      if (!isConnected) {
        wasOfflineRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        setStatus('offline');
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setStatus('online');
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        timerRef.current = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -BANNER_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setStatus('hidden'));
        }, 2000);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (status === 'hidden') return null;

  const isOffline = status === 'offline';

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        backgroundColor: isOffline ? '#F59E0B' : '#22C55E',
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Text style={{ color: isOffline ? '#1A1A2E' : '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
        {isOffline ? "You're offline — changes may not save" : "Back online ✓"}
      </Text>
    </Animated.View>
  );
}

import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Platform } from 'react-native';

const LOGO_SIZE = 160;
const MAROON = '#8B0000';
const GOLD = '#C5A028';
const BG = '#FDFCFA';
const USE_NATIVE = Platform.OS !== 'web';

export default function SplashIntroScreen({ onFinish }) {
  const masterFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(masterFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 65,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(textFade, {
        toValue: 1,
        duration: 700,
        delay: 500,
        useNativeDriver: USE_NATIVE,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(masterFade, {
        toValue: 0,
        duration: 380,
        useNativeDriver: USE_NATIVE,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: masterFade }]}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoRing}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.textBlock, { opacity: textFade }]}>
        <View style={styles.divider} />
        <Text style={styles.schoolName}>SREE PRAGATHI</Text>
        <Text style={styles.schoolNameLine2}>HIGH SCHOOL</Text>
        <View style={styles.divider} />
        <Text style={styles.location}>◈  GOPALRAOPET  ◈</Text>
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: textFade }]}>
        Excellence · Integrity · Progress
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 600,
  },
  bgCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: MAROON + '08',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: GOLD + '10',
  },
  logoWrapper: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    width: LOGO_SIZE + 16,
    height: LOGO_SIZE + 16,
    borderRadius: (LOGO_SIZE + 16) / 2,
    borderWidth: 2,
    borderColor: GOLD + '55',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MAROON,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  divider: {
    width: 56,
    height: 1.5,
    backgroundColor: MAROON + '35',
    marginVertical: 10,
    borderRadius: 2,
  },
  schoolName: {
    fontSize: 27,
    fontWeight: '800',
    color: MAROON,
    letterSpacing: 3,
    textAlign: 'center',
  },
  schoolNameLine2: {
    fontSize: 20,
    fontWeight: '700',
    color: MAROON,
    letterSpacing: 5,
    textAlign: 'center',
    marginTop: 3,
  },
  location: {
    fontSize: 12,
    fontWeight: '600',
    color: GOLD,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 2,
  },
  tagline: {
    position: 'absolute',
    bottom: 40,
    fontSize: 10,
    color: MAROON + '55',
    letterSpacing: 2,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

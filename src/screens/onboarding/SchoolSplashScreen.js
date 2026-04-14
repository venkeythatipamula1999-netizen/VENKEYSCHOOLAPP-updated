import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../../theme/colors';

export default function SchoolSplashScreen({ onNavigate, currentUser }) {
  const [schoolName, setSchoolName]   = useState('');
  const [location, setLocation]       = useState('');
  const [tagline, setTagline]         = useState('');
  const [logoUrl, setLogoUrl]         = useState('');
  const [primaryColor, setPrimaryColor] = useState(C.teal);
  const [initials, setInitials]       = useState('VL');

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const [sName, sLoc, sTag, sLogo, sColor] = await AsyncStorage.multiGet([
          'schoolName', 'schoolLocation', 'schoolTagline', 'schoolLogoUrl', 'schoolPrimaryColor',
        ]);
        const name = sName[1] || 'Vidyalayam';
        const loc  = sLoc[1]  || '';
        const tag  = sTag[1]  || 'Excellence in Education';
        const logo = sLogo[1] || '';
        const col  = sColor[1] || C.teal;

        setSchoolName(name);
        setLocation(loc);
        setTagline(tag);
        setLogoUrl(logo);
        setPrimaryColor(col);
        setInitials(name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'VL');
      } catch {}
    })();

    Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(async () => {
      try {
        const token    = await AsyncStorage.getItem('authToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token && userData) {
          const user = JSON.parse(userData);
          const role = user.role;
          if (role === 'principal')                       onNavigate('admin-home');
          else if (role === 'driver')                     onNavigate('driver-home');
          else if (role === 'cleaner')                    onNavigate('cleaner-home');
          else if (role === 'teacher' || role === 'staff') onNavigate('teacher-home');
          else                                            onNavigate('parent-home');
        } else {
          onNavigate('splash');
        }
      } catch {
        onNavigate('splash');
      }
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  const barWidth = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[st.container, { backgroundColor: '#0a1628' }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={[st.logo, { borderColor: primaryColor }]}
            resizeMode="contain"
          />
        ) : (
          <View style={[st.initialsCircle, { backgroundColor: primaryColor + '33', borderColor: primaryColor }]}>
            <Text style={[st.initialsText, { color: primaryColor }]}>{initials}</Text>
          </View>
        )}

        <Text style={st.schoolName}>{schoolName}</Text>
        {location ? (
          <Text style={st.location}>{location}</Text>
        ) : null}
        {tagline ? (
          <Text style={[st.tagline, { color: primaryColor }]}>{tagline}</Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 40, paddingBottom: 60 }}>
        <View style={st.progressBg}>
          <Animated.View style={[st.progressFill, { width: barWidth, backgroundColor: primaryColor }]} />
        </View>
        <Text style={st.poweredBy}>Powered by Vidyalayam</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
  },
  logo: {
    width: 120, height: 120, borderRadius: 24, borderWidth: 2, marginBottom: 28,
  },
  initialsCircle: {
    width: 120, height: 120, borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  initialsText: {
    fontSize: 42, fontWeight: '900',
  },
  schoolName: {
    fontSize: 28, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', marginBottom: 8, lineHeight: 34,
  },
  location: {
    fontSize: 14, color: '#8A9DBB', textAlign: 'center', marginBottom: 10,
  },
  tagline: {
    fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 4,
  },
  progressBg: {
    height: 4, backgroundColor: '#213D62', borderRadius: 2, overflow: 'hidden', marginBottom: 24,
  },
  progressFill: {
    height: '100%', borderRadius: 2,
  },
  poweredBy: {
    color: '#8A9DBB', fontSize: 12, textAlign: 'center',
  },
});

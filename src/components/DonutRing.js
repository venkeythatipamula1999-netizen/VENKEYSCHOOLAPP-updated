import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../theme/colors';

export default function DonutRing({ pct, color, size = 80, stroke = 9, label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const subText = sublabel;

  return (
    <View style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {label && <Text style={{ fontWeight: '800', fontSize: size > 70 ? 16 : 12, color: C.white, lineHeight: size > 70 ? 18 : 14 }}>{label}</Text>}
        {subText && <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{subText}</Text>}
      </View>
    </View>
  );
}

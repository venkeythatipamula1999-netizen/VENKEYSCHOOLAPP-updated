import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { DRIVER_DEFAULT, TODAY_SCANS } from '../../data/driver';

export default function DriverScans({ onBack }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? TODAY_SCANS : TODAY_SCANS.filter(s => s.type === filter);

  const filters = [
    { key: 'all', label: 'All (' + TODAY_SCANS.length + ')', chipBg: C.gold + '26', chipColor: C.gold },
    { key: 'board', label: 'Boarded (' + TODAY_SCANS.filter(s => s.type === 'board').length + ')', chipBg: C.teal + '26', chipColor: C.teal },
    { key: 'alight', label: 'Alighted (' + TODAY_SCANS.filter(s => s.type === 'alight').length + ')', chipBg: C.coral + '26', chipColor: C.coral },
  ];

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Today's Scans</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Scanned by {DRIVER_DEFAULT.cleaner.name}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: filter === f.key ? f.chipBg : C.navyMid }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.key ? f.chipColor : C.muted }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.map((scan, i) => (
          <View key={scan.id} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{ alignItems: 'center', width: 16, paddingTop: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: scan.type === 'board' ? C.teal : C.coral, flexShrink: 0 }} />
              {i < filtered.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: C.border, marginTop: 4, borderRadius: 2 }} />}
            </View>
            <View style={{ flex: 1, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: scan.type === 'board' ? C.teal : C.coral, borderRadius: 14, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: scan.type === 'board' ? C.teal + '22' : C.coral + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: scan.type === 'board' ? C.teal : C.coral }}>{scan.photo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{scan.student}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{scan.cls}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: scan.type === 'board' ? C.teal : C.coral }}>{scan.time}</Text>
                  <View style={{ paddingVertical: 3, paddingHorizontal: 7, borderRadius: 50, backgroundColor: scan.type === 'board' ? C.teal + '26' : C.coral + '26', marginTop: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: scan.type === 'board' ? C.teal : C.coral }}>{scan.type === 'board' ? 'Boarded' : 'Alighted'}</Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                <Icon name="location" size={12} color={C.muted} />
                <Text style={{ color: C.muted, fontSize: 11 }}>{scan.stop}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ backgroundColor: C.gold + '11', borderWidth: 1, borderColor: C.gold + '33', borderRadius: 14, padding: 14, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.gold + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: C.gold }}>{DRIVER_DEFAULT.cleaner.photo}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: C.muted }}>All scans handled by</Text>
              <Text style={{ fontWeight: '700', fontSize: 14, color: C.gold }}>{DRIVER_DEFAULT.cleaner.name} · {DRIVER_DEFAULT.cleaner.id}</Text>
            </View>
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.teal + '26' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.teal }}>{'\uD83D\uDE8C'} {DRIVER_DEFAULT.bus.number}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

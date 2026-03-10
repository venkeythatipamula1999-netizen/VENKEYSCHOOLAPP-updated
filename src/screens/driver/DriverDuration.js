import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DRIVER_DEFAULT } from '../../data/driver';
import { apiFetch } from '../../api/client';

export default function DriverDuration({ onBack, currentUser }) {
  const driverId = currentUser?.role_id || DRIVER_DEFAULT.id;
  const busNumber = currentUser?.bus_number || DRIVER_DEFAULT.bus.number;

  const [weekOffset, setWeekOffset] = useState(0);
  const [days, setDays] = useState([]);
  const [summary, setSummary] = useState({ avgMorning: 0, avgEvening: 0, totalToday: 0 });
  const [loading, setLoading] = useState(true);
  const [weekLabel, setWeekLabel] = useState('This week');

  const loadWeekData = useCallback(async (offset) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/bus/trip-duration-week?driverId=${encodeURIComponent(driverId)}&weekOffset=${offset}`);
      const data = await res.json();
      if (data.days) {
        setDays(data.days);
        setSummary(data.summary || { avgMorning: 0, avgEvening: 0, totalToday: 0 });
        if (offset === 0) {
          setWeekLabel('This week');
        } else if (offset === -1) {
          setWeekLabel('Last week');
        } else {
          const firstDate = data.weekDates?.[0] || '';
          setWeekLabel(firstDate ? `Week of ${firstDate.slice(5).replace('-', '/')}` : `${Math.abs(offset)}w ago`);
        }
      }
    } catch (e) {
      console.error('Trip duration week fetch error:', e.message);
    }
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    loadWeekData(weekOffset);
  }, [weekOffset, loadWeekData]);

  const maxVal = days.length > 0 ? Math.max(...days.map(d => Math.max(d.morning, d.evening)), 1) : 1;

  const fmtMin = (v) => v > 0 ? `${v} min` : '—';

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Trip Duration</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{weekLabel} – {busNumber}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={() => setWeekOffset(w => w - 1)}
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: C.white, fontSize: 16, lineHeight: 20 }}>{'\u2039'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWeekOffset(w => Math.min(w + 1, 0))}
            disabled={weekOffset >= 0}
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', opacity: weekOffset >= 0 ? 0.35 : 1 }}
          >
            <Text style={{ color: C.white, fontSize: 16, lineHeight: 20 }}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        {loading ? (
          <LoadingSpinner message="Loading trip data..." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Avg Morning', val: summary.avgMorning > 0 ? `${summary.avgMorning} min` : '—', color: C.gold, bg: C.gold + '11' },
                { label: 'Avg Evening', val: summary.avgEvening > 0 ? `${summary.avgEvening} min` : '—', color: C.teal, bg: C.teal + '11' },
                { label: 'Total Today', val: summary.totalToday > 0 ? `${summary.totalToday} min` : '—', color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderWidth: 1, borderColor: s.color + '33', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: s.color }}>{s.val}</Text>
                  <Text style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <Text style={{ fontWeight: '600', fontSize: 15, marginBottom: 10, color: C.white }}>Weekly Overview</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: C.gold }} />
                <Text style={{ fontSize: 11, color: C.muted }}>Morning</Text>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: C.teal, marginLeft: 8 }} />
                <Text style={{ fontSize: 11, color: C.muted }}>Evening</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 }}>
                {days.map(d => (
                  <View key={d.date} style={{ flex: 1, alignItems: 'center', height: '100%' }}>
                    <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%', gap: 2 }}>
                      <View style={{ height: d.morning > 0 ? (d.morning / maxVal) * 75 : 0, backgroundColor: d.isToday ? '#F5C842' : C.gold, borderTopLeftRadius: 5, borderTopRightRadius: 5, minHeight: d.morning > 0 ? 4 : 0 }} />
                      <View style={{ height: d.evening > 0 ? (d.evening / maxVal) * 75 : 0, backgroundColor: d.isToday ? '#00D4C4' : C.teal, borderTopLeftRadius: 5, borderTopRightRadius: 5, minHeight: d.evening > 0 ? 4 : 0 }} />
                    </View>
                    <Text style={{ fontSize: 9, color: d.isToday ? C.white : C.muted, marginTop: 5, fontWeight: d.isToday ? '700' : '400' }}>{d.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {days.map(d => (
              <View key={d.date} style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: d.isToday ? C.teal : C.border, borderRadius: 14, padding: 12, paddingHorizontal: 16, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: d.isToday ? C.teal : C.white }}>{d.label}</Text>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <Text style={{ fontSize: 12, color: d.morning > 0 ? C.gold : C.muted }}>{'\uD83C\uDF05'} {fmtMin(d.morning)}</Text>
                    <Text style={{ fontSize: 12, color: d.evening > 0 ? C.teal : C.muted }}>{'\uD83C\uDF07'} {fmtMin(d.evening)}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ flex: Math.max(d.morning, 1), height: 5, backgroundColor: d.morning > 0 ? C.gold : C.border, borderRadius: 99, opacity: d.morning > 0 ? 0.85 : 0.3 }} />
                  <View style={{ flex: Math.max(d.evening, 1), height: 5, backgroundColor: d.evening > 0 ? C.teal : C.border, borderRadius: 99, opacity: d.evening > 0 ? 0.75 : 0.3 }} />
                </View>
              </View>
            ))}

            {days.every(d => d.morning === 0 && d.evening === 0) && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: C.muted, fontSize: 14 }}>No trips recorded this week yet.</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Data will appear automatically after completing a trip.</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

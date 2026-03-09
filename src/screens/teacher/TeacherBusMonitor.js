import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

const statusColor = s => {
  if (s === 'active') return C.teal;
  if (s === 'completed') return '#34D399';
  return C.gold;
};
const statusLabel = s => {
  if (s === 'active') return 'En Route';
  if (s === 'completed') return 'Returned';
  return 'At School';
};
const statusBg = s => {
  if (s === 'active') return 'rgba(0,184,169,0.15)';
  if (s === 'completed') return 'rgba(52,211,153,0.15)';
  return 'rgba(232,162,26,0.15)';
};

export default function TeacherBusMonitor({ onBack }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchTrips = () => {
    setLoading(true);
    fetch('/api/bus/active-trips')
      .then(r => r.json())
      .then(data => {
        setTrips(data.trips || []);
        setLastRefresh(new Date());
      })
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 30000);
    return () => clearInterval(interval);
  }, []);

  const active = trips.filter(t => t.status === 'active');
  const totalStudents = trips.reduce((sum, t) => sum + (t.totalStudents || t.studentCount || 0), 0);

  const formatTime = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Bus Monitor</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {lastRefresh ? 'Updated ' + formatTime(lastRefresh) : 'Live View'}
          </Text>
        </View>
        <TouchableOpacity onPress={fetchTrips} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="refresh" size={16} color={C.teal} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { val: String(trips.length), lbl: 'Total Routes', c: C.gold },
            { val: String(totalStudents || '—'), lbl: 'Students', c: C.teal },
            { val: String(active.length), lbl: 'En Route', c: active.length > 0 ? C.coral : C.muted },
          ].map(m => (
            <View key={m.lbl} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '700', color: m.c }}>{m.val}</Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'center' }}>{m.lbl}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={C.teal} style={{ marginTop: 40 }} />
        ) : trips.length === 0 ? (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 40, alignItems: 'center', marginTop: 20 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{'🚌'}</Text>
            <Text style={{ fontWeight: '600', fontSize: 16, color: C.white, marginBottom: 6 }}>No Active Trips</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No buses are currently active. Check back during pickup or drop-off times.</Text>
          </View>
        ) : (
          trips.map((t, i) => {
            const color = statusColor(t.status);
            return (
              <View key={t.id || i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="bus" size={20} color={color} />
                    </View>
                    <View>
                      <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>
                        {t.route || t.busRoute || ('Bus ' + (t.busNumber || t.vehicleNo || i + 1))}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>
                        {t.driverName ? 'Driver: ' + t.driverName : t.busNumber || t.vehicleNo || ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: statusBg(t.status) }}>
                    {t.status === 'active' && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal }} />}
                    <Text style={{ fontSize: 12, fontWeight: '600', color }}>{statusLabel(t.status)}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {(t.totalStudents || t.studentCount) ? (
                    <Text style={{ fontSize: 12, color: C.muted }}>{'👥 '}{t.totalStudents || t.studentCount} students</Text>
                  ) : null}
                  {t.startTime && (
                    <Text style={{ fontSize: 12, color: C.muted }}>{'🕐 '}{t.tripType === 'evening' ? 'Evening' : 'Morning'} · {formatTime(t.startTime)}</Text>
                  )}
                </View>

                {t.lastLat && t.lastLng ? (
                  <View style={{ width: '100%', height: 200, borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
                    <WebView
                      source={{
                        uri: `https://maps.google.com/maps?q=${t.lastLat},${t.lastLng}&z=15&output=embed`
                      }}
                      style={{ flex: 1 }}
                      scrollEnabled={false}
                    />
                  </View>
                ) : (
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>📍 Location not available</Text>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

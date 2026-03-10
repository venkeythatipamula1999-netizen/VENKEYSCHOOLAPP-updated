import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildWeekDates() {
  const now = new Date(Date.now() + 330 * 60000);
  const todayStr = now.toISOString().slice(0, 10);
  const dow = now.getUTCDay();
  const mondayShift = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now.getTime() + mondayShift * 86400000);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday.getTime() + i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    return { date: dateStr, label: dateStr === todayStr ? 'Today' : DAY_LABELS[i], isToday: dateStr === todayStr };
  });
}

function minsToHM(mins) {
  if (!mins || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CleanerDuration({ onBack, currentUser }) {
  const cleanerId = currentUser?.role_id || '';

  const [dutyData, setDutyData] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDates = buildWeekDates();

  useEffect(() => {
    if (!cleanerId) { setLoading(false); return; }

    apiFetch(`/duty/status?roleId=${encodeURIComponent(cleanerId)}`)
      .then(r => r.json())
      .then(data => setDutyData(data))
      .catch(() => {});

    Promise.all(
      weekDates.map(d =>
        apiFetch(`/duty/week-log?roleId=${encodeURIComponent(cleanerId)}&date=${d.date}`)
          .then(r => r.json())
          .catch(() => ({}))
      )
    ).then(results => {
      const enriched = weekDates.map((d, i) => ({
        ...d,
        hoursWorked: results[i]?.hoursWorked || 0,
        clockIn: results[i]?.clockIn || null,
        clockOut: results[i]?.clockOut || null,
      }));
      setWeekData(enriched);
    }).finally(() => setLoading(false));
  }, [cleanerId]);

  const todayDuty = dutyData;
  const maxHours = Math.max(...weekData.map(d => d.hoursWorked || 0), 8);
  const totalWeekMins = weekData.reduce((s, d) => s + (d.hoursWorked || 0), 0);
  const avgMins = weekData.filter(d => d.hoursWorked > 0).length > 0
    ? Math.round(totalWeekMins / weekData.filter(d => d.hoursWorked > 0).length)
    : 0;

  const formatTime = t => {
    if (!t) return '—';
    const d = new Date(t);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Work Hours</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>This week's duty log</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {loading ? (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Today', val: minsToHM(todayDuty?.hoursWorked || 0), color: C.gold, bg: C.gold + '18' },
                { label: 'Week Total', val: minsToHM(totalWeekMins), color: C.teal, bg: C.teal + '18' },
                { label: 'Daily Avg', val: minsToHM(avgMins), color: C.purple, bg: C.purple + '18' },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderWidth: 1, borderColor: s.color + '33', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: s.color }}>{s.val}</Text>
                  <Text style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {todayDuty && (
              <View style={{ backgroundColor: C.card, borderWidth: 1.5, borderColor: C.gold, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontWeight: '600', fontSize: 14, color: C.gold, marginBottom: 10 }}>Today's Shift</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Clock In</Text>
                    <Text style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>{formatTime(todayDuty.clockIn)}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Status</Text>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, backgroundColor: todayDuty.onDuty ? C.teal + '22' : C.border }}>
                      <Text style={{ color: todayDuty.onDuty ? C.teal : C.muted, fontWeight: '700', fontSize: 12 }}>{todayDuty.onDuty ? 'On Duty' : 'Off Duty'}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Clock Out</Text>
                    <Text style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>{formatTime(todayDuty.clockOut)}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <Text style={{ fontWeight: '600', fontSize: 15, marginBottom: 14, color: C.white }}>Weekly Overview (hours)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 90 }}>
                {weekData.map(d => {
                  const h = d.hoursWorked || 0;
                  const barH = maxHours > 0 ? Math.max((h / maxHours) * 75, h > 0 ? 6 : 0) : 0;
                  return (
                    <View key={d.date} style={{ flex: 1, alignItems: 'center', height: '100%' }}>
                      <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                        <View style={{ height: barH, backgroundColor: d.isToday ? C.gold : C.gold + '77', borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
                      </View>
                      <Text style={{ fontSize: 9, color: d.isToday ? C.white : C.muted, marginTop: 5, fontWeight: d.isToday ? '700' : '400' }}>{d.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {weekData.map(d => (
              <View key={d.date} style={{ backgroundColor: d.isToday ? C.navyMid : C.card, borderWidth: 1, borderColor: d.isToday ? C.gold : C.border, borderRadius: 14, padding: 14, paddingHorizontal: 16, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: d.isToday ? C.gold : C.white }}>{d.label}</Text>
                  <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                    {d.clockIn ? <Text style={{ fontSize: 12, color: C.muted }}>{formatTime(d.clockIn)} – {formatTime(d.clockOut)}</Text> : null}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: d.hoursWorked > 0 ? C.gold : C.muted }}>
                      {minsToHM(d.hoursWorked)}
                    </Text>
                  </View>
                </View>
                {d.hoursWorked > 0 && (
                  <View style={{ marginTop: 8, height: 4, backgroundColor: C.border, borderRadius: 99, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: ((d.hoursWorked / (maxHours || 1)) * 100) + '%', backgroundColor: d.isToday ? C.gold : C.gold + '88', borderRadius: 99 }} />
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

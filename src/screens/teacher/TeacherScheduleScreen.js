import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(offset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const dates = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function getMonthLabel(dates) {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const opts = { month: 'short', year: 'numeric' };
  if (first.getMonth() === last.getMonth()) {
    return first.toLocaleDateString('en-IN', opts);
  }
  return first.toLocaleDateString('en-IN', { month: 'short' }) + ' – ' + last.toLocaleDateString('en-IN', opts);
}

export default function TeacherScheduleScreen({ onBack, currentUser }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState([]);

  const roleId = currentUser?.role_id || '';
  const weekDates = getWeekDates(weekOffset);
  const todayStr = formatDate(new Date());

  const fetchCalendar = useCallback(async () => {
    if (!roleId) { setLoading(false); return; }
    setLoading(true);
    try {
      const months = [...new Set(weekDates.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`))];
      let allEvents = [];
      for (const m of months) {
        const [year, month] = m.split('-');
        const res = await fetch(`/api/teacher-calendar?roleId=${encodeURIComponent(roleId)}&month=${month}&year=${year}`);
        const data = await res.json();
        if (res.ok && data.events) allEvents = allEvents.concat(data.events);
      }
      setEvents(allEvents);
    } catch (err) {
      console.error('Failed to fetch calendar:', err.message);
    }
    try {
      const res = await fetch(`/api/teacher-timetable?roleId=${encodeURIComponent(roleId)}`);
      const data = await res.json();
      if (res.ok && data.timetable) setTimetable(data.timetable);
    } catch (err) {}
    setLoading(false);
  }, [roleId, weekOffset]);

  useEffect(() => {
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 30000);
    return () => clearInterval(interval);
  }, [fetchCalendar]);

  const getEventsForDate = (dateStr) => {
    return events.filter(e => e.date === dateStr).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  };

  const activeDate = selectedDay !== null ? formatDate(weekDates[selectedDay]) : todayStr;
  const dayEvents = getEventsForDate(activeDate);

  const totalWeekClasses = weekDates.reduce((sum, d) => sum + getEventsForDate(formatDate(d)).length, 0);
  const todayClasses = getEventsForDate(todayStr).length;

  const timetableSummary = timetable.map(t => ({
    className: t.className,
    subject: t.subject,
    days: t.days?.join(', ') || '',
    time: `${t.startTime || ''} – ${t.endTime || ''}`,
    room: t.room || '',
  }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>My Schedule</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{currentUser?.full_name || 'Teacher'} {roleId ? '· ' + roleId : ''}</Text>
        </View>
        <TouchableOpacity onPress={fetchCalendar} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14 }}>{'\u21BB'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { val: String(todayClasses), lbl: 'Today', color: C.teal, icon: '\uD83D\uDCD6' },
            { val: String(totalWeekClasses), lbl: 'This Week', color: C.gold, icon: '\uD83D\uDCC5' },
            { val: String(timetable.length), lbl: 'Classes', color: C.purple, icon: '\uD83C\uDFEB' },
          ].map(s => (
            <View key={s.lbl} style={{ flex: 1, backgroundColor: s.color + '11', borderWidth: 1, borderColor: s.color + '33', borderRadius: 14, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</Text>
              <Text style={{ fontWeight: '800', fontSize: 20, color: s.color }}>{s.val}</Text>
              <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={14} color={C.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(0)}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{getMonthLabel(weekDates)}</Text>
            {weekOffset !== 0 && <Text style={{ color: C.teal, fontSize: 10, textAlign: 'center', fontWeight: '600' }}>Tap for this week</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '180deg' }] }}>
            <Icon name="back" size={14} color={C.white} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
          {weekDates.map((d, i) => {
            const dateStr = formatDate(d);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDay === i || (selectedDay === null && isToday);
            const dayEvCount = getEventsForDate(dateStr).length;

            return (
              <TouchableOpacity key={i} onPress={() => setSelectedDay(i)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: isSelected ? C.teal : isToday ? C.teal + '22' : C.navyMid, borderWidth: isToday && !isSelected ? 1 : 0, borderColor: C.teal + '55' }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: isSelected ? C.white : C.muted, marginBottom: 4 }}>{DAYS_OF_WEEK[i]}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: isSelected ? C.white : isToday ? C.teal : C.white }}>{d.getDate()}</Text>
                {dayEvCount > 0 && (
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isSelected ? C.white : C.gold, marginTop: 4 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>Loading schedule...</Text>
          </View>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: C.white }}>
                {activeDate === todayStr ? "Today's Classes" : new Date(activeDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
              <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: dayEvents.length > 0 ? C.teal + '22' : C.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: dayEvents.length > 0 ? C.teal : C.muted }}>{dayEvents.length} class{dayEvents.length !== 1 ? 'es' : ''}</Text>
              </View>
            </View>

            {dayEvents.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, marginBottom: 16 }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>{'\uD83C\uDFD6'}</Text>
                <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 4 }}>No Classes</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>No classes scheduled for this day</Text>
              </View>
            ) : (
              dayEvents.map((ev, i) => {
                const now = new Date();
                const isToday = activeDate === todayStr;
                const colors = [C.teal, C.gold, C.purple, C.coral, '#60A5FA', '#34D399'];
                const evColor = colors[i % colors.length];

                return (
                  <View key={ev.id || i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: evColor, borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>Grade {ev.className}</Text>
                        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{ev.subject}</Text>
                      </View>
                      {isToday && (
                        <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: evColor + '22' }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: evColor }}>{'\u26A1'} Today</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12 }}>{'\u23F0'}</Text>
                        <Text style={{ fontSize: 12, color: C.gold, fontWeight: '600' }}>{ev.startTime} – {ev.endTime}</Text>
                      </View>
                      {ev.room ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 12 }}>{'\uD83D\uDCCD'}</Text>
                          <Text style={{ fontSize: 12, color: C.muted }}>{ev.room}</Text>
                        </View>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12 }}>{'\uD83D\uDCC5'}</Text>
                        <Text style={{ fontSize: 12, color: C.muted }}>{ev.dayOfWeek}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {timetableSummary.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: C.white, marginBottom: 12 }}>{'\uD83D\uDCCB'} Weekly Timetable</Text>
            {timetableSummary.map((t, i) => (
              <View key={i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>Grade {t.className}</Text>
                  <Text style={{ fontSize: 11, color: C.gold, fontWeight: '600' }}>{t.time}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{t.subject}{t.room ? ' · ' + t.room : ''}</Text>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {(t.days || '').split(', ').map(d => (
                      <View key={d} style={{ paddingVertical: 2, paddingHorizontal: 6, borderRadius: 5, backgroundColor: C.teal + '22' }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: C.teal }}>{d}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && events.length === 0 && timetable.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 30, marginTop: 10 }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>{'\uD83D\uDCC5'}</Text>
            <Text style={{ fontWeight: '600', fontSize: 16, color: C.white, marginBottom: 6 }}>No Schedule Yet</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>Your schedule will appear here once{'\n'}the Principal assigns your classes.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

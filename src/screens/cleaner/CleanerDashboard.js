import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { CLEANER_DEFAULT, PHASE_INFO } from '../../data/cleaner';

export default function CleanerDashboard({ onNavigate, currentUser, students }) {
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsLoad, setGpsLoad] = useState(false);
  const [onDuty, setOnDuty] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('Off Duty');

  const cleanerName = currentUser?.full_name || CLEANER_DEFAULT.name;
  const cleanerId = currentUser?.role_id || CLEANER_DEFAULT.id;
  const busNumber = currentUser?.bus_number || CLEANER_DEFAULT.bus.number;
  const initials = cleanerName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  useEffect(() => {
    fetch(`/api/duty/status?roleId=${cleanerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.onDuty === true) {
          setOnDuty(true);
          setClockInTime(data.clockIn);
          setCurrentStatus(data.currentStatus || 'On Duty');
        }
      })
      .catch(() => {});
  }, [cleanerId]);

  useEffect(() => {
    if (onDuty) {
      const newStatus = gpsOn ? 'In Transit/Student Pickup' : 'On Duty';
      setCurrentStatus(newStatus);
      fetch('/api/duty/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: cleanerId, currentStatus: newStatus }),
      }).catch(() => {});
    } else {
      setCurrentStatus('Off Duty');
    }
  }, [onDuty, gpsOn]);

  const toggleDuty = useCallback(async () => {
    setDutyLoading(true);
    try {
      if (!onDuty) {
        const res = await fetch('/api/duty/clock-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser?.uid || '', name: cleanerName, role: 'cleaner', roleId: cleanerId }),
        });
        const data = await res.json();
        if (res.ok && data.success !== false) {
          setOnDuty(true);
          setClockInTime(data.clockIn);
        }
      } else {
        const res = await fetch('/api/duty/clock-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser?.uid || '', name: cleanerName, role: 'cleaner', roleId: cleanerId }),
        });
        if (res.ok) {
          setOnDuty(false);
          setClockInTime(null);
          setCurrentStatus('Off Duty');
        }
      }
    } catch (e) { console.error('Duty toggle error:', e.message); }
    setDutyLoading(false);
  }, [onDuty, currentUser, cleanerName, cleanerId]);

  const toggleGPS = () => {
    if (!gpsOn) {
      setGpsLoad(true);
      setTimeout(() => { setGpsLoad(false); setGpsOn(true); }, 1800);
    } else {
      setGpsOn(false);
    }
  };

  const absent = students.filter(s => s.absent);
  const present = students.filter(s => !s.absent);
  const totalDone = present.reduce((a, s) => a + s.scanCount, 0);
  const totalMax = present.length * 4;

  const avgDone = present.length ? totalDone / present.length : 0;
  const session = avgDone < 1 ? "\uD83C\uDF05 Morning — Pick-up from home" :
                  avgDone < 2 ? "\uD83C\uDF05 Morning — Drop at school" :
                  avgDone < 3 ? "\uD83C\uDF07 Evening — Pick-up from school" :
                  avgDone < 4 ? "\uD83C\uDF07 Evening — Drop at home" : "\u2705 Day complete";

  const recentScanned = [...students].filter(s => s.scanCount > 0).sort((a, b) => b.scanCount - a.scanCount).slice(0, 3);

  return (
    <View style={{ paddingBottom: 16 }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 2 }}>Good Morning {'\uD83D\uDC4B'}</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: C.white, lineHeight: 30 }}>{cleanerName}</Text>
            {onDuty && clockInTime && (
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Clocked in at {clockInTime}</Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 50, backgroundColor: C.gold + '26' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: C.gold }}>{'\uD83D\uDE8C'} {busNumber}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 50, backgroundColor: C.purple + '26' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: C.purple }}>ID: {cleanerId}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              onPress={toggleDuty}
              disabled={dutyLoading}
              activeOpacity={0.7}
              style={{
                width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: onDuty ? '#34D399' : C.coral,
                opacity: dutyLoading ? 0.6 : 1,
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: 11, color: C.white }}>{dutyLoading ? '...' : onDuty ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 9, fontWeight: '700', color: onDuty ? '#34D399' : C.coral }}>{onDuty ? 'ON Duty' : 'OFF Duty'}</Text>
            {onDuty && <Text style={{ fontSize: 8, fontWeight: '600', color: currentStatus === 'In Transit' ? C.teal : '#34D399' }}>{currentStatus}</Text>}
          </View>
        </View>
      </View>

      {absent.length > 0 && (
        <View style={{ padding: 14, paddingHorizontal: 20, paddingBottom: 0 }}>
          <View style={{ backgroundColor: C.coral + '14', borderWidth: 1.5, borderColor: C.coral + '59', borderRadius: 16, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="alert" size={18} color={C.coral} />
              <Text style={{ fontWeight: '700', fontSize: 14, color: C.coral }}>{absent.length} Student{absent.length > 1 ? 's' : ''} Absent — Skip Their Stops</Text>
            </View>
            {absent.map(s => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.coral + '14', borderRadius: 10, padding: 8, marginBottom: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: C.coral + '2E', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontWeight: '700', fontSize: 11, color: C.coral }}>{s.photo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{s.name} <Text style={{ color: C.muted, fontWeight: '400' }}>· {s.cls}</Text></Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Icon name="location" size={11} color={C.muted} />
                    <Text style={{ color: C.muted, fontSize: 11 }}>{s.stop}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: C.coral + '2E', borderRadius: 50, paddingVertical: 3, paddingHorizontal: 9 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.coral }}>{'\u274C'} ABSENT</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ padding: 14, paddingHorizontal: 20, paddingBottom: 0 }}>
        <LinearGradient colors={[C.gold + '29', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.gold + '61', borderRadius: 20, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: C.gold + '2E', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="qr" size={22} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{session}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>Tap to open scanner and scan QR</Text>
            </View>
            <Text style={{ fontWeight: '800', fontSize: 20, color: C.gold }}>{totalDone}<Text style={{ fontSize: 12, color: C.muted, fontWeight: '400' }}>/{totalMax}</Text></Text>
          </View>
          <View style={{ height: 5, borderRadius: 99, backgroundColor: C.border, overflow: 'hidden', marginBottom: 14 }}>
            <LinearGradient colors={[C.teal, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: totalMax ? `${(totalDone / totalMax) * 100}%` : '0%', borderRadius: 99 }} />
          </View>
          <TouchableOpacity onPress={() => onNavigate('cleaner-scanner')} style={{ backgroundColor: C.gold, borderRadius: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <Icon name="qr" size={18} color={C.navy} />
            <Text style={{ fontWeight: '700', fontSize: 14, color: C.navy }}>Open QR Scanner</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <View style={{ padding: 14, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ backgroundColor: gpsOn ? '#34D399' + '1F' : C.navyMid, borderWidth: 1, borderColor: gpsOn ? '#34D399' + '66' : C.border, borderRadius: 20, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: gpsOn || gpsLoad ? 14 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: gpsOn ? '#34D399' + '2E' : C.border, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="navigate" size={20} color={gpsOn ? '#34D399' : C.muted} />
              </View>
              <View>
                <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>GPS Location</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{gpsOn ? 'Parents can see live bus location' : 'Activate to share your location'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleGPS} style={{ width: 52, height: 28, borderRadius: 99, backgroundColor: gpsOn ? '#34D399' : C.border, justifyContent: 'center', flexShrink: 0 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, position: 'absolute', top: 3, left: gpsOn ? 27 : 3 }} />
            </TouchableOpacity>
          </View>

          {gpsLoad && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: C.gold + '40', borderTopColor: C.gold }} />
              <Text style={{ color: C.gold, fontSize: 13 }}>Activating GPS…</Text>
            </View>
          )}

          {gpsOn && !gpsLoad && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#34D399' + '1A', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#34D399' + '40' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#34D399' }} />
                  <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '600' }}>LIVE</Text>
                </View>
                <Text style={{ fontWeight: '700', fontSize: 12, color: C.white }}>12.9716N, 80.2443E</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Near OMR Junction</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.gold + '14', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.gold + '38' }}>
                <Text style={{ color: C.gold, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>SCANS TODAY</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontWeight: '700', fontSize: 20, color: C.gold }}>{totalDone}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>/{totalMax}</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{totalMax - totalDone} remaining</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={{ padding: 14, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Today's Summary</Text>
          <TouchableOpacity onPress={() => onNavigate('cleaner-duration')}>
            <Text style={{ fontSize: 13, color: C.gold }}>History</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Scans Done', val: String(totalDone), icon: '\uD83D\uDCF2', color: C.gold },
            { label: 'Absent', val: String(absent.length), icon: '\u274C', color: C.coral },
            { label: 'Morning Run', val: '45 min', icon: '\uD83C\uDF05', color: C.teal },
          ].map(m => (
            <View key={m.label} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginBottom: 6 }}>{m.icon}</Text>
              <Text style={{ fontWeight: '800', fontSize: 18, color: m.color }}>{m.val}</Text>
              <Text style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ padding: 14, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Recent Scans</Text>
          <TouchableOpacity onPress={() => onNavigate('cleaner-scanner')}>
            <Text style={{ fontSize: 13, color: C.gold }}>Open Scanner</Text>
          </TouchableOpacity>
        </View>
        {recentScanned.length === 0 ? (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83D\uDCF2'}</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No scans yet — tap Open QR Scanner to start</Text>
          </View>
        ) : (
          recentScanned.map(s => {
            const pi = s.scanCount > 0 ? PHASE_INFO[s.scanCount - 1] : null;
            if (!pi) return null;
            return (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: pi.color, borderRadius: 14, padding: 12, marginBottom: 8 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, backgroundColor: pi.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: pi.color }}>{s.photo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{s.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{s.stop}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: pi.color === C.teal ? C.teal + '26' : C.gold + '26', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 11 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: pi.color === C.teal ? C.teal : C.gold }}>{pi.icon} {pi.label}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={{ padding: 14, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Bus Crew</Text>
        </View>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 16 }}>
          {[
            { label: 'Driver', person: CLEANER_DEFAULT.driver, color: C.teal },
            { label: 'Cleaner/Attender', person: { name: cleanerName, photo: initials, id: cleanerId }, color: C.gold },
          ].map(({ label, person, color }, i) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: i === 0 ? 1 : 0, borderBottomColor: C.border }}>
              <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: color }}>{person.photo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{person.name}</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>{label} · {person.id}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.gold + '26', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 11 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.gold }}>{'\uD83D\uDE8C'} {busNumber}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

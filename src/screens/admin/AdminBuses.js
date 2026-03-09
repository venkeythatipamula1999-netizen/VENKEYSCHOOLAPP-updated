import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator, Modal } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';

function StopsMap({ stops, onLockStop }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');

      if (!document.getElementById('leaflet-css-admin')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-admin';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      await new Promise(r => setTimeout(r, 300));

      if (mapInstanceRef.current) {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
      } else {
        const center = stops.length > 0 ? [stops[0].lat, stops[0].lng] : [13.0827, 80.2707];
        mapInstanceRef.current = L.map(mapRef.current, { attributionControl: false }).setView(center, 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;

      stops.forEach(stop => {
        const color = stop.locked ? '#8B5CF6' : '#34D399';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${stop.locked ? '\uD83D\uDD12' : '\uD83D\uDCCD'}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
        const lockBtn = stop.locked
          ? `<button onclick="window.__unlockStop__('${stop.studentId}')" style="margin-top:6px;padding:4px 12px;border:1px solid #8B5CF6;background:transparent;color:#8B5CF6;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Unlock</button>`
          : `<button onclick="window.__lockStop__('${stop.studentId}')" style="margin-top:6px;padding:4px 12px;background:#8B5CF6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">\uD83D\uDD12 Lock Stop</button>`;

        marker.bindPopup(`
          <div style="min-width:160px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${stop.studentName || 'Student'}</div>
            <div style="font-size:11px;color:#666;margin-bottom:2px;">${stop.className || ''} ${stop.route ? '· ' + stop.route : ''}</div>
            <div style="font-size:11px;color:#888;">Lat: ${Number(stop.lat).toFixed(5)}, Lng: ${Number(stop.lng).toFixed(5)}</div>
            <div style="font-size:10px;color:#999;margin-top:2px;">Set by: ${stop.setBy || 'Driver'}</div>
            <div style="font-size:10px;color:${stop.locked ? '#8B5CF6' : '#34D399'};font-weight:600;margin-top:4px;">${stop.locked ? '\uD83D\uDD12 Locked' : '\uD83D\uDD13 Unlocked'}</div>
            ${lockBtn}
          </div>
        `);
        markersRef.current.push(marker);
      });

      if (stops.length > 1) {
        const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [30, 30] });
      } else if (stops.length === 1) {
        map.setView([stops[0].lat, stops[0].lng], 14);
      }
    };

    if (Platform.OS === 'web') {
      window.__lockStop__ = (studentId) => onLockStop(studentId, true);
      window.__unlockStop__ = (studentId) => onLockStop(studentId, false);
    }

    initMap().catch(e => console.error('Map init error:', e));

    return () => {
      if (Platform.OS === 'web') {
        delete window.__lockStop__;
        delete window.__unlockStop__;
      }
    };
  }, [stops, onLockStop]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ backgroundColor: C.navyMid, borderRadius: 16, padding: 20, alignItems: 'center', minHeight: 200 }}>
        <Text style={{ fontSize: 36 }}>{'\uD83D\uDDFA\uFE0F'}</Text>
        <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Map available on web only</Text>
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', height: 320, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

export default function AdminBuses({ onBack, currentUser }) {
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('buses');
  const [stops, setStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [lockingId, setLockingId] = useState(null);
  const [filterRoute, setFilterRoute] = useState('All');
  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
  const [selectedBus, setSelectedBus] = useState(null);
  const [onboardStudents, setOnboardStudents] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const statusColor = (s) => ({ 'En Route': C.gold, 'At School': '#22d38a', 'Returning': C.teal, 'Parked': C.muted, 'active': C.teal }[s] || C.muted);

  useEffect(() => {
    setLoadingBuses(true);
    fetch('/api/admin/buses', { headers: { 'x-role-id': currentUser?.role_id || '' } })
      .then(r => r.json())
      .then(data => {
        if (data.success) setBuses(data.buses || []);
      })
      .catch(e => console.error('Failed to load buses:', e.message))
      .finally(() => setLoadingBuses(false));
  }, []);

  const fetchStops = useCallback(async () => {
    setLoadingStops(true);
    try {
      const res = await fetch('/api/bus/all-stops');
      const data = await res.json();
      if (data.stops) setStops(data.stops);
    } catch (e) { console.error('Fetch stops error:', e.message); }
    setLoadingStops(false);
  }, []);

  useEffect(() => {
    if (tab === 'stops') fetchStops();
  }, [tab, fetchStops]);

  const handleLockStop = useCallback(async (studentId, lock) => {
    setLockingId(studentId);
    try {
      const res = await fetch('/api/bus/lock-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, locked: lock }),
      });
      const data = await res.json();
      if (data.success) {
        setStops(prev => prev.map(s => s.studentId === studentId ? { ...s, locked: data.locked } : s));
      }
    } catch (e) { console.error('Lock stop error:', e.message); }
    setLockingId(null);
  }, []);

  const openBusModal = async (bus) => {
    setSelectedBus(bus);
    setShowModal(true);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/bus/onboard-students?busId=${encodeURIComponent(bus.busNumber || bus.busId || bus.id)}`, {
        headers: { 'x-role-id': currentUser?.role_id || '' },
      });
      const data = await res.json();
      if (data.success) setOnboardStudents(data.students || []);
    } catch (err) {
      console.error('Failed to fetch onboard students:', err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const routes = ['All', ...new Set(stops.map(s => s.route).filter(Boolean))];
  const filteredStops = filterRoute === 'All' ? stops : stops.filter(s => s.route === filterRoute);
  const lockedCount = stops.filter(s => s.locked).length;
  const enRouteCount = buses.filter(b => b.status === 'En Route' || b.status === 'active').length;
  const totalBusStudents = buses.reduce((s, b) => s + ((b.studentIds || []).length || b.students || 0), 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus & Routes</Text>
      </View>

      <View style={styles.content}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { val: buses.length, lbl: 'Total', icon: '\uD83D\uDE8C', color: C.teal },
            { val: enRouteCount, lbl: 'Active', icon: '\u25B6\uFE0F', color: C.gold },
            { val: totalBusStudents, lbl: 'Students', icon: '\uD83D\uDC68\u200D\uD83C\uDF93', color: C.purple },
          ].map((s) => (
            <View key={s.lbl} style={[styles.metricCard, { borderColor: s.color + '33', borderTopWidth: 3, borderTopColor: s.color }]}>
              <Text style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</Text>
              <Text style={{ color: s.color, fontSize: 22, fontWeight: '800' }}>{s.val}</Text>
              <Text style={styles.metricLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[
            { id: 'buses', label: '\uD83D\uDE8C Buses', color: C.teal },
            { id: 'stops', label: '\uD83D\uDCCD Stops Map', color: C.purple },
          ].map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                backgroundColor: tab === t.id ? t.color : C.navyMid,
                borderWidth: 1, borderColor: tab === t.id ? t.color : C.border,
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 13, color: tab === t.id ? C.white : C.muted }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'buses' && (
          <>
            {loadingBuses ? (
              <ActivityIndicator size="large" color={C.teal} style={{ marginTop: 40 }} />
            ) : buses.length === 0 ? (
              <View style={{ backgroundColor: C.navyMid, borderRadius: 16, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', padding: 30, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>{'\uD83D\uDE8C'}</Text>
                <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>No Buses Registered</Text>
                <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Add buses in the Firebase console to see them here</Text>
              </View>
            ) : (
              buses.map((b, i) => (
                <TouchableOpacity key={b.id || i} style={styles.card} onPress={() => setExpanded(expanded === (b.id || i) ? null : (b.id || i))} activeOpacity={0.7}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: C.white }}>{'\uD83D\uDE8C'} {b.busNumber || b.vehicleNo || 'Bus ' + (i + 1)}</Text>
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Route: {b.route || b.busRoute || '\u2014'}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusColor(b.status) + '22', borderColor: statusColor(b.status) + '44' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor(b.status) }}>{b.status === 'active' ? '\uD83D\uDFE2 Active' : b.status || 'Inactive'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: expanded === (b.id || i) ? 12 : 0 }}>
                    <Text style={{ fontSize: 11, color: C.muted }}>{'\uD83E\uDDD1\u200D\u2708\uFE0F'} <Text style={{ color: C.white }}>{b.driverName || b.driver || '\u2014'}</Text></Text>
                    <Text style={{ fontSize: 11, color: C.muted }}>{'\uD83D\uDC64'} <Text style={{ color: C.white }}>{b.cleanerName || b.pet || '\u2014'}</Text></Text>
                    <Text style={{ fontSize: 11, color: C.teal, fontWeight: '700' }}>{'\uD83D\uDC68\u200D\uD83C\uDF93'} {(b.studentIds || []).length || b.students || 0}</Text>
                  </View>
                  {expanded === (b.id || i) && (
                    <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => openBusModal(b)} style={[styles.actionBtn, { backgroundColor: C.teal }]}>
                          <Text style={{ color: C.navy, fontSize: 13, fontWeight: '800' }}>{'\uD83D\uDC65'} View Onboard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border }]}>
                          <Text style={{ color: C.white, fontSize: 13, fontWeight: '700' }}>{'\uD83D\uDCDE'} Call Driver</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {tab === 'stops' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#34D39911', borderWidth: 1, borderColor: '#34D39933', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 20, color: '#34D399' }}>{stops.length}</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Total Stops</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.purple + '11', borderWidth: 1, borderColor: C.purple + '33', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 20, color: C.purple }}>{lockedCount}</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Locked</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.gold + '11', borderWidth: 1, borderColor: C.gold + '33', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 20, color: C.gold }}>{stops.length - lockedCount}</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Unlocked</Text>
              </View>
            </View>

            {routes.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {routes.map(r => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setFilterRoute(r)}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
                        backgroundColor: filterRoute === r ? C.purple : C.navyMid,
                        borderWidth: 1, borderColor: filterRoute === r ? C.purple : C.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: filterRoute === r ? C.white : C.muted }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {loadingStops ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={C.purple} />
                <Text style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>Loading stops...</Text>
              </View>
            ) : filteredStops.length === 0 ? (
              <View style={{ backgroundColor: C.navyMid, borderRadius: 16, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', padding: 30, alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>{'\uD83D\uDCCD'}</Text>
                <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>No Stops Captured Yet</Text>
                <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Drivers will map student pickup locations during their trips</Text>
              </View>
            ) : (
              <>
                <StopsMap stops={filteredStops} onLockStop={handleLockStop} />

                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.white, marginBottom: 10 }}>All Captured Stops</Text>
                </View>

                {filteredStops.map(stop => (
                  <View key={stop.id || stop.studentId} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: stop.locked ? C.purple + '11' : C.card,
                    borderWidth: 1, borderColor: stop.locked ? C.purple + '33' : C.border,
                    borderRadius: 14, padding: 12, marginBottom: 8,
                  }}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                      backgroundColor: stop.locked ? C.purple + '22' : '#34D39922',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 16 }}>{stop.locked ? '\uD83D\uDD12' : '\uD83D\uDCCD'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{stop.studentName || stop.studentId}</Text>
                      <Text style={{ color: C.muted, fontSize: 11 }}>
                        {stop.className || ''} {stop.route ? '· ' + stop.route : ''}
                      </Text>
                      <Text style={{ color: stop.locked ? C.purple : '#34D399', fontSize: 10, marginTop: 2 }}>
                        {Number(stop.lat).toFixed(5)}N, {Number(stop.lng).toFixed(5)}E
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleLockStop(stop.studentId, !stop.locked)}
                      disabled={lockingId === stop.studentId}
                      style={{
                        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12,
                        backgroundColor: stop.locked ? C.purple + '22' : C.purple,
                        borderWidth: stop.locked ? 1 : 0, borderColor: C.purple + '44',
                        opacity: lockingId === stop.studentId ? 0.5 : 1,
                      }}
                    >
                      {lockingId === stop.studentId ? (
                        <ActivityIndicator size="small" color={C.purple} />
                      ) : (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: stop.locked ? C.purple : C.white }}>
                          {stop.locked ? '\uD83D\uDD13 Unlock' : '\uD83D\uDD12 Lock'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </View>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.navy, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 17 }}>
                  {'\uD83D\uDE8C'} {selectedBus?.busNumber || 'Bus'} — Today's Onboard
                </Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {onboardStudents.length} students scanned today
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="x" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color={C.teal} style={{ marginVertical: 30 }} />
            ) : onboardStudents.length === 0 ? (
              <Text style={{ color: C.muted, textAlign: 'center', marginVertical: 30 }}>No students scanned today</Text>
            ) : (
              <ScrollView>
                {onboardStudents.map((student, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < onboardStudents.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                    <View>
                      <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>{student.studentName}</Text>
                      <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                        {student.status === 'Onboard' ? '\uD83D\uDE8C On the bus' : '\uD83C\uDFEB Arrived at school'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ backgroundColor: student.status === 'Onboard' ? C.teal + '22' : C.gold + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                        <Text style={{ color: student.status === 'Onboard' ? C.teal : C.gold, fontSize: 11, fontWeight: '600' }}>{student.status}</Text>
                      </View>
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                        {student.lastScan ? new Date(student.lastScan).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '700', fontSize: 18, color: C.white },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  metricCard: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center' },
  metricLbl: { fontSize: 10, color: C.muted, marginTop: 2 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  statusChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  delayBanner: { backgroundColor: C.coral + '11', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 8 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
});

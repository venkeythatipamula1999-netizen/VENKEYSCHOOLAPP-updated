import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { C } from '../../theme/colors';
import { DRIVER_DEFAULT } from '../../data/driver';

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toR = d => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function coordsLabel(lat, lng) {
  if (!lat || !lng) return null;
  return `${parseFloat(lat).toFixed(5)}°N, ${parseFloat(lng).toFixed(5)}°E`;
}

export default function DriverProximityAlerts({ onBack, currentUser }) {
  const busNumber = currentUser?.bus_number || DRIVER_DEFAULT.bus.number;
  const busRoute = currentUser?.route || DRIVER_DEFAULT.bus.route;
  const driverId = currentUser?.role_id || DRIVER_DEFAULT.id;
  const driverName = currentUser?.full_name || DRIVER_DEFAULT.name;

  const routeKey = (() => {
    if (busRoute) {
      const m = busRoute.match(/Route\s*(\d+)/i);
      if (m) return `Route ${m[1]}`;
    }
    return null;
  })();

  const [routeStudents, setRouteStudents] = useState([]);
  const [stopStatus, setStopStatus] = useState({});
  const [todayAlerts, setTodayAlerts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState(C.teal);

  const [capturedCoords, setCapturedCoords] = useState({});
  const [capturingFor, setCapturingFor] = useState(null);
  const [settingFor, setSettingFor] = useState(null);

  const [changeModal, setChangeModal] = useState(null);
  const [changeCoords, setChangeCoords] = useState(null);
  const [changeCapturing, setChangeCapturing] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);

  const showMsg = (text, color = C.teal) => {
    setMsg(text);
    setMsgColor(color);
    setTimeout(() => setMsg(''), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const did = currentUser?.role_id || currentUser?.roleId || driverId;
      const routeParam = routeKey || '';
      const studentsRes = await fetch(`/api/bus/route-students?driverId=${encodeURIComponent(did)}&route=${encodeURIComponent(routeParam)}`);
      const studentsData = await studentsRes.json();
      if (studentsData.success && studentsData.students) {
        setRouteStudents(studentsData.students);
      }
      if (studentsData.stops) {
        setStopStatus(studentsData.stops);
      }

      const [alertsRes, pendingRes] = await Promise.all([
        fetch(`/api/bus/proximity-alerts-today?busNumber=${encodeURIComponent(busNumber)}`),
        fetch(`/api/bus/pending-requests?route=${encodeURIComponent(routeParam)}`),
      ]);
      const alertsData = await alertsRes.json();
      const pendingData = await pendingRes.json();
      if (alertsData.alerts) setTodayAlerts(alertsData.alerts);
      if (pendingData.requests) {
        const map = {};
        pendingData.requests.forEach(r => { map[String(r.studentId)] = r; });
        setPendingRequests(map);
      }
    } catch (e) {
      console.error('DriverProximityAlerts load error:', e.message);
    }
    setLoading(false);
  }, [routeKey, busNumber, driverId]);

  useEffect(() => { loadData(); }, [loadData]);

  const captureGPS = async (studentId) => {
    setCapturingFor(String(studentId));
    try {
      if (Platform.OS === 'web' && navigator.geolocation) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 })
        );
        setCapturedCoords(prev => ({
          ...prev,
          [String(studentId)]: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
      } else {
        showMsg('GPS not available on this device', C.coral);
      }
    } catch (e) {
      showMsg('GPS capture failed: ' + e.message, C.coral);
    }
    setCapturingFor(null);
  };

  const handleSetStop = async (student) => {
    const sid = String(student.id);
    const coords = capturedCoords[sid];
    if (!coords) { showMsg('Please capture GPS location first', C.coral); return; }
    setSettingFor(sid);
    try {
      const res = await fetch('/api/bus/set-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: sid,
          studentName: student.name,
          className: student.className,
          route: routeKey,
          lat: coords.lat,
          lng: coords.lng,
          setBy: driverName,
          parentPhone: student.phone || '',
          parentName: student.parent || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStopStatus(prev => ({
          ...prev,
          [sid]: { lat: coords.lat, lng: coords.lng, setBy: driverName, locked: false, parentPhone: student.phone, parentName: student.parent },
        }));
        setCapturedCoords(prev => { const n = { ...prev }; delete n[sid]; return n; });
        showMsg(`Stop set for ${student.name}!`);
      } else {
        showMsg(data.error || 'Failed to set stop', C.coral);
      }
    } catch (e) {
      showMsg('Error: ' + e.message, C.coral);
    }
    setSettingFor(null);
  };

  const captureChangeGPS = async () => {
    setChangeCapturing(true);
    try {
      if (Platform.OS === 'web' && navigator.geolocation) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 })
        );
        setChangeCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } else {
        showMsg('GPS not available', C.coral);
      }
    } catch (e) {
      showMsg('GPS capture failed: ' + e.message, C.coral);
    }
    setChangeCapturing(false);
  };

  const handleChangeRequest = async () => {
    if (!changeCoords) { showMsg('Please capture new GPS location first', C.coral); return; }
    if (!changeReason.trim()) { showMsg('Please provide a reason for the change', C.coral); return; }
    const student = changeModal;
    setSubmittingChange(true);
    try {
      const sid = String(student.id);
      const existing = stopStatus[sid];
      const res = await fetch('/api/bus/request-location-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: sid,
          studentName: student.name,
          className: student.className,
          route: routeKey,
          busNumber,
          driverName,
          newLat: changeCoords.lat,
          newLng: changeCoords.lng,
          oldAddress: existing ? coordsLabel(existing.lat, existing.lng) : null,
          newAddress: coordsLabel(changeCoords.lat, changeCoords.lng),
          reason: changeReason.trim(),
          requestedBy: driverName,
          requestedByRoleId: driverId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Change request submitted! Waiting for admin approval.');
        setPendingRequests(prev => ({
          ...prev,
          [sid]: { studentId: sid, studentName: student.name, newLat: changeCoords.lat, newLng: changeCoords.lng, reason: changeReason.trim(), status: 'pending' },
        }));
        setChangeModal(null);
        setChangeReason('');
        setChangeCoords(null);
      } else {
        showMsg(data.error || 'Failed to submit request', C.coral);
      }
    } catch (e) {
      showMsg('Error: ' + e.message, C.coral);
    }
    setSubmittingChange(false);
  };

  const renderStudentCard = (student) => {
    const sid = String(student.id);
    const stop = stopStatus[sid];
    const hasStop = !!stop;
    const captured = capturedCoords[sid];
    const isCaptureLoading = capturingFor === sid;
    const isSetLoading = settingFor === sid;
    const hasPending = !!pendingRequests[sid];
    const initials = student.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    return (
      <View key={sid} style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: hasStop ? C.teal + '55' : C.border, borderRadius: 18, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: hasStop ? C.teal + '22' : C.gold + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: hasStop ? C.teal : C.gold }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>{student.name}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{student.className} · Roll {student.roll}</Text>
            {student.parent && <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>👤 {student.parent}</Text>}
            {student.phone && <Text style={{ color: C.muted, fontSize: 11 }}>📞 {student.phone}</Text>}
          </View>
          {hasStop && (
            <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 50, backgroundColor: '#34D39922', borderWidth: 1, borderColor: '#34D39944' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#34D399' }}>✅ Set</Text>
            </View>
          )}
        </View>

        {hasStop ? (
          <View style={{ backgroundColor: '#34D39911', borderWidth: 1, borderColor: '#34D39933', borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '700', marginBottom: 2 }}>📍 Pickup Location</Text>
            <Text style={{ color: C.white, fontSize: 12 }}>{coordsLabel(stop.lat, stop.lng)}</Text>
            {stop.setBy && <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Set by: {stop.setBy}</Text>}
          </View>
        ) : (
          <View style={{ backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B44', borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>📍 Location not set</Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Tap "Capture GPS" when at this student's stop, then tap "Set Location"</Text>
          </View>
        )}

        {hasPending && (
          <View style={{ backgroundColor: C.gold + '15', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 10, padding: 8, marginBottom: 10 }}>
            <Text style={{ color: C.gold, fontSize: 11, fontWeight: '700' }}>⏳ Change request pending admin approval</Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>Reason: {pendingRequests[sid].reason}</Text>
          </View>
        )}

        {!hasStop ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => captureGPS(student.id)}
              disabled={isCaptureLoading}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: captured ? '#34D39922' : C.card, borderWidth: 1, borderColor: captured ? '#34D39966' : C.border, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            >
              {isCaptureLoading
                ? <ActivityIndicator size="small" color={C.teal} />
                : <Text style={{ fontSize: 12, fontWeight: '700', color: captured ? '#34D399' : C.muted }}>
                    {captured ? `✅ ${captured.lat.toFixed(4)}...` : '📡 Capture GPS'}
                  </Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSetStop(student)}
              disabled={!captured || isSetLoading}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: captured ? C.teal : C.navyMid, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: (!captured || isSetLoading) ? 0.5 : 1 }}
            >
              {isSetLoading
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={{ fontSize: 12, fontWeight: '700', color: C.white }}>📌 Set Location</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => { setChangeModal(student); setChangeCoords(null); setChangeReason(''); }}
            disabled={hasPending}
            style={{ paddingVertical: 10, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, alignItems: 'center', opacity: hasPending ? 0.5 : 1 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: hasPending ? C.muted : C.gold }}>
              {hasPending ? '⏳ Change Request Pending' : '✏️ Change Location'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={[C.navyLt, C.navy]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 0.6 }} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8, paddingTop: 20 }}>
          <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 20, color: C.white }}>🔔 Proximity Alerts</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{busNumber} · {routeKey || busRoute}</Text>
          </View>
          <TouchableOpacity onPress={loadData} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="refresh" size={16} color={C.teal} />
          </TouchableOpacity>
        </View>

        {msg ? (
          <View style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: msgColor + '22', borderWidth: 1, borderColor: msgColor + '55', borderRadius: 12, padding: 12 }}>
            <Text style={{ color: msgColor, fontSize: 13, fontWeight: '600' }}>{msg}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: C.teal + '15', borderWidth: 1, borderColor: C.teal + '44', borderRadius: 14, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: C.teal }}>{Object.keys(stopStatus).length}</Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Stops Set</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.gold + '15', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 14, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: C.gold }}>{routeStudents.length - Object.keys(stopStatus).length}</Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Not Set</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#A78BFA15', borderWidth: 1, borderColor: '#A78BFA44', borderRadius: 14, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: '#A78BFA' }}>{todayAlerts.length}</Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Alerts Sent</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <View style={{ backgroundColor: C.teal + '11', borderWidth: 1, borderColor: C.teal + '33', borderRadius: 14, padding: 12 }}>
            <Text style={{ color: C.teal, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>ℹ️ How It Works</Text>
            <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>
              {"When you are within 500m of a student's saved stop, parents are automatically notified. First-time location setting does not require admin approval. Changes to existing locations require admin approval."}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.white }}>Students on {routeKey || 'This Route'}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{routeStudents.length} students</Text>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.teal} />
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Loading students...</Text>
            </View>
          ) : routeStudents.length === 0 ? (
            <View style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🚌</Text>
              <Text style={{ fontWeight: '700', fontSize: 16, color: C.white, marginBottom: 6 }}>No Students Found</Text>
              <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No students are assigned to {routeKey || 'your route'} in the system yet.</Text>
            </View>
          ) : (
            routeStudents.map(student => renderStudentCard(student))
          )}
        </View>

        {todayAlerts.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.white }}>Today's Alerts Sent</Text>
              <View style={{ backgroundColor: '#A78BFA22', borderRadius: 50, paddingVertical: 3, paddingHorizontal: 10 }}>
                <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '700' }}>{todayAlerts.length} sent</Text>
              </View>
            </View>
            {todayAlerts.map((alert, i) => (
              <View key={alert.id || i} style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: '#A78BFA33', borderLeftWidth: 3, borderLeftColor: '#A78BFA', borderRadius: 14, padding: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: C.white }}>{alert.studentName || 'Student'}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{alert.message || 'Proximity alert sent'}</Text>
                    {alert.distance && (
                      <Text style={{ color: '#A78BFA', fontSize: 11, marginTop: 3 }}>📍 {alert.distance}m away when alert sent</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ backgroundColor: '#34D39922', borderRadius: 50, paddingVertical: 3, paddingHorizontal: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#34D399' }}>✅ Sent</Text>
                    </View>
                    <Text style={{ color: C.muted, fontSize: 10 }}>
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && routeStudents.length > 0 && todayAlerts.length === 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>🔔</Text>
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 4 }}>No Alerts Sent Today</Text>
              <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>Alerts are sent automatically when the bus comes within 500m of a student's saved location during an active trip.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!changeModal} transparent animationType="slide" onRequestClose={() => setChangeModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontWeight: '800', fontSize: 18, color: C.white }}>Change Pickup Location</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{changeModal?.name} · Admin approval required</Text>
              </View>
              <TouchableOpacity
                onPress={() => { setChangeModal(null); setChangeCoords(null); setChangeReason(''); }}
                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="x" size={16} color={C.muted} />
              </TouchableOpacity>
            </View>

            {changeModal && stopStatus[String(changeModal.id)] && (
              <View style={{ backgroundColor: C.navyMid, borderRadius: 12, padding: 10, marginBottom: 14 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>CURRENT LOCATION</Text>
                <Text style={{ color: C.white, fontSize: 12 }}>{coordsLabel(stopStatus[String(changeModal.id)].lat, stopStatus[String(changeModal.id)].lng)}</Text>
              </View>
            )}

            <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>New Location</Text>
            <TouchableOpacity
              onPress={captureChangeGPS}
              disabled={changeCapturing}
              style={{ borderWidth: 1.5, borderColor: changeCoords ? '#34D39966' : C.border, borderRadius: 12, borderStyle: 'dashed', padding: 16, alignItems: 'center', marginBottom: 14, backgroundColor: changeCoords ? '#34D39911' : C.navyMid }}
            >
              {changeCapturing ? (
                <ActivityIndicator color={C.teal} />
              ) : changeCoords ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 13 }}>✅ Location Captured</Text>
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{coordsLabel(changeCoords.lat, changeCoords.lng)}</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, marginBottom: 6 }}>📡</Text>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 13 }}>Capture New GPS Location</Text>
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Tap when physically at the new stop</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>Reason for Change *</Text>
            <TextInput
              style={{ backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 14, color: C.white, marginBottom: 16, minHeight: 80, textAlignVertical: 'top' }}
              placeholder="e.g. Student's family moved to a new address..."
              placeholderTextColor={C.muted}
              value={changeReason}
              onChangeText={setChangeReason}
              multiline
              numberOfLines={3}
            />

            <View style={{ backgroundColor: C.gold + '15', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 10, padding: 10, marginBottom: 16 }}>
              <Text style={{ color: C.gold, fontSize: 12 }}>
                ⚠️ This change requires admin approval. The current location will remain active until approved.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleChangeRequest}
              disabled={submittingChange || !changeCoords || !changeReason.trim()}
              style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 15, alignItems: 'center', opacity: (submittingChange || !changeCoords || !changeReason.trim()) ? 0.5 : 1 }}
            >
              {submittingChange
                ? <ActivityIndicator color={C.navy} />
                : <Text style={{ color: C.navy, fontWeight: '800', fontSize: 15 }}>Submit Change Request →</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

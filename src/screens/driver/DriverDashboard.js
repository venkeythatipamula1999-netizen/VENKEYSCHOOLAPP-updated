import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { DRIVER_DEFAULT } from '../../data/driver';
import { apiFetch } from '../../api/client';

export default function DriverDashboard({ onNavigate, currentUser }) {
  const [tripActive, setTripActive] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [tripMsg, setTripMsg] = useState('');
  const [routeStudents, setRouteStudents] = useState([]);
  const [stopStatus, setStopStatus] = useState({});
  const [settingStop, setSettingStop] = useState(null);
  const [onDuty, setOnDuty] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('Off Duty');
  const [alertCount, setAlertCount] = useState(0);
  const [todaySummary, setTodaySummary] = useState(null);
  const [boardedCount, setBoardedCount] = useState(0);
  const [recentScans, setRecentScans] = useState([]);
  const watchRef = useRef(null);
  const intervalRef = useRef(null);
  const elapsedRef = useRef(null);
  const latRef = useRef(null);
  const lngRef = useRef(null);
  const speedRef = useRef(0);
  const distanceRef = useRef(0);
  const prevLatRef = useRef(null);
  const prevLngRef = useRef(null);

  const driverName = currentUser?.full_name || DRIVER_DEFAULT.name;
  const driverId = currentUser?.role_id || DRIVER_DEFAULT.id;
  const busNumber = currentUser?.bus_number || DRIVER_DEFAULT.bus.number;
  const busRoute = currentUser?.route || DRIVER_DEFAULT.bus.route;
  const initials = driverName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const getRouteKey = () => {
    if (busRoute) {
      const match = busRoute.match(/Route\s*(\d+)/i);
      if (match) return `Route ${match[1]}`;
    }
    return null;
  };

  const loadRouteStudents = useCallback(async () => {
    const routeKey = getRouteKey();
    const did = currentUser?.role_id || currentUser?.roleId || driverId;
    try {
      const res = await apiFetch(`/bus/route-students?driverId=${encodeURIComponent(did)}&route=${encodeURIComponent(routeKey || '')}`);
      const data = await res.json();
      if (data.success && data.students) {
        setRouteStudents(data.students);
      }
      if (data.stops) setStopStatus(data.stops);
    } catch (e) {
      console.error('Load route students error:', e.message);
    }
  }, [busRoute, driverId]);

  const fetchTripScans = async (currentTripId) => {
    try {
      const res = await apiFetch(`/trip/scans?tripId=${encodeURIComponent(currentTripId)}&driverId=${encodeURIComponent(driverId)}`, {
      });
      const data = await res.json();
      if (data.success) {
        const boardScans = data.scans.filter(s => s.type === 'board');
        setBoardedCount(boardScans.length);
        setRecentScans(data.scans.slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to fetch trip scans:', err.message);
    }
  };

  useEffect(() => {
    loadRouteStudents();
  }, [loadRouteStudents]);

  const loadTodaySummary = useCallback(async () => {
    try {
      const [summaryRes, alertsRes] = await Promise.all([
        apiFetch(`/bus/today-summary?driverId=${encodeURIComponent(driverId)}`),
        apiFetch(`/bus/proximity-alerts-today?busNumber=${encodeURIComponent(busNumber)}`),
      ]);
      const summaryData = await summaryRes.json();
      const alertsData = await alertsRes.json();
      if (summaryData.summary) setTodaySummary(summaryData.summary);
      if (alertsData.count !== undefined) setAlertCount(alertsData.count);
    } catch (e) {
      console.error('Load today summary error:', e.message);
    }
  }, [driverId, busNumber]);

  useEffect(() => {
    loadTodaySummary();
  }, [loadTodaySummary]);

  useEffect(() => {
    return () => {
      if (watchRef.current && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  useEffect(() => {
    let scanInterval = null;
    if (tripActive && tripId) {
      fetchTripScans(tripId);
      scanInterval = setInterval(() => fetchTripScans(tripId), 5000);
    } else {
      setBoardedCount(0);
      setRecentScans([]);
    }
    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [tripActive, tripId]);

  useEffect(() => {
    apiFetch(`/duty/status?roleId=${encodeURIComponent(driverId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.onDuty === true) {
          setOnDuty(true);
          setClockInTime(data.clockIn);
          setCurrentStatus(data.currentStatus || 'On Duty');
        }
      })
      .catch(e => console.error('Duty status fetch error:', e.message));
  }, [driverId]);

  useEffect(() => {
    if (onDuty && tripActive) {
      setCurrentStatus('In Transit/Student Pickup');
      apiFetch('/duty/update-status', {
        method: 'POST',
        body: JSON.stringify({ roleId: driverId, currentStatus: 'In Transit/Student Pickup' }),
      }).catch(e => console.error('Status update error:', e.message));
    } else if (onDuty && !tripActive) {
      setCurrentStatus('On Duty');
      apiFetch('/duty/update-status', {
        method: 'POST',
        body: JSON.stringify({ roleId: driverId, currentStatus: 'On Duty' }),
      }).catch(e => console.error('Status update error:', e.message));
    } else if (!onDuty) {
      setCurrentStatus('Off Duty');
    }
  }, [onDuty, tripActive]);

  const handleDutyToggle = async () => {
    setDutyLoading(true);
    try {
      if (!onDuty) {
        const res = await apiFetch('/duty/clock-in', {
          method: 'POST',
          body: JSON.stringify({ userId: currentUser?.uid || '', name: driverName, role: 'driver', roleId: driverId }),
        });
        const data = await res.json();
        if (data.success !== false) {
          setOnDuty(true);
          setClockInTime(data.clockIn);
        }
      } else {
        const res = await apiFetch('/duty/clock-out', {
          method: 'POST',
          body: JSON.stringify({ userId: currentUser?.uid || '', name: driverName, role: 'driver', roleId: driverId }),
        });
        const data = await res.json();
        if (data.success !== false) {
          setOnDuty(false);
          setClockInTime(null);
          setCurrentStatus('Off Duty');
        }
      }
    } catch (e) {
      console.error('Duty toggle error:', e.message);
    }
    setDutyLoading(false);
  };

  function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toR = d => d * Math.PI / 180;
    const dLat = toR(lat2 - lat1);
    const dLng = toR(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const startGPSTracking = () => {
    distanceRef.current = 0;
    prevLatRef.current = null;
    prevLngRef.current = null;
    if (Platform.OS === 'web' && navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          const newSpeed = Math.round((pos.coords.speed || 0) * 3.6);
          if (prevLatRef.current !== null && prevLngRef.current !== null) {
            const meters = haversineMeters(prevLatRef.current, prevLngRef.current, newLat, newLng);
            if (meters > 5 && meters < 500) {
              distanceRef.current += meters;
            }
          }
          prevLatRef.current = newLat;
          prevLngRef.current = newLng;
          setLat(newLat);
          setLng(newLng);
          setSpeed(newSpeed);
          latRef.current = newLat;
          lngRef.current = newLng;
          speedRef.current = newSpeed;
        },
        (err) => console.error('GPS error:', err.message),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  };

  const sendLocationUpdate = async () => {
    const latitude = latRef.current;
    const longitude = lngRef.current;
    if (latitude === null || longitude === null) return;
    try {
      await apiFetch('/bus/update-location', {
        method: 'POST',
        body: JSON.stringify({ busNumber, lat: latitude, lng: longitude, speed: speedRef.current || 0 }),
      });
    } catch (e) { console.error('Location update error:', e.message); }
  };

  useEffect(() => {
    if (tripActive && lat !== null && lng !== null) {
      sendLocationUpdate();
    }
  }, [lat, lng]);

  const handleStartTrip = async () => {
    setTripLoading(true);
    setTripMsg('');
    try {
      let startLat = null, startLng = null;
      if (Platform.OS === 'web' && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
          );
          startLat = pos.coords.latitude;
          startLng = pos.coords.longitude;
          setLat(startLat);
          setLng(startLng);
          latRef.current = startLat;
          lngRef.current = startLng;
        } catch (e) { console.warn('Initial GPS failed, proceeding:', e.message); }
      }

      const res = await apiFetch('/bus/start-trip', {
        method: 'POST',
        body: JSON.stringify({ driverId, driverName, busNumber, route: busRoute, tripType: 'school', lat: startLat, lng: startLng }),
      });
      const data = await res.json();
      if (data.success) {
        setTripId(data.tripId);
        setTripActive(true);
        setTripStartTime(Date.now());
        startGPSTracking();
        intervalRef.current = setInterval(() => {
          sendLocationUpdate();
        }, 10000);
        elapsedRef.current = setInterval(() => {
          setElapsed(prev => prev + 1);
        }, 60000);
        loadRouteStudents();
        setTripMsg('Trip started! Parents have been notified.');
        setTimeout(() => setTripMsg(''), 4000);
      } else {
        setTripMsg(data.error || 'Failed to start trip');
      }
    } catch (err) {
      setTripMsg('Error: ' + err.message);
    }
    setTripLoading(false);
  };

  const handleEndTrip = async () => {
    setTripLoading(true);
    setTripMsg('');
    try {
      const totalDistanceKm = parseFloat((distanceRef.current / 1000).toFixed(2));
      const res = await apiFetch('/bus/end-trip', {
        method: 'POST',
        body: JSON.stringify({ tripId, driverId, driverName, busNumber, route: busRoute, totalDistance: totalDistanceKm, studentsBoarded: boardedCount }),
      });
      const data = await res.json();
      if (data.success) {
        if (watchRef.current && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
        setTripActive(false);
        setTripId(null);
        setLat(null);
        setLng(null);
        latRef.current = null;
        lngRef.current = null;
        setSpeed(0);
        speedRef.current = 0;
        distanceRef.current = 0;
        prevLatRef.current = null;
        prevLngRef.current = null;
        setElapsed(0);
        setTripStartTime(null);
        setTripMsg(`Trip completed! ${data.durationMin} min · ${totalDistanceKm} km · ${boardedCount} students. Route logged.`);
        setTimeout(() => setTripMsg(''), 6000);
        loadTodaySummary();
      } else {
        setTripMsg(data.error || 'Failed to end trip');
      }
    } catch (err) {
      setTripMsg('Error: ' + err.message);
    }
    setTripLoading(false);
  };

  const handleSetStop = async (student) => {
    if (settingStop === student.id) return;
    setSettingStop(student.id);
    try {
      let stopLat = latRef.current, stopLng = lngRef.current;
      if (stopLat === null || stopLng === null) {
        if (Platform.OS === 'web' && navigator.geolocation) {
          try {
            const pos = await new Promise((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
            );
            stopLat = pos.coords.latitude;
            stopLng = pos.coords.longitude;
          } catch (e) {
            setSettingStop(null);
            setTripMsg('GPS unavailable. Move closer and try again.');
            setTimeout(() => setTripMsg(''), 3000);
            return;
          }
        }
      }

      if (stopLat === null || stopLng === null) {
        setSettingStop(null);
        setTripMsg('GPS location not available yet');
        setTimeout(() => setTripMsg(''), 3000);
        return;
      }

      const routeKey = getRouteKey();
      const res = await apiFetch('/bus/set-stop', {
        method: 'POST',
        body: JSON.stringify({
          studentId: String(student.id),
          studentName: student.name,
          className: student.className,
          route: routeKey,
          lat: stopLat,
          lng: stopLng,
          setBy: driverName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStopStatus(prev => ({
          ...prev,
          [String(student.id)]: { lat: stopLat, lng: stopLng, locked: false, setBy: driverName },
        }));
      } else {
        setTripMsg(data.error || 'Failed to set stop');
        setTimeout(() => setTripMsg(''), 3000);
      }
    } catch (err) {
      setTripMsg('Error: ' + err.message);
      setTimeout(() => setTripMsg(''), 3000);
    }
    setSettingStop(null);
  };

  const stopsSet = Object.keys(stopStatus).length;

  return (
    <View style={{ paddingBottom: 16 }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 2 }}>{'\uD83D\uDC4B'} Good Morning</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: C.white, lineHeight: 30 }}>Welcome, {driverName}!</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.teal + '26' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: C.teal }}>{'\uD83D\uDE8C'} {busNumber}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.purple + '26' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: C.purple }}>ID: {driverId}</Text>
              </View>
            </View>
            {onDuty && clockInTime && (
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Clocked in at {clockInTime}</Text>
            )}
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              onPress={handleDutyToggle}
              disabled={dutyLoading}
              activeOpacity={0.7}
              style={{
                width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: onDuty ? '#34D399' : C.coral,
                opacity: dutyLoading ? 0.6 : 1,
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: 11, color: C.white, textAlign: 'center' }}>
                {dutyLoading ? '...' : onDuty ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 9, fontWeight: '700', color: onDuty ? '#34D399' : C.coral }}>{onDuty ? 'ON Duty' : 'OFF Duty'}</Text>
            {onDuty && <Text style={{ fontSize: 8, fontWeight: '600', color: currentStatus === 'In Transit/Student Pickup' ? C.teal : '#34D399' }}>{currentStatus}</Text>}
          </View>
        </View>
      </View>

      <View style={{ padding: 16, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ backgroundColor: tripActive ? C.teal + '22' : C.navyMid, borderWidth: 1, borderColor: tripActive ? C.teal + '66' : C.border, borderRadius: 20, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: tripActive ? C.teal + '22' : C.border, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="navigate" size={20} color={tripActive ? C.teal : C.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>
                {tripActive ? 'Trip In Progress' : 'Start a Trip'}
              </Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{busRoute}</Text>
            </View>
            {tripActive && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#34D399' }} />
                <Text style={{ color: '#34D399', fontSize: 12, fontWeight: '600' }}>LIVE</Text>
              </View>
            )}
          </View>

          {tripActive && lat !== null && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, backgroundColor: C.teal + '11', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.teal + '33' }}>
                <Text style={{ color: C.teal, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>COORDINATES</Text>
                <Text style={{ fontWeight: '700', fontSize: 12, color: C.white }}>{lat.toFixed(4)}N, {lng.toFixed(4)}E</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Updated live</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.gold + '11', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.gold + '33' }}>
                <Text style={{ color: C.gold, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>SPEED</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontWeight: '700', fontSize: 20, color: C.white }}>{speed} </Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>km/h</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{elapsed} min elapsed</Text>
              </View>
            </View>
          )}

          {!tripActive && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.coral }} />
              <Text style={{ color: C.muted, fontSize: 13 }}>No active trip {'—'} parents cannot see your location</Text>
            </View>
          )}

          {tripMsg ? (
            <View style={{ backgroundColor: tripMsg.includes('Error') || tripMsg.includes('Failed') || tripMsg.includes('locked') || tripMsg.includes('unavailable') ? C.coral + '22' : '#34D39922', borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: tripMsg.includes('Error') || tripMsg.includes('Failed') || tripMsg.includes('locked') || tripMsg.includes('unavailable') ? C.coral : '#34D399', fontSize: 12, fontWeight: '600' }}>{tripMsg}</Text>
            </View>
          ) : null}

          {!tripActive ? (
            <TouchableOpacity
              onPress={handleStartTrip}
              disabled={tripLoading}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.teal, borderRadius: 14, paddingVertical: 14, opacity: tripLoading ? 0.6 : 1 }}
            >
              {tripLoading ? (
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.white, borderTopColor: 'transparent' }} />
              ) : (
                <Text style={{ fontSize: 18 }}>{'\u25B6\uFE0F'}</Text>
              )}
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>
                {tripLoading ? 'Starting Trip...' : 'Start School Trip'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleEndTrip}
              disabled={tripLoading}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.coral, borderRadius: 14, paddingVertical: 14, opacity: tripLoading ? 0.6 : 1 }}
            >
              {tripLoading ? (
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.white, borderTopColor: 'transparent' }} />
              ) : (
                <Text style={{ fontSize: 18 }}>{'\u23F9\uFE0F'}</Text>
              )}
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>
                {tripLoading ? 'Ending Trip...' : 'End Trip'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {routeStudents.length > 0 && (
        <View style={{ padding: 16, paddingHorizontal: 20, paddingBottom: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>{'\uD83D\uDCCD'} Student Pickup Stops</Text>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{stopsSet}/{routeStudents.length} stops mapped</Text>
            </View>
            <View style={{ backgroundColor: stopsSet === routeStudents.length && routeStudents.length > 0 ? '#34D39922' : C.gold + '22', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: stopsSet === routeStudents.length && routeStudents.length > 0 ? '#34D399' : C.gold }}>
                {stopsSet === routeStudents.length && routeStudents.length > 0 ? 'All Set' : `${routeStudents.length - stopsSet} Pending`}
              </Text>
            </View>
          </View>

          {routeStudents.map(student => {
            const stop = stopStatus[String(student.id)];
            const isSet = !!stop;
            const isLocked = stop?.locked;
            const isSetting = settingStop === student.id;

            return (
              <View key={student.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: isSet ? (isLocked ? C.purple + '11' : '#34D39911') : C.navyMid,
                borderWidth: 1, borderColor: isSet ? (isLocked ? C.purple + '33' : '#34D39933') : C.border,
                borderRadius: 14, padding: 12, marginBottom: 8,
              }}>
                <View style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  backgroundColor: isSet ? '#34D39922' : C.teal + '22',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: isSet ? '#34D399' : C.teal }}>{student.photo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{student.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{student.className} {'·'} Roll {student.roll}</Text>
                  {isSet && (
                    <Text style={{ color: '#34D399', fontSize: 10, marginTop: 2 }}>
                      {'\u2705'} {stop.lat?.toFixed(4)}N, {stop.lng?.toFixed(4)}E
                      {isLocked ? ' \uD83D\uDD12' : ''}
                    </Text>
                  )}
                </View>
                {isLocked ? (
                  <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.purple + '22', borderWidth: 1, borderColor: C.purple + '44' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.purple }}>{'\uD83D\uDD12'} Locked</Text>
                  </View>
                ) : isSet ? (
                  <TouchableOpacity
                    onPress={() => handleSetStop(student)}
                    disabled={isSetting}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#34D39922', borderWidth: 1, borderColor: '#34D39944', opacity: isSetting ? 0.5 : 1 }}
                  >
                    {isSetting ? (
                      <ActivityIndicator size="small" color="#34D399" />
                    ) : (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#34D399' }}>{'\u2705'} Set</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSetStop(student)}
                    disabled={isSetting}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.teal, opacity: isSetting ? 0.5 : 1 }}
                  >
                    {isSetting ? (
                      <ActivityIndicator size="small" color={C.white} />
                    ) : (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: C.white }}>{'\uD83D\uDCCD'} Set Stop</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        onPress={() => onNavigate('driver-proximity')}
        style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: C.purple + '1A', borderWidth: 1, borderColor: C.purple + '55', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.purple + '33', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{'\uD83D\uDEA8'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>Proximity Alerts</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            {alertCount > 0 ? `${alertCount} alert${alertCount === 1 ? '' : 's'} sent today` : 'No alerts sent today'}
          </Text>
        </View>
        {alertCount > 0 && (
          <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 12 }}>{alertCount}</Text>
          </View>
        )}
        <Text style={{ color: C.muted, fontSize: 18 }}>{'\u203A'}</Text>
      </TouchableOpacity>

      <View style={{ padding: 16, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Today's Summary</Text>
          <TouchableOpacity onPress={() => onNavigate('driver-duration')}>
            <Text style={{ fontSize: 13, color: C.teal }}>View History</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            {
              label: 'Morning Run',
              val: todaySummary?.morningDuration != null ? `${todaySummary.morningDuration} min` : '--',
              icon: '\uD83C\uDF05',
              color: C.gold,
            },
            {
              label: 'Evening Run',
              val: todaySummary?.eveningDuration != null ? `${todaySummary.eveningDuration} min` : '--',
              icon: '\uD83C\uDF07',
              color: C.teal,
            },
            {
              label: 'On Board',
              val: todaySummary != null
                ? String((todaySummary.morningStudentsBoarded || 0) + (todaySummary.eveningStudentsBoarded || 0))
                : '--',
              icon: '\uD83E\uDDD1\u200D\uD83C\uDF93',
              color: '#34D399',
            },
          ].map(m => (
            <View key={m.label} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</Text>
              <Text style={{ fontWeight: '800', fontSize: 18, color: m.color }}>{m.val}</Text>
              <Text style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ padding: 16, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Recent Scans</Text>
          <TouchableOpacity onPress={() => onNavigate('driver-scans')}>
            <Text style={{ fontSize: 13, color: C.teal }}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentScans.length > 0 ? recentScans.map((scan, i) => (
          <View key={scan.id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, backgroundColor: scan.type === 'board' ? C.teal + '22' : C.coral + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: scan.type === 'board' ? C.teal : C.coral }}>{(scan.studentName || 'S').charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{scan.studentName || 'Student'}</Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>Scan #{(i + 1)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 50, backgroundColor: scan.type === 'board' ? C.teal + '26' : C.coral + '26' }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: scan.type === 'board' ? C.teal : C.coral }}>{scan.type === 'board' ? 'Boarded' : 'Arrived'}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{new Date(scan.timestamp || scan.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
        )) : (
          <View style={{ backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>{tripActive ? 'No scans yet for this trip' : 'Start a trip to see live scans'}</Text>
          </View>
        )}
      </View>

      <View style={{ padding: 16, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Bus Crew</Text>
        </View>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 16 }}>
          {[
            { label: 'Driver', person: { name: driverName, photo: initials, id: driverId }, color: C.teal, icon: '\uD83D\uDE8C' },
            { label: 'Cleaner/Attender', person: DRIVER_DEFAULT.cleaner, color: C.gold, icon: '\uD83E\uDDF9' },
          ].map(({ label, person, color, icon }, i) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: i === 0 ? 1 : 0, borderBottomColor: C.border }}>
              <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: color }}>{person.photo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{person.name}</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>{label} {'·'} {person.id}</Text>
              </View>
              <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: C.teal + '26' }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.teal }}>{icon} {busNumber}</Text>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>Route</Text>
              <Text style={{ fontWeight: '600', fontSize: 11, marginTop: 2, color: C.white, textAlign: 'center' }}>{busRoute}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: C.border }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>Capacity</Text>
              <Text style={{ fontWeight: '700', fontSize: 13, marginTop: 2, color: C.teal }}>{DRIVER_DEFAULT.bus.capacity} seats</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

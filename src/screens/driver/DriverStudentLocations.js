import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform, TextInput } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getFriendlyError } from '../../utils/errorMessages';
import { DRIVER_DEFAULT } from '../../data/driver';
import { apiFetch } from '../../api/client';

export default function DriverStudentLocations({ onBack, currentUser }) {
  const [routeStudents, setRouteStudents] = useState([]);
  const [stopStatus, setStopStatus] = useState({});
  const [pendingRequests, setPendingRequests] = useState({});
  const [settingStop, setSettingStop] = useState(null);
  const [requestingUpdate, setRequestingUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ visible: true, message: msg, type });
  const [searchText, setSearchText] = useState('');
  const [confirmStudent, setConfirmStudent] = useState(null);

  const driverName = currentUser?.full_name || DRIVER_DEFAULT.name;
  const driverId = currentUser?.role_id || DRIVER_DEFAULT.id;
  const busNumber = currentUser?.bus_number || DRIVER_DEFAULT.bus.number;
  const busRoute = currentUser?.route || DRIVER_DEFAULT.bus.route;

  const getRouteKey = () => {
    const match = busRoute.match(/Route\s*(\d+)/i);
    return match ? 'Route ' + match[1] : null;
  };

  const loadData = useCallback(async () => {
    const routeKey = getRouteKey();
    const did = currentUser?.role_id || currentUser?.roleId || driverId;

    try {
      const studentsRes = await apiFetch(`/bus/route-students?driverId=${encodeURIComponent(did)}&route=${encodeURIComponent(routeKey || '')}`);
      const studentsData = await studentsRes.json();
      if (studentsData.success && studentsData.students) {
        setRouteStudents(studentsData.students);
      }
      if (studentsData.stops) {
        setStopStatus(studentsData.stops);
      }
    } catch (e) {
      console.error('Load students error:', e.message);
    }

    try {
      const reqRes = await apiFetch(`/bus/pending-requests?route=${encodeURIComponent(routeKey || '')}`);
      const reqData = await reqRes.json();
      if (reqData.requests) {
        const reqMap = {};
        reqData.requests.forEach(r => { reqMap[r.studentId] = r; });
        setPendingRequests(reqMap);
      }
    } catch (e) {
      console.error('Load pending requests error:', e.message);
    }

    setLoading(false);
  }, [busRoute, driverId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveLocation = async (student) => {
    if (settingStop === student.id) return;
    setSettingStop(student.id);
    try {
      if (Platform.OS === 'web' && navigator.geolocation) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        );
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const routeKey = getRouteKey();
        const res = await apiFetch('/bus/set-stop', {
          method: 'POST',
          body: JSON.stringify({
            studentId: String(student.id),
            studentName: student.name,
            className: student.className,
            route: routeKey,
            lat,
            lng,
            setBy: driverName,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setStopStatus(prev => ({
            ...prev,
            [String(student.id)]: { lat, lng, locked: false, setBy: driverName },
          }));
          showToast('Location saved for ' + student.name);
        } else {
          showToast(data.error || 'Failed to save location', 'error');
        }
      } else {
        showToast('GPS unavailable on this device', 'error');
      }
    } catch (e) {
      showToast(getFriendlyError(e, 'GPS error. Please try again.'), 'error');
    }
    setSettingStop(null);
  };

  const handleRequestUpdate = async (student) => {
    if (requestingUpdate === student.id) return;
    setConfirmStudent(null);
    setRequestingUpdate(student.id);
    try {
      if (Platform.OS === 'web' && navigator.geolocation) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        );
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const routeKey = getRouteKey();
        const res = await apiFetch('/bus/request-location-change', {
          method: 'POST',
          body: JSON.stringify({
            studentId: String(student.id),
            studentName: student.name,
            className: student.className,
            route: routeKey,
            newLat: lat,
            newLng: lng,
            requestedBy: driverName,
            requestedByRoleId: driverId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setPendingRequests(prev => ({
            ...prev,
            [String(student.id)]: { studentId: String(student.id), requestId: data.requestId },
          }));
          showToast('Update request sent to Admin for approval');
        } else {
          showToast(data.error || 'Failed to send request', 'error');
        }
      } else {
        showToast('GPS unavailable on this device', 'error');
      }
    } catch (e) {
      showToast(getFriendlyError(e, 'GPS error. Please try again.'), 'error');
    }
    setRequestingUpdate(null);
  };

  const routeKey = getRouteKey();
  const mappedCount = routeStudents.filter(s => !!stopStatus[String(s.id)]).length;
  const unmappedCount = routeStudents.length - mappedCount;

  const filtered = routeStudents.filter(s => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.className && s.className.toLowerCase().includes(q));
  });

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading students..." />;
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 12, gap: 12 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>Student Locations</Text>
          <Text style={{ fontSize: 11, color: C.muted }}>{busNumber} {'·'} {routeKey || busRoute}</Text>
        </View>
        <View style={{ backgroundColor: C.teal + '22', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.teal }}>{routeKey || busRoute}</Text>
        </View>
      </View>

      <View style={{ marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, gap: 8 }}>
        <Text style={{ fontSize: 14 }}>{'\uD83D\uDCCD'}</Text>
        <Text style={{ color: C.muted, fontSize: 11, flex: 1 }}>Save student home locations for automatic proximity alerts</Text>
      </View>


      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 }}>
        <View style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.white }}>{routeStudents.length}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: C.muted, marginTop: 2 }}>Total</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: '#34D39933', borderRadius: 14, padding: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#34D399' }}>{mappedCount}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: C.muted, marginTop: 2 }}>Location Set</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.coral + '33', borderRadius: 14, padding: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.coral }}>{unmappedCount}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: C.muted, marginTop: 2 }}>Not Set</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 0 }}>
          <Icon name="search" size={16} color={C.muted} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by name or grade..."
            placeholderTextColor={C.muted}
            style={{ flex: 1, color: C.white, fontSize: 13, paddingVertical: 10, paddingHorizontal: 8, outlineStyle: 'none' }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={{ color: C.muted, fontSize: 16, fontWeight: '600' }}>{'\u2715'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {confirmStudent && (
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 14, padding: 14 }}>
          <Text style={{ color: C.white, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
            Request Admin to change {confirmStudent.name}'s stop?
          </Text>
          <Text style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>
            New coordinates will be captured from your current GPS location and sent to Admin for approval.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => handleRequestUpdate(confirmStudent)}
              style={{ flex: 1, backgroundColor: C.gold, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 12 }}>Yes, Request Update</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setConfirmStudent(null)}
              style={{ flex: 1, backgroundColor: C.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: C.muted, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {routeStudents.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>{'\uD83D\uDE8C'}</Text>
          <Text style={{ color: C.muted, fontSize: 14 }}>No students assigned to this bus</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ fontSize: 24, marginBottom: 8 }}>{'\uD83D\uDD0D'}</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>No students match "{searchText}"</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          {filtered.map(student => {
            const stop = stopStatus[String(student.id)];
            const isSet = !!stop;
            const hasPending = !!pendingRequests[String(student.id)];
            const isSetting = settingStop === student.id;
            const isRequesting = requestingUpdate === student.id;

            return (
              <View key={student.id} style={{
                backgroundColor: C.card, borderWidth: 1,
                borderColor: isSet ? '#34D39933' : C.border,
                borderRadius: 16, padding: 14, marginBottom: 10,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: isSet ? '#34D39922' : C.teal + '22',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: isSet ? '#34D399' : C.teal }}>{student.photo}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>{student.name}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{student.className}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{student.parent} {'·'} {student.phone}</Text>
                  </View>

                  <View style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 12, height: 12, borderRadius: 6,
                      backgroundColor: isSet ? '#34D399' : C.muted,
                      marginBottom: 3,
                    }} />
                    <Text style={{ fontSize: 8, fontWeight: '700', color: isSet ? '#34D399' : C.muted }}>
                      {isSet ? 'Location Saved' : 'Not Set'}
                    </Text>
                  </View>
                </View>

                {isSet && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ color: '#34D399', fontSize: 10 }}>
                          {'\uD83D\uDCCD'} {stop.lat?.toFixed(4)}N, {stop.lng?.toFixed(4)}E
                        </Text>
                        <Text style={{ color: '#34D399', fontSize: 9, marginTop: 1 }}>Proximity alert active</Text>
                      </View>
                      {hasPending && (
                        <View style={{ backgroundColor: C.purple + '22', borderWidth: 1, borderColor: C.purple + '44', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 }}>
                          <Text style={{ color: C.purple, fontSize: 9, fontWeight: '700' }}>Pending Approval</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                <View style={{ marginTop: 10 }}>
                  {isSetting || isRequesting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 }}>
                      <ActivityIndicator size="small" color={isSet ? C.gold : C.teal} />
                      <Text style={{ color: C.muted, fontSize: 11 }}>{isSet ? 'Sending request...' : 'Capturing GPS...'}</Text>
                    </View>
                  ) : !isSet ? (
                    <TouchableOpacity
                      onPress={() => handleSaveLocation(student)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.teal, borderRadius: 12, paddingVertical: 10 }}
                    >
                      <Text style={{ fontSize: 13 }}>{'\uD83D\uDCCD'}</Text>
                      <Text style={{ color: C.white, fontSize: 12, fontWeight: '700' }}>Save Home Location</Text>
                    </TouchableOpacity>
                  ) : hasPending ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.purple + '15', borderWidth: 1, borderColor: C.purple + '33', borderRadius: 12, paddingVertical: 10 }}>
                      <Text style={{ color: C.purple, fontSize: 12, fontWeight: '600' }}>Update Pending Admin Approval</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setConfirmStudent(student)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 12, paddingVertical: 10 }}
                    >
                      <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>Update Location</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Toast {...toast} onHide={() => setToast(t => ({...t, visible: false}))} />
    </ScrollView>
  );
}

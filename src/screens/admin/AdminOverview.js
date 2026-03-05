import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
const ROLE_COLORS = { teacher: C.gold, driver: C.teal, cleaner: C.coral };
const STATUS_COLORS = {
  'Class in Progress': C.purple,
  'In Transit': C.teal,
  'In Transit/Student Pickup': C.teal,
  'Available': '#34D399',
  'On Duty': '#34D399',
  'Off Duty': C.muted,
  'Auto Clock-Out': C.coral,
};

export default function AdminOverview({ onNavigate, currentUser }) {
  const [realStats, setRealStats] = useState({ teachers: 0, drivers: 0, cleaners: 0, classes: 0 });
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    const fetchSync = () => {
      fetch('/api/admin/sync-status?t=' + Date.now(), { cache: 'no-store' })
        .then(r => r.json())
        .then(data => setSyncStatus(data))
        .catch(() => {});
    };
    fetchSync();
    const interval = setInterval(fetchSync, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUnread = () => {
      fetch('/api/admin/notifications?unreadOnly=true&t=' + Date.now(), { cache: 'no-store' })
        .then(r => r.json())
        .then(data => setUnreadNotifCount(data.count || 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/onboarded-users?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const users = data.users || [];
        setRealStats(prev => ({
          ...prev,
          teachers: users.filter(u => u.role === 'teacher').length,
          drivers: users.filter(u => u.role === 'driver').length,
          cleaners: users.filter(u => u.role === 'cleaner').length,
        }));
      })
      .catch(() => {});
    fetch('/api/classes?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setRealStats(prev => ({ ...prev, classes: (d.classes || []).length })))
      .catch(() => {});
  }, []);

  const [staffDuty, setStaffDuty] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [locationRequests, setLocationRequests] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [locationMsg, setLocationMsg] = useState('');

  useEffect(() => {
    const fetchStaff = (showLoader) => {
      if (showLoader) setStaffLoading(true);
      fetch('/api/duty/all-staff?t=' + Date.now(), { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          const sorted = (data.staff || []).sort((a, b) => (b.onDuty ? 1 : 0) - (a.onDuty ? 1 : 0));
          setStaffDuty(sorted);
        })
        .catch(() => {})
        .finally(() => { if (showLoader) setStaffLoading(false); });
    };
    fetchStaff(true);
    const interval = setInterval(() => fetchStaff(false), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRequests = () => {
      fetch('/api/bus/location-change-requests?t=' + Date.now(), { cache: 'no-store' })
        .then(res => res.json())
        .then(data => { setLocationRequests(data.requests || []); })
        .catch(() => {});
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveLocation = (request) => {
    setApprovingId(request.id);
    setLocationMsg('');
    fetch('/api/bus/approve-location-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLocationRequests(prev => prev.filter(r => r.id !== request.id));
          setLocationMsg(`Approved location for ${request.studentName}`);
          setTimeout(() => setLocationMsg(''), 3000);
        } else {
          setLocationMsg(data.error || 'Failed to approve');
          setTimeout(() => setLocationMsg(''), 4000);
        }
      })
      .catch(() => { setLocationMsg('Network error approving request'); setTimeout(() => setLocationMsg(''), 4000); })
      .finally(() => setApprovingId(null));
  };

  const handleRejectLocation = (request) => {
    setRejectingId(request.id);
    setLocationMsg('');
    fetch('/api/bus/reject-location-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLocationRequests(prev => prev.filter(r => r.id !== request.id));
          setLocationMsg(`Rejected location change for ${request.studentName}`);
          setTimeout(() => setLocationMsg(''), 3000);
        } else {
          setLocationMsg(data.error || 'Failed to reject');
          setTimeout(() => setLocationMsg(''), 4000);
        }
      })
      .catch(() => { setLocationMsg('Network error rejecting request'); setTimeout(() => setLocationMsg(''), 4000); })
      .finally(() => setRejectingId(null));
  };

  const statGrid = [
    { icon: '\uD83D\uDC69\u200D\uD83C\uDFEB', val: String(realStats.teachers), lbl: 'Teachers', color: C.gold },
    { icon: '\uD83C\uDFEB', val: String(realStats.classes), lbl: 'Classes', color: C.purple },
    { icon: '\uD83D\uDE8C', val: String(realStats.drivers), lbl: 'Drivers', color: C.coral },
    { icon: '\uD83E\uDDF9', val: String(realStats.cleaners), lbl: 'Cleaners', color: C.teal },
  ];

  const quickNav = [
    { icon: '\uD83D\uDC65', label: 'Manage Users', screen: 'admin-users', color: C.teal },
    { icon: '\uD83C\uDFEB', label: 'Classes', screen: 'admin-classes', color: C.gold },
    { icon: '\uD83D\uDE8C', label: 'Bus & Routes', screen: 'admin-buses', color: C.coral },
    { icon: '\uD83D\uDCCA', label: 'Reports', screen: 'admin-reports', color: C.purple },
    { icon: '\uD83D\uDCC5', label: 'Leave Requests', screen: 'admin-leaves', color: '#34D399' },
    { icon: '\uD83D\uDCB0', label: 'Fee Management', screen: 'admin-fees', color: '#60A5FA' },
    { icon: '\uD83D\uDCB8', label: 'Payroll', screen: 'admin-salary', color: '#FB923C' },
    { icon: '\uD83C\uDF93', label: 'Activities', screen: 'admin-activities', color: C.gold },
  ];

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <ScrollView style={styles.container}>
      {syncStatus !== null && (
        <View style={{ marginHorizontal: 20, marginTop: 16, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: syncStatus.synced ? 'rgba(52,211,153,0.12)' : 'rgba(251,146,60,0.12)', borderWidth: 1, borderColor: syncStatus.synced ? '#34D399' : '#FB923C' }}>
          <Text style={{ fontSize: 14 }}>{syncStatus.synced ? '✅' : '⚠️'}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: syncStatus.synced ? '#34D399' : '#FB923C', flex: 1 }}>
            {syncStatus.synced ? 'Google Sheets synced' : `Sync pending — ${syncStatus.pending} record${syncStatus.pending !== 1 ? 's' : ''} waiting`}
          </Text>
        </View>
      )}
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Master Admin · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.white }}>School Overview</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => onNavigate('admin-alerts')} style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>{'\uD83D\uDD14'}</Text>
              {unreadNotifCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: C.navy }}>
                  <Text style={{ color: C.white, fontSize: 10, fontWeight: '700' }}>{unreadNotifCount > 99 ? '99+' : String(unreadNotifCount)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('admin-profile')} style={styles.adminAvatar}>
              {currentUser?.profileImage ? (
                <Image source={{ uri: currentUser.profileImage }} style={{ width: 42, height: 42, borderRadius: 13 }} />
              ) : (
                <Text style={{ fontSize: 22 }}>{'\uD83D\uDC68\u200D\uD83D\uDCBC'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {statGrid.map((st) => (
            <View key={st.lbl} style={[styles.statCard, { borderTopColor: st.color, borderTopWidth: 3 }]}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{st.icon}</Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: st.color }}>{st.val}</Text>
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{st.lbl}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <Text style={styles.secTitle}>Manage</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {quickNav.map((q) => (
            <TouchableOpacity key={q.label} onPress={() => onNavigate(q.screen)}
              style={[styles.navCard, { borderColor: q.color + '44' }]}>
              <View style={[styles.navIcon, { backgroundColor: q.color + '22' }]}>
                <Text style={{ fontSize: 22 }}>{q.icon}</Text>
              </View>
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 13, flex: 1 }}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.secTitle}>Live Staff Board</Text>
        {staffLoading ? (
          <View style={[styles.card, { marginBottom: 20, alignItems: 'center', padding: 24 }]}>
            <ActivityIndicator color={C.teal} />
          </View>
        ) : staffDuty.length === 0 ? (
          <View style={[styles.card, { marginBottom: 20, alignItems: 'center', padding: 24 }]}>
            <Text style={{ fontSize: 22, marginBottom: 8 }}>{'\uD83D\uDCCB'}</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>No staff activity today</Text>
          </View>
        ) : (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ backgroundColor: '#34D399' + '22', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 50, borderWidth: 1, borderColor: '#34D399' + '44' }}>
                <Text style={{ color: '#34D399', fontSize: 12, fontWeight: '700' }}>{staffDuty.filter(s => s.onDuty).length} On Duty</Text>
              </View>
              <View style={{ backgroundColor: C.coral + '22', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 50, borderWidth: 1, borderColor: C.coral + '44' }}>
                <Text style={{ color: C.coral, fontSize: 12, fontWeight: '700' }}>{staffDuty.filter(s => !s.onDuty).length} Off Duty</Text>
              </View>
            </View>
            {staffDuty.slice(0, 8).map((member, idx) => (
              <View key={member.roleId || idx} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: member.onDuty ? '#34D399' : C.coral, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: C.white }}>{member.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: ROLE_COLORS[member.role] || C.muted, fontWeight: '600' }}>{member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : ''}</Text>
                    <Text style={{ fontSize: 11, color: STATUS_COLORS[member.currentStatus] || C.muted }}>{member.currentStatus || 'Off Duty'}</Text>
                  </View>
                </View>
                {member.clockIn ? (
                  <Text style={{ fontSize: 10, color: C.muted }}>{member.clockIn}</Text>
                ) : null}
              </View>
            ))}
            {staffDuty.length > 8 && (
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, color: C.teal }}>View All ({staffDuty.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {locationMsg ? (
          <View style={{ backgroundColor: locationMsg.includes('Approved') ? '#34D39922' : locationMsg.includes('Rejected') ? C.gold + '22' : C.coral + '22', borderRadius: 10, padding: 10, marginBottom: 12 }}>
            <Text style={{ color: locationMsg.includes('Approved') ? '#34D399' : locationMsg.includes('Rejected') ? C.gold : C.coral, fontSize: 12, fontWeight: '600' }}>{locationMsg}</Text>
          </View>
        ) : null}

        {locationRequests.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Text style={styles.secTitle}>Location Change Requests</Text>
              <View style={{ backgroundColor: C.coral + '22', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 50, borderWidth: 1, borderColor: C.coral + '44' }}>
                <Text style={{ color: C.coral, fontSize: 12, fontWeight: '700' }}>{locationRequests.length}</Text>
              </View>
            </View>
            {locationRequests.map((req) => (
              <View key={req.id} style={[styles.card, { marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: C.white }}>{req.studentName}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{req.className}</Text>
                  </View>
                  <View style={{ backgroundColor: C.teal + '22', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 50 }}>
                    <Text style={{ color: C.teal, fontSize: 11, fontWeight: '600' }}>{req.route}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{req.oldLat?.toFixed(4)}, {req.oldLng?.toFixed(4)}</Text>
                  <Text style={{ color: C.gold, fontSize: 11 }}>{'→'}</Text>
                  <Text style={{ color: C.gold, fontSize: 11, fontWeight: '600' }}>{req.newLat?.toFixed(4)}, {req.newLng?.toFixed(4)}</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>Requested by: {req.requestedBy}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {approvingId === req.id ? (
                    <ActivityIndicator color="#34D399" />
                  ) : (
                    <TouchableOpacity onPress={() => handleApproveLocation(req)} style={{ backgroundColor: '#34D399', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 }}>
                      <Text style={{ color: C.white, fontWeight: '700', fontSize: 12 }}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {rejectingId === req.id ? (
                    <ActivityIndicator color={C.coral} />
                  ) : (
                    <TouchableOpacity onPress={() => handleRejectLocation(req)} style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '44', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 }}>
                      <Text style={{ color: C.coral, fontWeight: '700', fontSize: 12 }}>Reject</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>Attendance analytics will appear here as teachers record daily attendance.</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={styles.secTitle}>Leave Requests</Text>
          <TouchableOpacity onPress={() => onNavigate('admin-leaves')}>
            <Text style={{ fontSize: 12, color: C.teal }}>View All</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => onNavigate('admin-leaves')} style={[styles.card, { marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
          <Text style={{ fontSize: 28 }}>{'\uD83D\uDCC5'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>Staff Leave Applications</Text>
            <Text style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Tap to review and approve or reject pending leave requests.</Text>
          </View>
          <Text style={{ fontSize: 16, color: C.muted }}>{'\u203A'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },
  adminAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.purple + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.purple + '44' },
  statCard: { width: '31%', backgroundColor: C.card, borderRadius: 14, padding: 14, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 14 },
  navCard: { width: '48%', backgroundColor: C.card, borderWidth: 1, borderRadius: 16, padding: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  navIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  progressTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});

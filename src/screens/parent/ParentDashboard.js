import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal, TextInput } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ParentDashboard({ onNavigate, currentUser, onLogout, onUpdateUser }) {
  const [attSummary, setAttSummary] = useState(null);
  const [marksSummary, setMarksSummary] = useState(null);
  const [liveNotifs, setLiveNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  const [showAddChild, setShowAddChild] = useState(false);
  const [addChildId, setAddChildId] = useState('');
  const [addChildPhone, setAddChildPhone] = useState('');
  const [addChildLoading, setAddChildLoading] = useState(false);
  const [addChildError, setAddChildError] = useState('');
  const [addChildSuccess, setAddChildSuccess] = useState('');

  const studentId = currentUser?.studentId || '';
  const studentName = currentUser?.studentName || 'Student';
  const studentClass = currentUser?.studentClass || '';
  const rollNumber = currentUser?.rollNumber || '';
  const parentName = currentUser?.parentName || '';
  const children = currentUser?.children || [];
  const uid = currentUser?.uid || '';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning,' : hour < 17 ? 'Good Afternoon,' : 'Good Evening,';

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      apiFetch(`/attendance/student-monthly?studentId=${encodeURIComponent(studentId)}&month=${currentMonth()}`).then(r => r.json()),
      apiFetch(`/marks/student/${encodeURIComponent(studentId)}`).then(r => r.json()),
      apiFetch(`/parent-notifications?studentId=${encodeURIComponent(studentId)}`).then(r => r.json()),
    ]).then(([att, marks, notifs]) => {
      if (att.success) setAttSummary(att.summary);
      if (marks.success) setMarksSummary(marks);
      setLiveNotifs((notifs.notifications || []).slice(0, 3));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [studentId]);

  const handleSwitchChild = async (targetStudentId) => {
    if (!uid) return;
    setSwitchLoading(true);
    try {
      const res = await apiFetch('/parent/switch-child', {
        method: 'POST',
        body: JSON.stringify({ uid, studentId: targetStudentId }),
      });
      const data = await res.json();
      if (data.success && onUpdateUser) {
        onUpdateUser(data.user);
        setShowChildSwitcher(false);
      }
    } catch {}
    finally { setSwitchLoading(false); }
  };

  const handleAddChild = async () => {
    setAddChildError('');
    setAddChildSuccess('');
    if (!addChildId.trim()) { setAddChildError('Please enter a Student ID'); return; }
    if (!uid) { setAddChildError('Session error. Please logout and login again.'); return; }
    setAddChildLoading(true);
    try {
      const res = await apiFetch('/parent/add-child', {
        method: 'POST',
        body: JSON.stringify({ uid, studentId: addChildId.trim(), phone: addChildPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAddChildError(data.error || 'Failed to add child'); return; }
      setAddChildSuccess(`${data.studentName} added successfully!`);
      setAddChildId('');
      setAddChildPhone('');
      if (onUpdateUser && data.newStudentIds) {
        onUpdateUser({ ...currentUser, studentIds: data.newStudentIds });
      }
      setTimeout(() => { setShowAddChild(false); setAddChildSuccess(''); }, 2000);
    } catch {
      setAddChildError('Network error. Please try again.');
    } finally {
      setAddChildLoading(false);
    }
  };

  const quickActions = [
    { label: 'Attendance', icon: 'check', color: C.teal, screen: 'attendance' },
    { label: 'Marks', icon: 'chart', color: C.gold, screen: 'marks' },
    { label: 'Bus Track', icon: 'bus', color: C.coral, screen: 'bus' },
    { label: 'Alerts', icon: 'bell', color: C.purple, screen: 'notifications' },
    { label: 'Fee Details', icon: 'fee', color: '#22c55e', screen: 'fee' },
    { label: 'Apply Leave', icon: 'leave', color: '#f59e0b', screen: 'leave' },
    { label: 'Files', icon: 'grid', color: '#8B5CF6', screen: 'digital-folder' },
  ];

  const attPct = attSummary?.pct ?? null;
  const avgMarks = marksSummary?.overallPct ?? null;
  const attColor = attPct === null ? C.muted : attPct >= 90 ? '#34D399' : attPct >= 75 ? C.gold : C.coral;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ padding: 20, paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 2 }}>{greeting}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: C.white }} numberOfLines={1}>{parentName || 'Parent'}!</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={onLogout} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted }}>Logout</Text>
            </TouchableOpacity>
            <View style={st.avatar}><Text style={{ fontWeight: '700', color: C.navy, fontSize: 15 }}>{initials(parentName || studentName)}</Text></View>
          </View>
        </View>

        <View style={st.childCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <View style={st.bigAvatar}><Text style={{ fontWeight: '800', color: C.white, fontSize: 22 }}>{initials(studentName)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: C.white }}>{studentName || 'No student linked'}</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>
                {studentClass ? studentClass + (rollNumber ? ' · Roll #' + rollNumber : '') : 'Class not assigned'}
              </Text>
              {studentId ? <Text style={{ color: C.gold, fontSize: 11, fontWeight: '600', marginTop: 3 }}>ID: {studentId}</Text> : null}
            </View>
            {attSummary && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: attColor + '22', borderWidth: 1, borderColor: attColor + '44' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: attColor }}>
                  {attSummary.pct >= 90 ? 'Excellent' : attSummary.pct >= 75 ? 'Good' : 'Low'}
                </Text>
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={C.teal} size="small" />
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { label: 'Attendance', value: attPct !== null ? attPct + '%' : '–', color: attColor },
                { label: 'Avg Marks', value: avgMarks !== null ? avgMarks + '%' : '–', color: C.gold },
                { label: 'This Month', value: attSummary ? attSummary.present + '/' + attSummary.total : '–', color: C.teal },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, backgroundColor: C.navy + '88', borderRadius: 12 }}>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, color: C.muted, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {children.length > 1 || uid ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {children.length > 1 && (
                <TouchableOpacity onPress={() => setShowChildSwitcher(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.teal + '22', borderWidth: 1, borderColor: C.teal + '44' }}>
                  <Icon name="users" size={14} color={C.teal} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.teal }}>Switch Child ({children.length})</Text>
                </TouchableOpacity>
              )}
              {uid && (
                <TouchableOpacity onPress={() => { setAddChildId(''); setAddChildPhone(''); setAddChildError(''); setAddChildSuccess(''); setShowAddChild(true); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold + '44' }}>
                  <Text style={{ fontSize: 14, color: C.gold }}>+</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.gold }}>Add Child</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {quickActions.map(a => (
            <TouchableOpacity key={a.label} onPress={() => onNavigate(a.screen)} style={{ width: '30%', alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: a.color + '22', borderWidth: 1, borderColor: a.color + '44', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Icon name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={{ fontSize: 11, color: C.muted, fontWeight: '500', textAlign: 'center' }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {liveNotifs.length > 0 && (
          <>
            <View style={st.secHead}>
              <Text style={st.secTitle}>Recent Alerts</Text>
              <TouchableOpacity onPress={() => onNavigate('notifications')}><Text style={{ fontSize: 13, color: C.gold }}>See all</Text></TouchableOpacity>
            </View>
            <View style={st.card}>
              {liveNotifs.map((n, i) => {
                const isAbs = n.type === 'attendance_absent';
                const isLeave = n.type === 'student_leave_status';
                const isFee = n.type === 'fee_reminder';
                const color = isAbs ? C.coral : isLeave ? '#34D399' : isFee ? C.gold : C.teal;
                const icon = isAbs ? '❌' : isLeave ? '📅' : isFee ? '💰' : '📢';
                return (
                  <View key={n.id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: i < liveNotifs.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.white, marginBottom: 2 }} numberOfLines={1}>{n.title || 'Notification'}</Text>
                      <Text style={{ fontSize: 11, color: C.muted }} numberOfLines={2}>{n.message}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {liveNotifs.length === 0 && !loading && (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>{'🔔'}</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No notifications yet.{'\n'}School updates will appear here.</Text>
          </View>
        )}
      </View>

      <Modal visible={showChildSwitcher} transparent animationType="fade" onRequestClose={() => setShowChildSwitcher(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: C.white }}>Switch Child</Text>
              <TouchableOpacity onPress={() => setShowChildSwitcher(false)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={16} color={C.muted} />
              </TouchableOpacity>
            </View>
            {children.map((child, i) => {
              const isActive = child.studentId === studentId;
              return (
                <TouchableOpacity
                  key={child.studentId}
                  onPress={() => !isActive && handleSwitchChild(child.studentId)}
                  disabled={isActive || switchLoading}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: isActive ? C.teal + '22' : C.navyMid, borderWidth: 1, borderColor: isActive ? C.teal + '44' : C.border, marginBottom: i < children.length - 1 ? 10 : 0, opacity: switchLoading ? 0.6 : 1 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isActive ? C.teal : C.navyLt, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontWeight: '800', color: C.white, fontSize: 16 }}>{initials(child.studentName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>{child.studentName}</Text>
                    <Text style={{ fontSize: 12, color: C.muted }}>{child.studentClass}</Text>
                  </View>
                  {isActive && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal }} />}
                  {switchLoading && !isActive && <ActivityIndicator size="small" color={C.teal} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal visible={showAddChild} transparent animationType="fade" onRequestClose={() => setShowAddChild(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: C.white }}>Add Another Child</Text>
              <TouchableOpacity onPress={() => setShowAddChild(false)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={16} color={C.muted} />
              </TouchableOpacity>
            </View>

            {addChildSuccess ? (
              <View style={{ backgroundColor: '#34D399' + '22', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#34D399' + '44' }}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>{'✅'}</Text>
                <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>{addChildSuccess}</Text>
              </View>
            ) : (
              <>
                {addChildError ? <View style={{ backgroundColor: C.coral + '22', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.coral + '44' }}><Text style={{ color: C.coral, fontSize: 13 }}>{addChildError}</Text></View> : null}

                <Text style={lbl}>Student ID of Other Child</Text>
                <TextInput style={inp} placeholder="e.g. STU17725247907682810" placeholderTextColor={C.muted} value={addChildId} onChangeText={setAddChildId} autoCapitalize="characters" />

                <Text style={lbl}>Phone Number (to verify)</Text>
                <TextInput style={inp} placeholder="Registered phone number" placeholderTextColor={C.muted} value={addChildPhone} onChangeText={setAddChildPhone} keyboardType="phone-pad" />

                <TouchableOpacity onPress={handleAddChild} disabled={addChildLoading} style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: addChildLoading ? 0.7 : 1 }}>
                  {addChildLoading ? <ActivityIndicator color={C.navy} /> : <Text style={{ color: C.navy, fontWeight: '800', fontSize: 15 }}>Add Child</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const lbl = { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 };
const inp = { backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 14, color: C.white, marginBottom: 14 };

const st = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  bigAvatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  childCard: { backgroundColor: C.navyLt, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 24 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden' },
});

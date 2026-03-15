import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { C } from '../../theme/colors';
import { apiFetch } from '../../api/client';

function fmtTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7)    return `${diffD}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function typeInfo(type) {
  if (type === 'MARKS_SUBMITTED') return { icon: '📝', label: 'Marks Submitted', color: '#22d38a', bg: '#14532d' };
  if (type === 'MARKS_EDITED')    return { icon: '✏️', label: 'Marks Edited',    color: '#60a5fa', bg: '#1e3a5f' };
  return                                   { icon: '🔔', label: 'Notification',   color: C.gold,   bg: C.card   };
}

function NotifCard({ notif, onPress }) {
  const { icon, label, color, bg } = typeInfo(notif.type);
  const isUnread = !notif.read;

  return (
    <TouchableOpacity
      onPress={() => onPress(notif)}
      activeOpacity={0.75}
      style={[
        st.card,
        isUnread && st.cardUnread,
        { borderLeftColor: isUnread ? color : 'transparent' },
      ]}
    >
      <View style={[st.iconWrap, { backgroundColor: bg }]}>
        <Text style={st.iconText}>{icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={[st.typeLabel, { color }]}>{label}</Text>
            <Text style={st.teacher}>
              {notif.teacherName || 'Teacher'}{notif.className ? ` · Class ${notif.className}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={st.time}>{fmtTime(notif.createdAt || notif.timestamp)}</Text>
            {isUnread && <View style={st.unreadDot} />}
          </View>
        </View>

        {notif.subjectName ? (
          <Text style={st.detail}>
            {notif.subjectName}
            {notif.examType ? ` · ${notif.examType}` : ''}
            {notif.studentCount > 1 ? ` · ${notif.studentCount} students` : ''}
          </Text>
        ) : null}

        {notif.type === 'MARKS_EDITED' && (
          <View style={{ marginTop: 6 }}>
            {notif.studentName ? (
              <Text style={st.detail}>Student: {notif.studentName}</Text>
            ) : null}
            {notif.previousMarks !== undefined && notif.updatedMarks !== undefined ? (
              <Text style={[st.detail, { color: '#60a5fa' }]}>
                {notif.previousMarks} → {notif.updatedMarks} marks
              </Text>
            ) : null}
            {notif.reason ? (
              <View style={st.reasonBox}>
                <Text style={st.reasonText}>"{notif.reason}"</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AdminNotificationsScreen({ onBack }) {
  const [notifs, setNotifs]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifs.filter(n => !n.read).length;

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/school-notifications');
      const data = await res.json();
      setNotifs(data.notifications || []);
    } catch (e) {
      console.warn('AdminNotificationsScreen fetch error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markRead = async (notif) => {
    if (notif.read) return;
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    apiFetch('/school-notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ ids: [notif.id] }),
    }).catch(() => {});
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await apiFetch('/school-notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ ids: [] }),
      });
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.warn('Mark all read error', e.message);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Text style={{ color: C.white, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Notifications</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} disabled={markingAll} style={st.markAllBtn}>
            {markingAll
              ? <ActivityIndicator size="small" color={C.teal} />
              : <Text style={st.markAllText}>Mark all read</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={{ color: C.muted, marginTop: 12 }}>Loading notifications...</Text>
        </View>
      ) : notifs.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ fontSize: 48 }}>📭</Text>
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>No notifications yet</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>Mark submissions will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={n => n.id}
          renderItem={({ item }) => (
            <NotifCard notif={item} onPress={markRead} />
          )}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.navy },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 50, backgroundColor: C.navyMid, borderBottomWidth: 1, borderColor: C.border },
  backBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 18, fontWeight: '800', color: C.white },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: C.teal + '66', minWidth: 90, alignItems: 'center' },
  markAllText:{ color: C.teal, fontSize: 12, fontWeight: '700' },
  card:       { flexDirection: 'row', gap: 12, backgroundColor: C.navyMid, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4 },
  cardUnread: { backgroundColor: '#0f2348' },
  iconWrap:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText:   { fontSize: 20 },
  typeLabel:  { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  teacher:    { fontSize: 14, color: C.white, fontWeight: '600', marginTop: 2 },
  time:       { fontSize: 11, color: C.muted },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal },
  detail:     { fontSize: 12, color: C.muted, marginTop: 2 },
  reasonBox:  { backgroundColor: '#162E50', borderRadius: 8, padding: 8, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#60a5fa' },
  reasonText: { fontSize: 12, color: '#93c5fd', fontStyle: 'italic' },
});

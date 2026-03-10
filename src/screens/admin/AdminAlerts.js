import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function NotifCard({ notif, onMarkRead }) {
  const isEdited = notif.type === 'attendance_edited';
  const isSubmitted = notif.type === 'attendance_submitted';
  const isMarksEdited = notif.type === 'marks_edited';
  const accentColor = isMarksEdited ? C.gold : isEdited ? '#FB923C' : '#34D399';
  const isHighPriority = isEdited || isMarksEdited;

  return (
    <View style={{
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: notif.read ? C.border : accentColor + '55',
      borderLeftWidth: 4,
      borderLeftColor: notif.read ? C.border : accentColor,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      opacity: notif.read ? 0.7 : 1,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: accentColor + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{notif.icon || (isMarksEdited ? '\u270F\uFE0F' : isEdited ? '\u270F\uFE0F' : '\u2705')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: C.white, flex: 1 }}>{notif.title}</Text>
            {isHighPriority && !notif.read && (
              <View style={{ backgroundColor: accentColor + '22', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 }}>
                <Text style={{ color: accentColor, fontSize: 10, fontWeight: '700' }}>HIGH</Text>
              </View>
            )}
            {!notif.read && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accentColor }} />
            )}
          </View>
          <Text style={{ fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 8 }}>{notif.message}</Text>
          {notif.details && isEdited && (
            <View style={{ backgroundColor: C.navyMid, borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {'Student: '}<Text style={{ color: C.white, fontWeight: '600' }}>{notif.details.studentName || '–'}</Text>
                {'  Roll: #'}{notif.details.rollNumber || '–'}
              </Text>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                {'Changed: '}
                <Text style={{ color: C.coral, fontWeight: '600' }}>{notif.details.oldStatus}</Text>
                {' → '}
                <Text style={{ color: '#34D399', fontWeight: '600' }}>{notif.details.newStatus}</Text>
              </Text>
              {notif.details.reason && (
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 3, fontStyle: 'italic' }}>
                  {'Reason: '}{notif.details.reason}
                </Text>
              )}
            </View>
          )}
          {notif.details && isMarksEdited && (
            <View style={{ backgroundColor: C.navyMid, borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {'Student: '}<Text style={{ color: C.white, fontWeight: '600' }}>{notif.details.studentName || '–'}</Text>
                {'  Subject: '}<Text style={{ color: C.white, fontWeight: '600' }}>{notif.details.subject || '–'}</Text>
              </Text>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                {'Marks: '}
                <Text style={{ color: C.coral, fontWeight: '600' }}>{notif.details.oldMarks ?? '–'}</Text>
                {' → '}
                <Text style={{ color: '#34D399', fontWeight: '600' }}>{notif.details.newMarks}/{notif.details.maxMarks || 20}</Text>
                {'  Exam: '}<Text style={{ color: C.gold, fontWeight: '600' }}>{notif.details.examType || '–'}</Text>
              </Text>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                {'Teacher: '}<Text style={{ color: C.white, fontWeight: '600' }}>{notif.details.editedBy || '–'}</Text>
              </Text>
              {notif.details.reason && (
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 3, fontStyle: 'italic' }}>
                  {'Reason: '}{notif.details.reason}
                </Text>
              )}
            </View>
          )}
          {notif.details && isSubmitted && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {'P: '}<Text style={{ color: '#34D399', fontWeight: '700' }}>{notif.details.presentCount}</Text>
                {'  A: '}<Text style={{ color: C.coral, fontWeight: '700' }}>{notif.details.absentCount}</Text>
                {'  T: '}{notif.details.totalCount}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: C.muted, fontSize: 11 }}>{formatDateTime(notif.createdAt)} {'('}{timeAgo(notif.createdAt)}{')'}</Text>
            {!notif.read && (
              <TouchableOpacity onPress={() => onMarkRead(notif.id)} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: '600' }}>Mark Read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AdminAlerts({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/admin/notifications?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (e) {
      setError('Could not load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id) => {
    try {
      await apiFetch('/admin/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Mark read error:', e.message);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiFetch('/admin/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ ids: [] }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Mark all read error:', e.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'edited') return n.type === 'attendance_edited';
    if (filter === 'submitted') return n.type === 'attendance_submitted';
    if (filter === 'marks_edited') return n.type === 'marks_edited';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const editedCount = notifications.filter(n => n.type === 'attendance_edited' && !n.read).length;
  const marksEditedCount = notifications.filter(n => n.type === 'marks_edited').length;

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Notifications</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            {editedCount > 0 ? ` · ${editedCount} edit${editedCount > 1 ? 's' : ''} need review` : ''}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}>
            {markingAll ? <ActivityIndicator size="small" color={C.muted} /> : <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>Mark all read</Text>}
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'marks_edited', label: 'Marks Edited', count: marksEditedCount },
          { key: 'edited', label: 'Att. Edited', count: notifications.filter(n => n.type === 'attendance_edited').length },
          { key: 'submitted', label: 'Submitted', count: notifications.filter(n => n.type === 'attendance_submitted').length },
        ].map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: filter === f.key ? C.teal : C.card, borderWidth: 1, borderColor: filter === f.key ? C.teal : C.border }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.key ? C.navy : C.muted }}>
              {f.label}{f.count > 0 ? ` (${f.count})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {editedCount > 0 && (
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FB923C15', borderWidth: 1, borderColor: '#FB923C44', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>{'⚠️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FB923C', fontWeight: '700', fontSize: 13 }}>
              {editedCount} Attendance Edit{editedCount > 1 ? 's' : ''} Require Review
            </Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Teacher-edited attendance records are flagged for review.</Text>
          </View>
        </View>
      )}

      {marksEditedCount > 0 && (
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: C.gold + '15', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>{'✏️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.gold, fontWeight: '700', fontSize: 13 }}>
              {marksEditedCount} Marks Edit{marksEditedCount > 1 ? 's' : ''} Logged
            </Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Teacher-edited marks with reasons are tracked for audit.</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(false); }} tintColor={C.teal} />}
      >
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={{ color: C.muted, marginTop: 12, fontSize: 13 }}>Loading notifications...</Text>
          </View>
        ) : error ? (
          <View style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '55', borderRadius: 16, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>{'⚠️'}</Text>
            <Text style={{ color: C.coral, fontWeight: '700', marginBottom: 8 }}>Could not load notifications</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</Text>
            <TouchableOpacity onPress={() => fetchNotifications()} style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: C.teal }}>
              <Text style={{ color: C.navy, fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>{'🔔'}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.white, textAlign: 'center', marginBottom: 8 }}>
              {filter === 'all' ? 'No Notifications Yet' : 'Nothing here'}
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 }}>
              {filter === 'all' ? 'Notifications will appear here when teachers submit or edit attendance.' : 'Try a different filter.'}
            </Text>
          </View>
        ) : (
          filtered.map(n => (
            <NotifCard key={n.id} notif={n} onMarkRead={handleMarkRead} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

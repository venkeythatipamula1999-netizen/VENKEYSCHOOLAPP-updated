import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import { getFriendlyError } from '../../utils/errorMessages';
import LoadingSpinner from '../../components/LoadingSpinner';

const typeColors = {
  Academic: '#60A5FA', Cultural: '#A78BFA', Holiday: '#34D399',
  Sports: '#FF6B6B', Meeting: '#E8A21A', Other: '#6B7280',
  Arts: '#7C5CBF', Tech: '#00B8A9', Community: '#FB923C',
};
const typeIcons = {
  Academic: '\uD83D\uDCDA', Cultural: '\uD83C\uDFAD', Holiday: '\uD83C\uDF34',
  Sports: '\uD83C\uDFC6', Meeting: '\uD83E\uDD1D', Other: '\uD83D\uDCCC',
  Arts: '\uD83C\uDFA8', Tech: '\uD83D\uDCBB', Community: '\uD83C\uDF0D',
};
const TYPE_LIST = ['Academic', 'Cultural', 'Holiday', 'Sports', 'Meeting', 'Other'];
const ALL_TYPE_FILTERS = ['All', ...TYPE_LIST];

const CLASS_ACTIVITIES = {};

const SCHOOL_ACHIEVEMENTS = [];

const ADS_DATA = [];

const EMPTY_FORM = { title: '', date: '', time: '', venue: '', type: 'Academic', forClasses: 'All Classes', description: '' };

export default function AdminActivities({ onBack, currentUser }) {
  const [tab, setTab] = useState('events');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [eventFilter, setEventFilter] = useState('All');

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [deleting, setDeleting] = useState(false);
  const [renotifying, setRenotifying] = useState(false);

  const adminName = currentUser?.full_name || 'Admin';

  const CLASS_LIST_NAMES = Object.keys(CLASS_ACTIVITIES);

  const showToast = (msg, type = 'success') => setToast({ visible: true, message: msg, type });

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await apiFetch('/events');
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch (e) {
      console.error('Load events error:', e.message);
    }
    setEventsLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const openNewForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setTypePickerOpen(false);
    setClassPickerOpen(false);
  };

  const openEditForm = (ev) => {
    setForm({
      title: ev.title || '',
      date: ev.date || '',
      time: ev.time || '',
      venue: ev.venue || '',
      type: ev.type || 'Academic',
      forClasses: ev.forClasses || 'All Classes',
      description: ev.description || '',
    });
    setEditingId(ev.id);
    setShowForm(true);
    setSelectedEvent(null);
    setTypePickerOpen(false);
    setClassPickerOpen(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Event title is required.', 'error'); return; }
    if (!form.date.trim()) { showToast('Event date is required.', 'error'); return; }
    setSaving(true);
    try {
      const url = editingId ? `/events/${editingId}` : '/events/create';
      const method = editingId ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...form, createdBy: adminName, updatedBy: adminName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      const notified = data.notified || {};
      const teacherCount = notified.teacherCount || 0;
      const parentMsg = notified.parentCount === -1 ? 'all parents' : `${notified.parentCount || 0} parents`;
      showToast(`Event ${editingId ? 'updated' : 'saved'}! Notifications sent to ${teacherCount} teachers & ${parentMsg}.`);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      loadEvents();
    } catch (e) {
      showToast(getFriendlyError(e, 'Failed to save event.'), 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`Delete event "${ev.title}"? All recipients will be notified of cancellation.`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/events/${ev.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      showToast(`Event "${ev.title}" deleted. Cancellation notifications sent.`);
      setSelectedEvent(null);
      loadEvents();
    } catch (e) {
      showToast(getFriendlyError(e, 'Failed to delete event.'), 'error');
    }
    setDeleting(false);
  };

  const handleRenotify = async (ev) => {
    setRenotifying(true);
    try {
      const res = await apiFetch(`/events/${ev.id}/renotify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Renotify failed');
      showToast(`Reminder notifications sent for "${ev.title}".`);
    } catch (e) {
      showToast(getFriendlyError(e, 'Failed to renotify.'), 'error');
    }
    setRenotifying(false);
  };

  const upcomingEvents = events.filter(e => e.status !== 'Done');
  const completedEvents = events.filter(e => e.status === 'Done');
  const filteredEvents = eventFilter === 'All' ? events : events.filter(e => e.type === eventFilter);

  if (selectedEvent) {
    const e = selectedEvent;
    const col = typeColors[e.type] || C.teal;
    const icon = typeIcons[e.type] || '\uD83D\uDCC5';
    return (
      <ScrollView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => setSelectedEvent(null)} style={st.backBtn}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Event Details</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{e.status}</Text>
          </View>
        </View>
        <Toast {...toast} onHide={() => setToast(t => ({...t, visible: false}))} />
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <LinearGradient colors={[col + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: col + '44', borderRadius: 24, padding: 24, marginBottom: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>{icon}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: C.white, marginBottom: 8, lineHeight: 26, textAlign: 'center' }}>{e.title}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View style={{ paddingVertical: 3, paddingHorizontal: 12, borderRadius: 20, backgroundColor: col + '22', borderWidth: 1, borderColor: col + '44' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: col }}>{e.type}</Text>
              </View>
              <View style={{ paddingVertical: 3, paddingHorizontal: 12, borderRadius: 20, backgroundColor: (e.status === 'Upcoming' ? '#22d38a' : C.muted) + '22' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: e.status === 'Upcoming' ? '#22d38a' : C.muted }}>{e.status}</Text>
              </View>
            </View>
          </LinearGradient>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {[
              { ic: '\uD83D\uDCC5', lbl: 'Date', val: e.date },
              { ic: '\uD83D\uDD50', lbl: 'Time', val: e.time || '\u2014' },
              { ic: '\uD83D\uDCCD', lbl: 'Venue', val: e.venue || '\u2014' },
              { ic: '\uD83C\uDFEB', lbl: 'Classes', val: e.forClasses || 'All Classes' },
            ].map((info, i) => (
              <View key={i} style={{ width: '48%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 }}>
                <Text style={{ fontSize: 18, marginBottom: 4 }}>{info.ic}</Text>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{info.lbl}</Text>
                <Text style={{ fontWeight: '600', fontSize: 12, color: C.white, lineHeight: 16 }}>{info.val}</Text>
              </View>
            ))}
          </View>
          {e.description ? (
            <View style={[st.card, { marginBottom: 16 }]}>
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.white, marginBottom: 8 }}>About This Event</Text>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 22 }}>{e.description}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={() => handleRenotify(e)}
              disabled={renotifying}
              style={{ flex: 1, minWidth: '45%', backgroundColor: col + '22', borderWidth: 1, borderColor: col + '44', borderRadius: 14, padding: 13, alignItems: 'center', opacity: renotifying ? 0.6 : 1 }}
            >
              {renotifying ? <ActivityIndicator size="small" color={col} /> : <Text style={{ color: col, fontSize: 13, fontWeight: '800' }}>{'\uD83D\uDCE2'} Re-notify</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openEditForm(e)}
              style={{ flex: 1, minWidth: '45%', backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 13, alignItems: 'center' }}
            >
              <Text style={{ color: C.white, fontSize: 13, fontWeight: '700' }}>{'\u270F\uFE0F'} Edit Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(e)}
              disabled={deleting}
              style={{ flex: 1, minWidth: '90%', backgroundColor: C.coral + '15', borderWidth: 1, borderColor: C.coral + '33', borderRadius: 14, padding: 13, alignItems: 'center', opacity: deleting ? 0.6 : 1, marginTop: 0 }}
            >
              {deleting ? <ActivityIndicator size="small" color={C.coral} /> : <Text style={{ color: C.coral, fontSize: 13, fontWeight: '700' }}>{'\uD83D\uDDD1\uFE0F'} Delete Event</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (selectedActivity) {
    const a = selectedActivity;
    return (
      <ScrollView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => setSelectedActivity(null)} style={st.backBtn}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
          <View>
            <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Activity Detail</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{selectedClass}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <LinearGradient colors={[a.color + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: a.color + '44', borderRadius: 24, padding: 24, marginBottom: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 52, marginBottom: 10 }}>{a.icon}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.white, textAlign: 'center', lineHeight: 24, marginBottom: 6 }}>{a.title}</Text>
            <Text style={{ color: a.color, fontWeight: '700', fontSize: 14 }}>{a.result}</Text>
          </LinearGradient>
          {[
            { ic: '\uD83D\uDCC5', lbl: 'Date', val: a.date },
            { ic: '\uD83C\uDFEB', lbl: 'Class', val: selectedClass },
            { ic: '\uD83C\uDFAF', lbl: 'Type', val: a.type },
            { ic: '\uD83D\uDC65', lbl: 'Students', val: a.students },
          ].map((info, i) => (
            <View key={i} style={[st.card, { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Text style={{ fontSize: 22 }}>{info.ic}</Text>
              <View>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{info.lbl}</Text>
                <Text style={{ fontWeight: '600', color: C.white }}>{info.val}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (selectedClass && !selectedActivity) {
    const acts = CLASS_ACTIVITIES[selectedClass] || [];
    return (
      <ScrollView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => setSelectedClass(null)} style={st.backBtn}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
          <View>
            <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Class Activities</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{selectedClass}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <LinearGradient colors={[C.gold + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.gold + '44', borderRadius: 22, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.white, marginBottom: 4 }}>{selectedClass}</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>{acts.length} activities recorded this year</Text>
          </LinearGradient>
          {acts.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 38, marginBottom: 12 }}>🏅</Text>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 6 }}>No activities yet</Text>
              <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>Tap + to create the first activity for this class.</Text>
            </View>
          ) : acts.map(a => (
            <TouchableOpacity key={a.id} onPress={() => setSelectedActivity(a)} style={[st.cardLg, { marginBottom: 12, borderLeftWidth: 3, borderLeftColor: a.color }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ fontSize: 26 }}>{a.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: C.white, lineHeight: 18, marginBottom: 4 }}>{a.title}</Text>
                  <Text style={{ fontSize: 11, color: a.color, fontWeight: '600', marginBottom: 2 }}>{a.result}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>{a.date} {'·'} {a.type}</Text>
                </View>
                <Icon name="arrow" size={15} color={C.muted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Activities & Events</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>School Events · Class Activities · Awards</Text>
        </View>
      </View>

      <Toast {...toast} onHide={() => setToast(t => ({...t, visible: false}))} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, marginBottom: 16 }}>
        {[['events', '\uD83D\uDCC5 Events'], ['classwise', '\uD83C\uDFEB Class-wise'], ['achievements', '\uD83C\uDFC6 Awards'], ['ads', '\uD83D\uDCE2 Notices']].map(([id, lbl]) => (
          <TouchableOpacity key={id} onPress={() => setTab(id)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: tab === id ? C.gold : C.navyMid }}>
            <Text style={{ fontWeight: '600', fontSize: 11, color: tab === id ? C.navy : C.muted }}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>

        {tab === 'events' && (
          <View>
            {eventsLoading ? (
              <LoadingSpinner message="Loading events..." />
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {[
                    { val: upcomingEvents.length, lbl: 'Upcoming', color: '#22d38a' },
                    { val: completedEvents.length, lbl: 'Done', color: C.muted },
                    { val: events.length, lbl: 'Total', color: C.teal },
                  ].map(s => (
                    <View key={s.lbl} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, alignItems: 'center' }}>
                      <Text style={{ fontWeight: '700', fontSize: 22, color: s.color }}>{s.val}</Text>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.lbl}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {ALL_TYPE_FILTERS.map(t => (
                    <TouchableOpacity key={t} onPress={() => setEventFilter(t)} style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, backgroundColor: eventFilter === t ? (typeColors[t] || C.gold) : C.navyMid }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: eventFilter === t ? (t === 'All' ? C.navy : C.white) : C.muted }}>
                        {t === 'All' ? 'All Types' : (typeIcons[t] || '') + ' ' + t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {filteredEvents.filter(e => e.status !== 'Done').length > 0 && (
                  <>
                    <View style={st.secHead}><Text style={st.secTitle}>Upcoming Events</Text></View>
                    {filteredEvents.filter(e => e.status !== 'Done').map(e => (
                      <EventCard key={e.id} e={e} onPress={() => setSelectedEvent(e)} />
                    ))}
                  </>
                )}

                {filteredEvents.filter(e => e.status === 'Done').length > 0 && (
                  <>
                    <View style={[st.secHead, { marginTop: 8 }]}><Text style={st.secTitle}>Past Events</Text></View>
                    {filteredEvents.filter(e => e.status === 'Done').map(e => (
                      <TouchableOpacity key={e.id} onPress={() => setSelectedEvent(e)} style={[st.card, { marginBottom: 10, opacity: 0.75 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Text style={{ fontSize: 22 }}>{typeIcons[e.type] || '\uD83D\uDCC5'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '700', fontSize: 13, color: C.muted }}>{e.title}</Text>
                            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{'\uD83D\uDCC5'} {e.date}{e.type ? ' \u00B7 ' + e.type : ''}</Text>
                          </View>
                          <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20, backgroundColor: C.muted + '22' }}>
                            <Text style={{ fontSize: 10, color: C.muted }}>Done</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {events.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <Text style={{ fontSize: 28, marginBottom: 10 }}>{'\uD83D\uDCC5'}</Text>
                    <Text style={{ color: C.muted, fontSize: 14 }}>No events yet. Create your first event below.</Text>
                  </View>
                )}

                {showForm ? (
                  <View style={[st.card, { marginTop: 12 }]}>
                    <Text style={{ fontWeight: '700', color: C.white, fontSize: 15, marginBottom: 14 }}>
                      {editingId ? '\u270F\uFE0F Edit Event' : '\u2795 Add New Event'}
                    </Text>

                    {[
                      { label: 'Event Title *', key: 'title', ph: 'e.g. School Cultural Fest' },
                      { label: 'Date * (YYYY-MM-DD)', key: 'date', ph: 'e.g. 2026-03-10' },
                      { label: 'Time', key: 'time', ph: 'e.g. 9:00 AM' },
                      { label: 'Venue', key: 'venue', ph: 'e.g. School Auditorium' },
                    ].map(({ label, key, ph }) => (
                      <View key={key} style={{ marginBottom: 10 }}>
                        <Text style={st.label}>{label}</Text>
                        <TextInput
                          style={st.input}
                          placeholder={ph}
                          placeholderTextColor={C.muted}
                          value={form[key]}
                          onChangeText={v => setForm(p => ({ ...p, [key]: v }))}
                        />
                      </View>
                    ))}

                    <View style={{ marginBottom: 10 }}>
                      <Text style={st.label}>Event Type</Text>
                      <TouchableOpacity onPress={() => setTypePickerOpen(o => !o)} style={[st.input, { justifyContent: 'center' }]}>
                        <Text style={{ color: C.white, fontSize: 15 }}>{typeIcons[form.type] || ''} {form.type}</Text>
                      </TouchableOpacity>
                      {typePickerOpen && (
                        <View style={{ backgroundColor: C.navyMid, borderRadius: 10, marginTop: 4, borderWidth: 1, borderColor: C.border }}>
                          {TYPE_LIST.map(t => (
                            <TouchableOpacity key={t} onPress={() => { setForm(p => ({ ...p, type: t })); setTypePickerOpen(false); }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 16 }}>{typeIcons[t]}</Text>
                              <Text style={{ color: form.type === t ? typeColors[t] || C.gold : C.white, fontSize: 14, fontWeight: form.type === t ? '700' : '400' }}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={{ marginBottom: 10 }}>
                      <Text style={st.label}>For Classes</Text>
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <TouchableOpacity
                          onPress={() => setForm(p => ({ ...p, forClasses: 'All Classes' }))}
                          style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: form.forClasses === 'All Classes' ? C.teal : C.navyMid, borderWidth: 1, borderColor: form.forClasses === 'All Classes' ? C.teal : C.border }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: form.forClasses === 'All Classes' ? C.navy : C.muted }}>All Classes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setClassPickerOpen(o => !o)}
                          style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: form.forClasses !== 'All Classes' ? C.gold + '33' : C.navyMid, borderWidth: 1, borderColor: form.forClasses !== 'All Classes' ? C.gold : C.border }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: form.forClasses !== 'All Classes' ? C.gold : C.muted }}>Specific Class...</Text>
                        </TouchableOpacity>
                      </View>
                      {classPickerOpen && (
                        <View style={{ backgroundColor: C.navyMid, borderRadius: 10, borderWidth: 1, borderColor: C.border }}>
                          {CLASS_LIST_NAMES.map(cls => (
                            <TouchableOpacity
                              key={cls}
                              onPress={() => { setForm(p => ({ ...p, forClasses: cls })); setClassPickerOpen(false); }}
                              style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border }}
                            >
                              <Text style={{ color: form.forClasses === cls ? C.gold : C.white, fontSize: 14, fontWeight: form.forClasses === cls ? '700' : '400' }}>{cls}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {form.forClasses !== 'All Classes' && (
                        <Text style={{ color: C.teal, fontSize: 12, marginTop: 6 }}>{'\uD83C\uDFEB'} Targeting: {form.forClasses}</Text>
                      )}
                    </View>

                    <View style={{ marginBottom: 14 }}>
                      <Text style={st.label}>Description</Text>
                      <TextInput
                        style={[st.input, { height: 70, textAlignVertical: 'top', paddingTop: 12 }]}
                        multiline
                        placeholder="Brief description of the event..."
                        placeholderTextColor={C.muted}
                        value={form.description}
                        onChangeText={v => setForm(p => ({ ...p, description: v }))}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                        style={{ flex: 1, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center' }}
                      >
                        <Text style={{ color: C.muted, fontWeight: '700' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        style={{ flex: 2, backgroundColor: C.teal, borderRadius: 12, padding: 12, alignItems: 'center', opacity: saving ? 0.7 : 1 }}
                      >
                        {saving
                          ? <ActivityIndicator size="small" color={C.navy} />
                          : <Text style={{ color: C.navy, fontWeight: '700' }}>{editingId ? 'Update & Notify' : 'Save & Notify'}</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={openNewForm} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.teal, borderRadius: 14, paddingVertical: 14, marginTop: 12 }}>
                    <Text style={{ color: C.navy, fontWeight: '600', fontSize: 15 }}>{'\uD83D\uDCC5'} + Add New Event</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {tab === 'classwise' && (
          <View>
            <View style={{ backgroundColor: C.navyMid, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>{'\uD83C\uDFEB'}</Text>
              <Text style={{ color: C.muted, fontSize: 12, flex: 1 }}>Tap any class to view all activities, achievements and participating students</Text>
            </View>
            {Object.keys(CLASS_ACTIVITIES).map(clsName => {
              const acts = CLASS_ACTIVITIES[clsName] || [];
              const gold = acts.filter(a => a.result.includes('1st') || a.result.includes('Best')).length;
              const topAct = acts[0];
              return (
                <TouchableOpacity key={clsName} onPress={() => setSelectedClass(clsName)} style={[st.card, { marginBottom: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <LinearGradient colors={[C.gold + '44', C.gold + '22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.gold + '33' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: C.gold, textAlign: 'center', lineHeight: 14 }}>{clsName.replace('Grade ', '')}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', fontSize: 15, color: C.white }}>{clsName}</Text>
                        <Icon name="arrow" size={15} color={C.muted} />
                      </View>
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{'\uD83C\uDFAF'} {acts.length} activities {'·'} {'\uD83E\uDD47'} {gold} top finishes</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: topAct ? 10 : 0 }}>
                    {[...new Set(acts.map(a => a.type))].map(t => (
                      <View key={t} style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8, backgroundColor: (typeColors[t] || C.teal) + '22' }}>
                        <Text style={{ fontSize: 9, fontWeight: '600', color: typeColors[t] || C.teal }}>{typeIcons[t] || '\uD83C\uDFAF'} {t}</Text>
                      </View>
                    ))}
                  </View>
                  {topAct && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: C.navyMid, borderRadius: 10 }}>
                      <Text style={{ fontSize: 18 }}>{topAct.icon}</Text>
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: C.white }}>{topAct.title}</Text>
                        <Text style={{ fontSize: 10, color: topAct.color, marginTop: 1 }}>{topAct.result}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {tab === 'achievements' && (
          <View>
            <LinearGradient colors={[C.gold + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.gold + '44', borderRadius: 22, padding: 20, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {[
                  { val: SCHOOL_ACHIEVEMENTS.length, lbl: 'Awards', icon: '\uD83C\uDFC6', color: C.gold },
                  { val: SCHOOL_ACHIEVEMENTS.filter(a => a.level === 'District').length, lbl: 'District', icon: '\uD83D\uDCCD', color: C.teal },
                  { val: SCHOOL_ACHIEVEMENTS.filter(a => a.level === 'State' || a.level === 'National').length, lbl: 'State/Natl', icon: '\u2B50', color: C.purple },
                ].map((s, i) => (
                  <View key={i} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, marginBottom: 2 }}>{s.icon}</Text>
                    <Text style={{ fontWeight: '800', fontSize: 26, color: s.color, lineHeight: 28 }}>{s.val}</Text>
                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{s.lbl}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
            <View style={st.secHead}><Text style={st.secTitle}>School Awards & Recognitions</Text></View>
            {SCHOOL_ACHIEVEMENTS.length === 0 ? (
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83C\uDFC6'}</Text>
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No achievements recorded yet</Text>
              </View>
            ) : SCHOOL_ACHIEVEMENTS.map(a => (
              <View key={a.id} style={[st.cardLg, { marginBottom: 12, borderLeftWidth: 3, borderLeftColor: a.color }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ fontSize: 28 }}>{a.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: C.white, lineHeight: 18, marginBottom: 4 }}>{a.title}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>{'\uD83D\uDCC5'} {a.date}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      <View style={{ paddingVertical: 2, paddingHorizontal: 9, borderRadius: 20, backgroundColor: a.color + '22', borderWidth: 1, borderColor: a.color + '44' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: a.color }}>{a.level}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: C.muted }}>by {a.awardedBy}</Text>
                    </View>
                  </View>
                </View>
                <Text style={{ color: C.muted, fontSize: 12, lineHeight: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>{a.desc}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'ads' && (
          <View>
            <View style={st.secHead}><Text style={st.secTitle}>Active Notices & Ads</Text></View>
            {ADS_DATA.length === 0 ? (
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83D\uDCE2'}</Text>
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>No notices or ads posted yet</Text>
              </View>
            ) : null}
            {ADS_DATA.map(ad => (
              <View key={ad.id} style={[st.card, { marginBottom: 12, borderLeftWidth: 3, borderLeftColor: ad.color }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: ad.color + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ fontSize: 22 }}>{ad.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: C.white, flex: 1, lineHeight: 17, paddingRight: 8 }}>{ad.title}</Text>
                      {ad.pinned && <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 20, backgroundColor: C.gold + '22' }}><Text style={{ fontSize: 9, fontWeight: '700', color: C.gold }}>{'\uD83D\uDCCC'} Pinned</Text></View>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: ad.color + '22' }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: ad.color }}>{ad.type}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: C.muted }}>{'\u2192'} {ad.to}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: C.muted }}>Posted {ad.posted} {'·'} Expires {ad.expiry}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#cde', lineHeight: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>{ad.body}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function EventCard({ e, onPress }) {
  const col = typeColors[e.type] || C.teal;
  const icon = typeIcons[e.type] || '\uD83D\uDCC5';
  return (
    <TouchableOpacity onPress={onPress} style={[st.card, { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: col }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: col + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Text style={{ fontSize: 26 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: C.white, flex: 1, paddingRight: 8, lineHeight: 18 }}>{e.title}</Text>
            <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20, backgroundColor: '#22d38a22', borderWidth: 1, borderColor: '#22d38a44', flexShrink: 0 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#22d38a' }}>Upcoming</Text>
            </View>
          </View>
          <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{'\uD83D\uDCC5'} {e.date}{e.time ? ' \u00B7 \uD83D\uDD50 ' + e.time : ''}</Text>
          {e.venue ? <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{'\uD83D\uDCCD'} {e.venue}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8, backgroundColor: col + '22' }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: col }}>{e.type}</Text>
          </View>
          <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8, backgroundColor: C.navyMid }}>
            <Text style={{ fontSize: 10, color: C.muted }}>{'\uD83C\uDFEB'} {e.forClasses || 'All Classes'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  cardLg: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontSize: 16, fontWeight: '600', color: C.white },
  input: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 15, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 6 },
});

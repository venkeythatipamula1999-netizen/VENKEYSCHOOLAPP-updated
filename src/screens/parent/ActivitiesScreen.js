import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, BackHandler } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

export default function ActivitiesScreen({ onBack }) {
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { 
      onBack(); 
      return true; 
    });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    apiFetch('/events')
      .then(data => {
        const mapped = (data.events || data || []).map(e => ({
          title: e.title || e.name || 'Untitled',
          type: e.type || e.category || 'event',
          date: e.date || e.eventDate || '',
          time: e.time || '',
          color: e.type === 'academic' ? C.teal : e.type === 'sports' ? C.coral : C.gold,
          icon: e.type === 'academic' ? '📚' : e.type === 'sports' ? '🏆' : '🎭',
          desc: e.description || e.desc || '',
        }));
        setActivities(mapped);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  const filters = ['all', 'event', 'academic', 'sports'];
  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Activities</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Upcoming events & activities</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {loading && (
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>Loading activities...</Text>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {filters.map(f => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: filter === f ? C.gold : C.navyMid }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f ? C.navy : C.muted, textTransform: 'capitalize' }}>{f === 'all' ? `All (${activities.length})` : f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filtered.map((a, i) => (
          <View key={i} style={[st.card, { marginBottom: 12, borderLeftWidth: 3, borderLeftColor: a.color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{a.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 3 }}>{a.title}</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{a.desc}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 11, color: a.color, fontWeight: '600' }}>{a.date}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>{a.time}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {!loading && filtered.length === 0 && (
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>No activities found</Text>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16 },
});

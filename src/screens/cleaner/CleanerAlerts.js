import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, BackHandler, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

export default function CleanerAlerts({ onBack }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    apiFetch('/staff/notifications')
      .then(r => r.json())
      .then(data => setNotifs(data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Alerts</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{unread} unread</Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={() => setNotifs(p => p.map(n => ({ ...n, read: true })))}>
            <Text style={{ color: C.gold, fontSize: 12, fontWeight: '600' }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator color={C.teal} style={{ marginTop: 40 }} />}

      {!loading && notifs.length === 0 && (
        <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>No alerts yet</Text>
      )}

      {!loading && notifs.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          {notifs.filter(n => n.type === 'absent').length > 0 && (
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Icon name="alert" size={14} color={C.coral} />
                <Text style={{ color: C.coral, fontWeight: '700', fontSize: 13 }}>Absence Alerts</Text>
              </View>
              {notifs.filter(n => n.type === 'absent').map(n => (
                <TouchableOpacity key={n.id} onPress={() => setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))} style={{ backgroundColor: 'rgba(255,107,107,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,107,107,0.35)', borderRadius: 16, padding: 14, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,107,107,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{n.icon || '🔔'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: C.coral }}>{n.title}</Text>
                      <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{n.body}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: C.muted, fontSize: 11 }}>{n.time}</Text>
                      {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.coral, marginTop: 4 }} />}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={{ color: C.muted, fontWeight: '600', fontSize: 13, marginBottom: 10 }}>All Notifications</Text>
          {notifs.filter(n => n.type !== 'absent').map(n => (
            <TouchableOpacity key={n.id} onPress={() => setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: n.read ? C.navyMid : C.card, borderWidth: 1, borderColor: n.read ? C.border : (n.color || C.teal) + '44', borderRadius: 16, padding: 14, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: (n.color || C.teal) + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{n.icon || '🔔'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: n.read ? '500' : '700', fontSize: 14, color: C.white }}>{n.title}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{n.body}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{n.time}</Text>
              </View>
              {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.color || C.teal, marginTop: 6 }} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

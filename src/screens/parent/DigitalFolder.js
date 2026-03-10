import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Linking, StyleSheet } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

export default function DigitalFolder({ onBack, currentUser }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const studentId = 'student-101';

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/student-files?studentId=${encodeURIComponent(studentId)}`);
      const data = await res.json();
      if (data.files) setFiles(data.files);
    } catch (e) { console.error('Fetch files error:', e); }
    setLoading(false);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch(`/parent-notifications?studentId=${encodeURIComponent(studentId)}`);
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        if (data.notifications.length > 0) {
          const ids = data.notifications.map(n => n.id);
          apiFetch('/parent-notifications/read', {
            method: 'POST',
            body: JSON.stringify({ notificationIds: ids }),
          }).catch(() => {});
        }
      }
    } catch (e) { console.error('Fetch notifications error:', e); }
  }, []);

  useEffect(() => { fetchFiles(); fetchNotifications(); }, []);

  const getFileIcon = (type) => {
    if (!type) return { emoji: '\uD83D\uDCC4', color: '#60A5FA' };
    if (type.includes('pdf')) return { emoji: 'PDF', color: C.coral };
    if (type.includes('image')) return { emoji: '\uD83D\uDCF7', color: C.teal };
    if (type.includes('video')) return { emoji: '\u25B6', color: C.purple };
    return { emoji: '\uD83D\uDCC4', color: '#60A5FA' };
  };

  const openFile = (url) => {
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Digital Folder</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Documents shared by teachers</Text>
        </View>
        {notifications.length > 0 && (
          <View style={{ backgroundColor: C.coral, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, minWidth: 24, alignItems: 'center' }}>
            <Text style={{ color: C.white, fontSize: 11, fontWeight: '700' }}>{notifications.length}</Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {loading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={{ color: C.muted, marginTop: 12, fontSize: 13 }}>Loading files...</Text>
          </View>
        ) : files.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>{'\uD83D\uDCC2'}</Text>
            <Text style={{ fontWeight: '700', fontSize: 16, color: C.white, marginBottom: 6 }}>No Files Yet</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>Documents uploaded by teachers will appear here</Text>
          </View>
        ) : (
          <>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>{files.length} document{files.length !== 1 ? 's' : ''} available</Text>
            {files.map((f) => {
              const icon = getFileIcon(f.fileType);
              const dateStr = f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
              const sizeStr = f.fileSize ? (f.fileSize < 1024 * 1024 ? Math.round(f.fileSize / 1024) + ' KB' : (f.fileSize / (1024 * 1024)).toFixed(1) + ' MB') : '';
              return (
                <View key={f.id} style={st.fileCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[st.fileIcon, { backgroundColor: icon.color + '22', borderColor: icon.color + '44' }]}>
                      <Text style={{ fontSize: icon.emoji.length > 2 ? 12 : 20, fontWeight: '800', color: icon.color }}>{icon.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', fontSize: 14, color: C.white }} numberOfLines={1}>{f.fileName}</Text>
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{dateStr}{sizeStr ? ` · ${sizeStr}` : ''}</Text>
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>Shared by {f.uploadedBy || 'Teacher'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => openFile(f.fileUrl)} style={st.downloadBtn}>
                    <Text style={{ color: C.navy, fontWeight: '700', fontSize: 13 }}>Download</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  fileCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, marginBottom: 10 },
  fileIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  downloadBtn: { backgroundColor: C.teal, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
});

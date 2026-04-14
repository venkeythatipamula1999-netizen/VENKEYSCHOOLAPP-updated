import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { C } from '../../theme/colors';
import { apiFetch } from '../../api/client';
import { getFriendlyError } from '../../utils/errorMessages';

const FILE_TYPES = [
  { label: 'Document', icon: '📄', types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'], ext: 'PDF, DOC, DOCX, TXT' },
  { label: 'Photo',    icon: '🖼',  types: ['image/jpeg', 'image/png', 'image/gif'], ext: 'JPG, PNG, GIF' },
  { label: 'Audio',    icon: '🎵',  types: ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/*'], ext: 'MP3, WAV, M4A' },
  { label: 'Video',    icon: '🎬',  types: ['video/mp4', 'video/quicktime', 'video/*'], ext: 'MP4, MOV, AVI' },
];

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StepIndicator({ step }) {
  const steps = ['1. File', '2. Students', '3. Send'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>
      {steps.map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <React.Fragment key={label}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={[
                styles.stepCircle,
                active && styles.stepCircleActive,
                done && styles.stepCircleDone,
              ]}>
                {done
                  ? <Text style={{ fontSize: 12, color: C.navy, fontWeight: '700' }}>✓</Text>
                  : <Text style={{ fontSize: 12, fontWeight: '700', color: active ? C.navy : C.muted }}>{num}</Text>
                }
              </View>
              <Text style={{ fontSize: 10, marginTop: 4, color: active ? C.gold : done ? '#34D399' : C.muted, fontWeight: active ? '700' : '400' }}>{label}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={{ height: 1, flex: 0.4, backgroundColor: done ? '#34D399' : C.border, marginBottom: 14 }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function TeacherSendDocument({ currentUser, onBack, isAdmin = false }) {
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sendError, setSendError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (step !== 2) return;
    setLoadingStudents(true);
    setStudentsError('');
    apiFetch('/teacher/sendable-students')
      .then(r => r.json())
      .then(data => {
        const list = data.classes || [];
        setClasses(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedClass(first);
          setStudents(first.isAll ? [] : (first.students || []));
        }
      })
      .catch(e => setStudentsError(getFriendlyError(e, 'Failed to load students')))
      .finally(() => setLoadingStudents(false));
  }, [step]);

  const handlePickFile = async (typeObj) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: typeObj.types,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || typeObj.types[0],
          typeLabel: typeObj.label,
          typeIcon: typeObj.icon,
        });
      }
    } catch (e) {
      console.error('File pick error:', e);
    }
  };

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setCheckedIds(new Set());
    if (cls.isAll) {
      const allIds = classes
        .filter(c => !c.isAll)
        .flatMap(c => c.students || [])
        .map(s => s.id);
      setCheckedIds(new Set(allIds));
      setStudents([]);
    } else {
      setStudents(cls.students || []);
    }
  };

  const toggleStudent = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === students.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(students.map(s => s.id)));
    }
  };

  const handleSend = async () => {
    if (!selectedFile || checkedIds.size === 0) return;
    setSending(true);
    setSendError('');
    setUploadProgress(0);
    try {
      const studentIds = [...checkedIds];

      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType,
      });
      formData.append('studentId', studentIds[0]);
      formData.append('studentName', 'batch');
      formData.append('uploaderName', currentUser?.full_name || 'Teacher');
      formData.append('uploaderRole', currentUser?.role || 'teacher');

      setUploadProgress(30);
      const uploadRes = await apiFetch('/student-files/upload', {
        method: 'POST',
        body: formData,
      });
      setUploadProgress(70);
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      const sendRes = await apiFetch('/student-files/send', {
        method: 'POST',
        body: JSON.stringify({
          studentIds,
          fileUrl: uploadData.file.fileUrl,
          fileName: uploadData.file.fileName,
          fileType: uploadData.file.fileType,
          fileSize: selectedFile.size,
          message: message.trim(),
          senderName: currentUser?.full_name || 'Teacher',
          senderRole: currentUser?.role || 'teacher',
        }),
      });
      setUploadProgress(100);
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || 'Send failed');

      setSuccess({ count: sendData.sent || studentIds.length });
    } catch (e) {
      setSendError(getFriendlyError(e, 'Failed to send file'));
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedFile(null);
    setClasses([]);
    setSelectedClass(null);
    setStudents([]);
    setCheckedIds(new Set());
    setMessage('');
    setSendError('');
    setSuccess(null);
    setUploadProgress(0);
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={{ fontSize: 18, color: C.white }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send to Parents</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#34D39922', borderWidth: 2, borderColor: '#34D399', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 36 }}>✓</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.white, marginBottom: 8, textAlign: 'center' }}>
            Sent to {success.count} student{success.count !== 1 ? 's' : ''}
          </Text>
          <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 40 }}>
            Parents will see this in their Digital Folder
          </Text>
          <TouchableOpacity onPress={handleReset} style={[styles.btn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginBottom: 12 }]}>
            <Text style={{ color: C.white, fontWeight: '600', fontSize: 15 }}>Send Another</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} style={[styles.btn, { backgroundColor: C.gold }]}>
            <Text style={{ color: C.navy, fontWeight: '700', fontSize: 15 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={step === 1 ? onBack : () => setStep(s => s - 1)} style={styles.backBtn}>
          <Text style={{ fontSize: 18, color: C.white }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send to Parents</Text>
      </View>

      <StepIndicator step={step} />

      {step === 1 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {!selectedFile ? (
            <>
              <Text style={styles.sectionLabel}>Choose file type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {FILE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.label}
                    onPress={() => handlePickFile(t)}
                    style={styles.fileTypeCard}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 10 }}>{t.icon}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.white, marginBottom: 4 }}>{t.label}</Text>
                    <Text style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>{t.ext}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Selected file</Text>
              <View style={styles.filePreviewCard}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>{selectedFile.typeIcon}</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.white, marginBottom: 6, textAlign: 'center' }} numberOfLines={2}>
                  {selectedFile.name}
                </Text>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  {selectedFile.typeLabel} · {formatSize(selectedFile.size)}
                </Text>
                <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: C.teal, fontWeight: '600' }}>Change File</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setStep(2)} style={[styles.btn, { backgroundColor: C.gold, marginTop: 24 }]}>
                <Text style={{ color: C.navy, fontWeight: '700', fontSize: 15 }}>Next: Select Students →</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {step === 2 && (
        <View style={{ flex: 1 }}>
          {loadingStudents ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={C.gold} />
              <Text style={{ color: C.muted, marginTop: 12 }}>Loading students...</Text>
            </View>
          ) : studentsError ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <Text style={{ color: C.coral, textAlign: 'center' }}>{studentsError}</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.sectionLabel}>Select class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {classes.map(cls => (
                    <TouchableOpacity
                      key={cls.className}
                      onPress={() => handleClassSelect(cls)}
                      style={[styles.classChip, selectedClass?.className === cls.className && styles.classChipActive]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: selectedClass?.className === cls.className ? C.navy : C.white }}>
                        {cls.isAll ? `📢 ${cls.className}` : cls.className}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {!selectedClass?.isAll && students.length > 0 && (
                <>
                  <TouchableOpacity onPress={toggleAll} style={styles.selectAllRow}>
                    <View style={[styles.checkbox, checkedIds.size === students.length && styles.checkboxChecked]}>
                      {checkedIds.size === students.length && <Text style={{ color: C.navy, fontSize: 11, fontWeight: '700' }}>✓</Text>}
                    </View>
                    <Text style={{ color: C.white, fontSize: 13, fontWeight: '600' }}>Select All in Class</Text>
                  </TouchableOpacity>
                  {students.map(s => (
                    <TouchableOpacity key={s.id} onPress={() => toggleStudent(s.id)} style={styles.studentRow}>
                      <View style={[styles.checkbox, checkedIds.has(s.id) && styles.checkboxChecked]}>
                        {checkedIds.has(s.id) && <Text style={{ color: C.navy, fontSize: 11, fontWeight: '700' }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.white, fontSize: 13, fontWeight: '600' }}>{s.name}</Text>
                        {s.rollNumber && <Text style={{ color: C.muted, fontSize: 11 }}>Roll: {s.rollNumber}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {selectedClass?.isAll && (
                <View style={{ backgroundColor: C.gold + '18', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.gold + '44' }}>
                  <Text style={{ color: C.gold, fontWeight: '600', fontSize: 13 }}>
                    📢 All students in the school will receive this file
                  </Text>
                </View>
              )}

              <Text style={{ color: C.muted, fontSize: 12, marginTop: 12, marginBottom: 16 }}>
                {checkedIds.size} student{checkedIds.size !== 1 ? 's' : ''} selected
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setStep(1)} style={[styles.btn, { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]}>
                  <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep(3)}
                  disabled={checkedIds.size === 0}
                  style={[styles.btn, { flex: 2, backgroundColor: checkedIds.size > 0 ? C.gold : C.border }]}
                >
                  <Text style={{ color: checkedIds.size > 0 ? C.navy : C.muted, fontWeight: '700', fontSize: 14 }}>Next: Add Message →</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {step === 3 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.sectionLabel}>Review & Send</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>{selectedFile?.typeIcon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryKey}>File</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>{selectedFile?.name} ({formatSize(selectedFile?.size)})</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryKey}>Recipients</Text>
                <Text style={styles.summaryVal}>{checkedIds.size} student{checkedIds.size !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>📚</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryKey}>Class</Text>
                <Text style={styles.summaryVal}>{selectedClass?.className || '—'}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Message to parents (optional)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="e.g. Please review before tomorrow's exam"
            placeholderTextColor={C.muted}
            value={message}
            onChangeText={t => setMessage(t.slice(0, 200))}
            multiline
            numberOfLines={4}
          />
          <Text style={{ color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 4 }}>{message.length}/200</Text>

          {sendError ? (
            <View style={{ backgroundColor: C.coral + '22', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: C.coral + '55' }}>
              <Text style={{ color: C.coral, fontSize: 13 }}>{sendError}</Text>
            </View>
          ) : null}

          {sending && (
            <View style={{ marginTop: 12 }}>
              <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${uploadProgress}%`, backgroundColor: C.gold, borderRadius: 3 }} />
              </View>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 6, textAlign: 'center' }}>Uploading... {uploadProgress}%</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity onPress={() => setStep(2)} disabled={sending} style={[styles.btn, { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]}>
              <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending}
              style={[styles.btn, { flex: 2, backgroundColor: sending ? C.border : C.gold }]}
            >
              {sending
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={{ color: C.navy, fontWeight: '700', fontSize: 14 }}>📤 Send to {checkedIds.size} Students</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.navy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.white,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  fileTypeCard: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    alignItems: 'center',
  },
  filePreviewCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: 'center',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  classChipActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 4,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '88',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
  },
  checkboxChecked: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  summaryIcon: {
    fontSize: 20,
    width: 28,
  },
  summaryKey: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 14,
    color: C.white,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  messageInput: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    color: C.white,
    fontSize: 14,
    padding: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  stepCircleDone: {
    backgroundColor: '#34D399',
    borderColor: '#34D399',
  },
});

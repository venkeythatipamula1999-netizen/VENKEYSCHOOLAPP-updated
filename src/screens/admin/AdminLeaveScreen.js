import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../../api/client';

const REASON_COLORS = {
  Medical: '#F59E0B', medical: '#F59E0B',
  Family: '#FB923C', family: '#FB923C',
  Personal: '#A78BFA', personal: '#A78BFA',
  Emergency: '#EF4444', emergency: '#EF4444',
  Other: '#6B7280', other: '#6B7280',
};

function fmtDate(d) {
  if (!d) return '';
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(parts[1],10)-1]} ${parseInt(parts[2],10)}`;
}

function fmtFull(d) {
  if (!d) return '';
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}-${String(parts[1]).padStart(2,'0')}-${parts[0]}`;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function AdminLeaveScreen({ onBack, currentUser }) {
  const [tab, setTab] = useState('staff');
  const [staffRequests, setStaffRequests] = useState([]);
  const [studentRequests, setStudentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [detail, setDetail] = useState(null);
  const [filterStatus, setFilter] = useState('All');
  const [actioning, setActioning] = useState(null);
  const [actionError, setActionError] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const adminName = currentUser?.full_name || currentUser?.name || 'Admin';
  const adminId = currentUser?.role_id || currentUser?.uid || '';

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [staffRes, studentRes] = await Promise.all([
        apiFetch('/leave-requests?t=' + Date.now(), { cache: 'no-store' }),
        apiFetch('/leave-requests/students?t=' + Date.now(), { cache: 'no-store' }),
      ]);
      const staffData = await staffRes.json();
      const studentData = await studentRes.json();
      const allStaff = (staffData.requests || []).filter(r => r.type !== 'student');
      setStaffRequests(allStaff);
      setStudentRequests(studentData.requests || []);
    } catch (err) {
      setFetchError('Failed to load leave requests. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, []);

  const leaves = tab === 'staff' ? staffRequests : studentRequests;
  const sc = s => ({ Approved: '#34D399', Rejected: C.coral, Pending: C.gold })[s] || C.muted;
  const filtered = filterStatus === 'All' ? leaves : leaves.filter(l => l.status === filterStatus);
  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length;

  const act = async (id, action) => {
    setActioning(id + action);
    setActionError('');
    try {
      const res = await apiFetch('/leave-request/update-status', {
        method: 'POST',
        body: JSON.stringify({
          requestId: id,
          status: action,
          adminName,
          adminId,
          actorRole: 'Admin',
          rejectReason: rejectNote || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update');
      const update = r => r.id === id ? {
        ...r, status: action,
        approvedBy: adminName,
        approvedByRole: 'Admin',
        approvedAt: new Date().toISOString(),
        rejectReason: rejectNote || r.rejectReason,
      } : r;
      if (tab === 'staff') setStaffRequests(prev => prev.map(update));
      else setStudentRequests(prev => prev.map(update));
      if (detail?.id === id) setDetail(d => update(d));
      setRejectMode(false);
      setRejectNote('');
    } catch (err) {
      setActionError(err.message || 'Action failed. Try again.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActioning(null);
    }
  };

  if (detail) {
    const r = detail;
    const isStudent = r.type === 'student';
    const liveRequests = isStudent ? studentRequests : staffRequests;
    const liveR = liveRequests.find(x => x.id === r.id) || r;
    const currentStatus = liveR.status;
    const rColor = REASON_COLORS[r.reasonLabel] || REASON_COLORS[r.reasonId] || C.purple;

    return (
      <ScrollView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => { setDetail(null); setRejectMode(false); setRejectNote(''); }} style={st.backBtn}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 17, color: C.white }}>
              {isStudent ? 'Student Leave Request' : 'Staff Leave Request'}
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{r.id?.slice(0, 14)} {'·'} {r.submittedAt ? formatTime(r.submittedAt) : ''}</Text>
          </View>
          <View style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99, backgroundColor: sc(currentStatus) + '22', flexShrink: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: sc(currentStatus) }}>{currentStatus}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <LinearGradient
            colors={[rColor + '22', C.navyMid]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderWidth: 1, borderColor: rColor + '44', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              {isStudent ? (
                <View style={{ width: 56, height: 56, borderRadius: 17, backgroundColor: rColor + '33', borderWidth: 1.5, borderColor: rColor + '55', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontWeight: '900', fontSize: 20, color: rColor }}>{initials(r.studentName)}</Text>
                </View>
              ) : (
                <LinearGradient colors={[C.purple, C.purple + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ width: 56, height: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontSize: 22 }}>{'👩‍🏫'}</Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 17, color: C.white }}>
                  {isStudent ? r.studentName : (r.staffName || r.student)}
                </Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>
                  {isStudent
                    ? `${r.studentClass} · Roll #${r.rollNumber || '–'}`
                    : `${r.role || 'Staff'}${r.dept ? ' · ' + r.dept : ''}`}
                </Text>
              </View>
              <Text style={{ fontSize: 28 }}>{r.icon || '📅'}</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {[
                ['Leave Type', r.reasonLabel || r.type || 'Leave'],
                ['Duration', `${r.days || r.dates?.length || 1} day${(r.days || 1) > 1 ? 's' : ''}`],
                ['From', fmtDate(r.from)],
                ['To', fmtDate((r.days || 1) > 1 ? r.to : r.from)],
                ...(isStudent ? [
                  ['Student Class', r.studentClass || '–'],
                  ['Parent', r.parentName || '–'],
                ] : []),
              ].map(([l, v]) => (
                <View key={l} style={{ width: '48%', backgroundColor: C.navy + '99', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 }}>
                  <Text style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{l}</Text>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: C.white, lineHeight: 17 }}>{v}</Text>
                </View>
              ))}
            </View>

            {(r.customReason || r.detail) ? (
              <View style={{ backgroundColor: C.navy + '88', borderRadius: 12, padding: 14 }}>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Reason / Details from {isStudent ? 'Parent' : 'Staff'}</Text>
                <Text style={{ fontSize: 13, color: '#cde', lineHeight: 20, fontStyle: 'italic' }}>"{r.customReason || r.detail}"</Text>
              </View>
            ) : null}
          </LinearGradient>

          {currentStatus !== 'Pending' && (
            <View style={{ padding: 18, backgroundColor: sc(currentStatus) + '0E', borderWidth: 1, borderColor: sc(currentStatus) + '33', borderRadius: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>{currentStatus === 'Approved' ? '✅' : '❌'}</Text>
              <Text style={{ fontWeight: '800', color: sc(currentStatus), fontSize: 15, textAlign: 'center', marginBottom: 4 }}>Leave {currentStatus}</Text>
              <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
                by {liveR.approvedBy || r.approvedBy || 'Admin'}
                {(liveR.approvedByRole || r.approvedByRole) ? ` (${liveR.approvedByRole || r.approvedByRole})` : ''}
                {(liveR.approvedAt || r.approvedAt) ? '\n' + formatTime(liveR.approvedAt || r.approvedAt) : ''}
              </Text>
              {(liveR.rejectReason || r.rejectReason) && (
                <View style={{ marginTop: 10, backgroundColor: C.coral + '15', borderRadius: 10, padding: 10 }}>
                  <Text style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Rejection reason</Text>
                  <Text style={{ fontSize: 12, color: C.coral }}>{liveR.rejectReason || r.rejectReason}</Text>
                </View>
              )}
            </View>
          )}

          {actionError ? (
            <View style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '44', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: C.coral, fontSize: 13, fontWeight: '600' }}>{actionError}</Text>
            </View>
          ) : null}

          {currentStatus === 'Pending' && (
            <>
              {rejectMode && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Rejection reason (optional)</Text>
                  <TextInput
                    value={rejectNote}
                    onChangeText={setRejectNote}
                    placeholder="e.g. Insufficient notice, exam week..."
                    placeholderTextColor={C.muted}
                    multiline
                    style={{ minHeight: 80, backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.coral + '44', borderRadius: 12, padding: 12, color: C.white, fontSize: 13, textAlignVertical: 'top' }}
                  />
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => act(r.id, 'Approved')}
                  disabled={!!actioning}
                  style={{ flex: 1, backgroundColor: '#34D399', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                  {actioning === r.id + 'Approved' ? <ActivityIndicator color={C.white} /> : <Text style={{ fontWeight: '800', fontSize: 15, color: C.white }}>{'✓'} Approve</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => rejectMode ? act(r.id, 'Rejected') : setRejectMode(true)}
                  disabled={!!actioning}
                  style={{ flex: 1, backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '44', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                  {actioning === r.id + 'Rejected' ? <ActivityIndicator color={C.coral} /> : <Text style={{ fontWeight: '800', fontSize: 15, color: C.coral }}>{rejectMode ? '✗ Confirm Reject' : '✗ Reject'}</Text>}
                </TouchableOpacity>
              </View>
              {rejectMode && (
                <TouchableOpacity onPress={() => { setRejectMode(false); setRejectNote(''); }} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 17, color: C.white }}>Leave Requests</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Review and manage all leave applications</Text>
        </View>
        <TouchableOpacity onPress={fetchLeaves} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18 }}>{'🔄'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', backgroundColor: C.navyMid, borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 }}>
          {[['staff', '👩‍🏫 Staff'], ['students', '👨‍🎓 Students']].map(([k, l]) => (
            <TouchableOpacity key={k} onPress={() => { setTab(k); setFilter('All'); }}
              style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9, backgroundColor: tab === k ? C.purple : 'transparent', position: 'relative' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: tab === k ? C.white : C.muted }}>{l}</Text>
              {k === 'students' && studentRequests.filter(r => r.status === 'Pending').length > 0 && (
                <View style={{ position: 'absolute', top: 4, right: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: C.coral }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[['All', C.teal], ['Pending', C.gold], ['Approved', '#34D399'], ['Rejected', C.coral]].map(([s, c]) => (
            <TouchableOpacity key={s} onPress={() => setFilter(s)}
              style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, backgroundColor: filterStatus === s ? c + '33' : C.card, borderWidth: 1, borderColor: filterStatus === s ? c : C.border }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: filterStatus === s ? c : C.muted }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[['Pending', pendingCount, C.gold], ['Approved', approvedCount, '#34D399'], ['Rejected', rejectedCount, C.coral]].map(([l, v, c]) => (
            <View key={l} style={{ flex: 1, backgroundColor: c + '18', borderWidth: 1, borderColor: c + '44', borderRadius: 14, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 20, color: c }}>{v}</Text>
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{l}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={C.teal} size="large" />
            <Text style={{ color: C.muted, marginTop: 12, fontSize: 13 }}>Loading leave requests...</Text>
          </View>
        ) : fetchError ? (
          <View style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '44', borderRadius: 14, padding: 20, alignItems: 'center' }}>
            <Text style={{ color: C.coral, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{fetchError}</Text>
            <TouchableOpacity onPress={fetchLeaves} style={{ backgroundColor: C.coral, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20 }}>
              <Text style={{ color: C.white, fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: 10 }}>{'📅'}</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
              {leaves.length === 0
                ? `No ${tab === 'students' ? 'student' : 'staff'} leave requests yet.`
                : `No ${filterStatus.toLowerCase()} requests for ${tab}.`}
            </Text>
          </View>
        ) : (
          filtered.map(l => {
            const isStudent = l.type === 'student';
            const rColor = REASON_COLORS[l.reasonLabel] || REASON_COLORS[l.reasonId] || C.purple;
            return (
              <TouchableOpacity key={l.id} onPress={() => setDetail(l)}
                style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: sc(l.status), borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {isStudent ? (
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: rColor + '22', borderWidth: 1, borderColor: rColor + '44', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: rColor }}>{initials(l.studentName)}</Text>
                    </View>
                  ) : (
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ fontSize: 22 }}>{l.icon || '📅'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: C.white, marginBottom: 2 }}>
                      {isStudent ? l.studentName : (l.staffName || l.student)}
                    </Text>
                    {isStudent && (
                      <Text style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>
                        {l.studentClass} · Roll #{l.rollNumber || '–'} · {'👨‍👩‍👧'} {l.parentName || 'Parent'}
                      </Text>
                    )}
                    {isStudent && l.noClassTeacherAssigned && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B44', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 4, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B' }}>{'⚠'} No Class Teacher assigned for {l.studentClass}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 99, backgroundColor: rColor + '22' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: rColor }}>{l.reasonLabel || l.type || 'Leave'}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#FB923C', fontWeight: '600' }}>
                        {fmtDate(l.from)}{l.to && l.from !== l.to ? ` → ${fmtDate(l.to)}` : ''} · {l.days || l.dates?.length || 1}d
                      </Text>
                    </View>
                    {l.customReason ? (
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 4, fontStyle: 'italic' }} numberOfLines={1}>"{l.customReason}"</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: sc(l.status) + '22' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: sc(l.status) }}>{l.status}</Text>
                    </View>
                    {l.approvedBy && l.status !== 'Pending' && (
                      <Text style={{ fontSize: 10, color: C.muted, textAlign: 'right' }}>by {l.approvedBy}</Text>
                    )}
                    {l.status === 'Pending' && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={() => act(l.id, 'Approved')} disabled={!!actioning}
                          style={{ backgroundColor: '#34D39933', borderWidth: 1, borderColor: '#34D39966', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 }}>
                          {actioning === l.id + 'Approved' ? <ActivityIndicator size="small" color="#34D399" /> : <Text style={{ fontSize: 11, fontWeight: '700', color: '#34D399' }}>{'✓'}</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => act(l.id, 'Rejected')} disabled={!!actioning}
                          style={{ backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '44', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 }}>
                          {actioning === l.id + 'Rejected' ? <ActivityIndicator size="small" color={C.coral} /> : <Text style={{ fontSize: 11, fontWeight: '700', color: C.coral }}>{'✗'}</Text>}
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={{ fontSize: 10, color: C.muted }}>{formatTime(l.submittedAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center' },
});

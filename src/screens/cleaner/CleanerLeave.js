import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';

const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Emergency'];
const TYPE_KEY = { Casual: 'casual', Sick: 'sick', Earned: 'earned', Emergency: 'emergency' };

const statusColor = s => s === 'Approved' ? '#34D399' : s === 'Rejected' ? C.coral : C.gold;
const statusBg = s => s === 'Approved' ? 'rgba(52,211,153,0.15)' : s === 'Rejected' ? C.coral + '26' : C.gold + '26';

export default function CleanerLeave({ onBack, currentUser }) {
  const staffId = currentUser?.role_id || '';
  const staffName = currentUser?.full_name || 'Cleaner';

  const [balance, setBalance] = useState({ casual: 12, sick: 12, earned: 6 });
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ type: '', from: '', to: '', reason: '' });

  useEffect(() => {
    if (!staffId) { setLoading(false); return; }
    Promise.all([
      apiFetch(`/leave-balance?roleId=${encodeURIComponent(staffId)}`).then(r => r.json()).catch(() => ({})),
      apiFetch(`/leave-requests/mine?staffId=${encodeURIComponent(staffId)}`).then(r => r.json()).catch(() => ({})),
    ]).then(([balData, reqData]) => {
      if (balData.balance) setBalance(balData.balance);
      if (reqData.requests) setLeaves(reqData.requests);
    }).finally(() => setLoading(false));
  }, [staffId]);

  const handleSubmit = async () => {
    if (!form.type || !form.from || !form.to || !form.reason) {
      setErrorMsg('Please fill in all fields.'); return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await apiFetch('/leave-request/submit', {
        method: 'POST',
        body: JSON.stringify({
          staffId, staffName, role: 'cleaner',
          reasonId: TYPE_KEY[form.type] || 'casual',
          reasonLabel: form.type,
          customReason: form.reason,
          fromDate: form.from,
          toDate: form.to,
          leaveType: TYPE_KEY[form.type] || 'casual',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setLeaves(prev => [{
        id: data.id || Date.now(),
        reasonLabel: form.type,
        leaveType: TYPE_KEY[form.type] || 'casual',
        from: form.from, to: form.to,
        days: 1, status: 'Pending',
        customReason: form.reason,
        submittedAt: new Date().toISOString(),
      }, ...prev]);
      setSubmitted(true);
      setTimeout(() => {
        setShowModal(false); setSubmitted(false);
        setForm({ type: '', from: '', to: '', reason: '' });
      }, 1800);
    } catch (e) {
      setErrorMsg(e.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const usedByType = {};
  leaves.filter(l => l.status === 'Approved').forEach(l => {
    const t = (l.leaveType || '').toLowerCase();
    usedByType[t] = (usedByType[t] || 0) + (l.days || 1);
  });

  const balCards = [
    { label: 'Casual', key: 'casual', total: balance.casual || 12, color: C.gold },
    { label: 'Sick', key: 'sick', total: balance.sick || 12, color: C.teal },
    { label: 'Earned', key: 'earned', total: balance.earned || 6, color: C.purple },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>My Leave</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Apply and track leave requests</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {loading ? (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {balCards.map(lb => {
                const used = usedByType[lb.key] || 0;
                const rem = Math.max(0, lb.total - used);
                return (
                  <View key={lb.label} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontWeight: '800', fontSize: 22, color: lb.color }}>{rem}</Text>
                    <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{lb.label}</Text>
                    <View style={{ width: '100%', height: 4, backgroundColor: C.border, borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                      <View style={{ width: (rem / lb.total * 100) + '%', height: '100%', backgroundColor: lb.color, borderRadius: 99 }} />
                    </View>
                    <Text style={{ color: C.muted, fontSize: 9, marginTop: 4 }}>{used} used / {lb.total}</Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity onPress={() => setShowModal(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.gold, paddingVertical: 14, borderRadius: 14, marginBottom: 20 }}>
              <Icon name="leave" size={18} color={C.navy} />
              <Text style={{ fontWeight: '600', fontSize: 15, color: C.navy }}>Apply for Leave</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.white }}>Leave History</Text>
              {leaves.filter(l => l.status === 'Pending').length > 0 && (
                <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 50, backgroundColor: C.gold + '26' }}>
                  <Text style={{ color: C.gold, fontSize: 12, fontWeight: '600' }}>{leaves.filter(l => l.status === 'Pending').length} Pending</Text>
                </View>
              )}
            </View>

            {leaves.length === 0 ? (
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>{'📋'}</Text>
                <Text style={{ color: C.muted, fontSize: 14 }}>No leave requests yet.</Text>
              </View>
            ) : leaves.map((l, i) => (
              <View key={l.id || i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{l.reasonLabel || l.leaveType || 'Leave'}</Text>
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {l.from}{l.to && l.to !== l.from ? ' \u2192 ' + l.to : ''} · {l.days || 1} day{(l.days || 1) !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 50, backgroundColor: statusBg(l.status) }}>
                    <Text style={{ color: statusColor(l.status), fontSize: 12, fontWeight: '700' }}>{l.status}</Text>
                  </View>
                </View>
                {(l.customReason || l.reason) ? (
                  <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>{l.customReason || l.reason}</Text>
                ) : null}
              </View>
            ))}
          </>
        )}
      </View>

      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => !submitting && setShowModal(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={{ backgroundColor: C.navyMid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
              <View style={{ width: 36, height: 4, backgroundColor: C.border, borderRadius: 99, alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ fontWeight: '700', fontSize: 18, color: C.white, marginBottom: 20 }}>Apply for Leave</Text>

              {submitted ? (
                <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                  <Text style={{ fontSize: 44, marginBottom: 12 }}>{'✅'}</Text>
                  <Text style={{ fontWeight: '700', fontSize: 18, color: '#34D399' }}>Submitted!</Text>
                  <Text style={{ color: C.muted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>Your leave request has been sent for approval.</Text>
                </View>
              ) : (
                <>
                  {errorMsg ? <Text style={{ color: C.coral, fontSize: 13, marginBottom: 12 }}>{errorMsg}</Text> : null}

                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 8 }}>Leave Type</Text>
                  <TouchableOpacity onPress={() => setShowTypePicker(p => !p)} style={{ padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, marginBottom: 4 }}>
                    <Text style={{ fontSize: 15, color: form.type ? C.white : C.muted }}>{form.type || 'Select type…'}</Text>
                  </TouchableOpacity>
                  {showTypePicker && (
                    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
                      {LEAVE_TYPES.map(t => (
                        <TouchableOpacity key={t} onPress={() => { setForm(p => ({ ...p, type: t })); setShowTypePicker(false); }} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
                          <Text style={{ fontSize: 14, color: form.type === t ? C.gold : C.white }}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 8 }}>From Date</Text>
                      <TextInput value={form.from} onChangeText={v => setForm(p => ({ ...p, from: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} style={{ padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 14 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 8 }}>To Date</Text>
                      <TextInput value={form.to} onChangeText={v => setForm(p => ({ ...p, to: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} style={{ padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 14 }} />
                    </View>
                  </View>

                  <View style={{ marginTop: 14, marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 8 }}>Reason</Text>
                    <TextInput value={form.reason} onChangeText={v => setForm(p => ({ ...p, reason: v }))} placeholder="Brief reason for leave…" placeholderTextColor={C.muted} multiline numberOfLines={3} style={{ padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 14, textAlignVertical: 'top', minHeight: 80 }} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => setShowModal(false)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border }}>
                      <Text style={{ fontWeight: '600', fontSize: 15, color: C.white }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.gold, paddingVertical: 14, borderRadius: 14, opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? <ActivityIndicator size="small" color={C.navy} /> : <Icon name="check" size={16} color={C.navy} />}
                      <Text style={{ fontWeight: '600', fontSize: 15, color: C.navy }}>{submitting ? 'Submitting…' : 'Submit Request'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, StyleSheet, ActivityIndicator, BackHandler, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { PAYMENT_MODES, DISCOUNT_TYPES } from '../../data/admin';
import { INR, FEE_STATUS_COLOR } from '../../theme/styles';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import { getFriendlyError } from '../../utils/errorMessages';
import LoadingSpinner from '../../components/LoadingSpinner';

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027'];
const QUARTERS = ['1', '2', '3', '4'];

function QPill({ label, status }) {
  const colorMap = { paid: '#34D399', overdue: C.coral, pending: C.gold, upcoming: C.muted };
  const bg = colorMap[status] || C.muted;
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: bg + '33', marginRight: 4 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: bg }}>{label}</Text>
    </View>
  );
}

export default function AdminFeeScreen({ onBack, currentUser }) {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const [payModal, setPayModal] = useState(false);
  const [discModal, setDiscModal] = useState(false);
  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [notifyDueDate, setNotifyDueDate] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ visible: true, message: msg, type });
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState(PAYMENT_MODES[0]);
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [newDiscType, setNewDiscType] = useState(DISCOUNT_TYPES[0]);
  const [newDiscAmt, setNewDiscAmt] = useState('');
  const [payModeOpen, setPayModeOpen] = useState(false);
  const [discTypeOpen, setDiscTypeOpen] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null);

  const [availableClasses, setAvailableClasses] = useState([]);
  const [structClassId, setStructClassId] = useState('');
  const [structClassName, setStructClassName] = useState('');
  const [structTuition, setStructTuition] = useState('');
  const [structBus, setStructBus] = useState('');
  const [structMisc, setStructMisc] = useState('');
  const [structDueDay, setStructDueDay] = useState('10');
  const [structYear, setStructYear] = useState('2025-2026');
  const [structSaving, setStructSaving] = useState(false);
  const [structSaved, setStructSaved] = useState(false);
  const [classDropOpen, setClassDropOpen] = useState(false);
  const [yearDropOpen, setYearDropOpen] = useState(false);

  const [genQuarter, setGenQuarter] = useState('1');
  const [genLoading, setGenLoading] = useState(false);
  const [quarterDropOpen, setQuarterDropOpen] = useState(false);

  const [discStudentSearch, setDiscStudentSearch] = useState('');
  const [discSelectedStudent, setDiscSelectedStudent] = useState(null);
  const [discType, setDiscType] = useState('percentage');
  const [discValue, setDiscValue] = useState('');
  const [discReason, setDiscReason] = useState('');
  const [discSaving, setDiscSaving] = useState(false);
  const [discTypeDropOpen, setDiscTypeDropOpen] = useState(false);
  const [discStudentSearchResults, setDiscStudentSearchResults] = useState([]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detail) { setDetail(null); return true; }
      if (selectedClass) { setSelectedClass(null); return true; }
      onBack(); return true;
    });
    return () => sub.remove();
  }, [onBack, detail, selectedClass]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/fee-students', {});
        const data = await res.json();
        if (data.success && Array.isArray(data.students)) setStudents(data.students);
      } catch (e) {
        console.log('Fee students fetch:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'classes') {
      (async () => {
        try {
          const res = await apiFetch('/available-classes', {});
          const data = await res.json();
          if (data.classes) setAvailableClasses(data.classes);
        } catch (e) {
          console.log('Classes fetch:', e.message);
        }
      })();
    }
  }, [activeTab]);

  useEffect(() => {
    if (discStudentSearch.length > 1) {
      const lower = discStudentSearch.toLowerCase();
      const unique = {};
      students.forEach(s => {
        const key = s.studentId || s.id;
        if (!unique[key]) unique[key] = s;
      });
      const results = Object.values(unique).filter(s =>
        (s.studentName || s.name || '').toLowerCase().includes(lower) ||
        (s.studentId || s.id || '').toLowerCase().includes(lower)
      ).slice(0, 6);
      setDiscStudentSearchResults(results);
    } else {
      setDiscStudentSearchResults([]);
    }
  }, [discStudentSearch, students]);

  const sendFeeNotification = async () => {
    if (!detail) return;
    const balance = Math.max(0, detail.totalFee - detail.paid - detail.discount + detail.fine);
    if (balance <= 0) { showToast('No pending balance', 'error'); return; }
    const dueDate = notifyDueDate || new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    setNotifySending(true);
    try {
      const res = await apiFetch('/fee-reminder', {
        method: 'POST',
        body: JSON.stringify({
          studentId: `student-${detail.id}`,
          studentName: detail.name,
          className: `Grade ${detail.grade}`,
          amount: balance,
          dueDate,
          message: notifyMsg || `Dear Parent, a fee balance of ${INR(balance)} is pending for ${detail.name}. Please pay by ${dueDate}.`,
          senderName: currentUser?.full_name || 'Principal',
          senderRole: 'admin',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        showToast('Notification sent to parent');
        setNotifyModal(false); setNotifyMsg(''); setNotifyDueDate('');
      } else {
        showToast('Failed to send', 'error');
      }
    } catch (e) {
      showToast(getFriendlyError(e, 'Network error'), 'error');
    }
    setNotifySending(false);
  };

  const recordPayment = () => {
    if (!payAmount || isNaN(+payAmount) || +payAmount <= 0) return;
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const newPay = { date: today, amount: +payAmount, mode: payMode, ref: payRef || `PAY-${detail.id}-${Date.now().toString(36).toUpperCase()}`, note: payNote || null };
    setStudents(p => p.map(s => {
      if (s.id !== detail.id) return s;
      const newPaid = s.paid + +payAmount;
      const balance = s.totalFee - newPaid - s.discount + s.fine;
      const newStatus = balance <= 0 ? 'Cleared' : newPaid > 0 ? 'Partial' : 'Overdue';
      return { ...s, paid: newPaid, status: newStatus, history: [...s.history, newPay] };
    }));
    setDetail(prev => {
      const newPaid = prev.paid + +payAmount;
      const balance = prev.totalFee - newPaid - prev.discount + prev.fine;
      return { ...prev, paid: newPaid, status: balance <= 0 ? 'Cleared' : newPaid > 0 ? 'Partial' : 'Overdue', history: [...prev.history, newPay] };
    });
    setPayAmount(''); setPayMode(PAYMENT_MODES[0]); setPayRef(''); setPayNote('');
    setPayModal(false); showToast('Payment recorded');
  };

  const addDiscount = () => {
    if (!newDiscAmt || isNaN(+newDiscAmt) || +newDiscAmt <= 0) return;
    const disc = { type: newDiscType, amount: +newDiscAmt };
    setStudents(p => p.map(s => s.id === detail.id ? { ...s, discount: s.discount + (+newDiscAmt), discounts: [...s.discounts, disc] } : s));
    setDetail(prev => ({ ...prev, discount: prev.discount + (+newDiscAmt), discounts: [...prev.discounts, disc] }));
    setNewDiscType(DISCOUNT_TYPES[0]); setNewDiscAmt('');
    setDiscModal(false); showToast('Discount applied');
  };

  const saveStructure = async () => {
    if (!structClassId || !structTuition || !structYear) { showToast('Class, tuition fee and academic year are required', 'error'); return; }
    setStructSaving(true);
    try {
      const res = await apiFetch('/fee/structure/save', {
        method: 'POST',
        body: JSON.stringify({
          classId: structClassId, className: structClassName,
          tuitionFee: Number(structTuition), busFee: Number(structBus) || 0,
          miscFee: Number(structMisc) || 0, dueDay: Number(structDueDay) || 10,
          academicYear: structYear,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Fee structure saved');
        setStructSaved(true);
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (e) {
      showToast(getFriendlyError(e, 'Network error'), 'error');
    }
    setStructSaving(false);
  };

  const generateRecords = async () => {
    if (!structClassId || !structYear || !genQuarter) { showToast('Select class, year and quarter', 'error'); return; }
    setGenLoading(true);
    try {
      const res = await apiFetch('/fee/generate-records', {
        method: 'POST',
        body: JSON.stringify({ classId: structClassId, academicYear: structYear, quarter: genQuarter }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Fee records created for ${data.recordsCreated} students`);
        setStructSaved(false);
      } else {
        showToast(data.error || 'Failed to generate', 'error');
      }
    } catch (e) {
      showToast(getFriendlyError(e, 'Network error'), 'error');
    }
    setGenLoading(false);
  };

  const saveDiscount = async () => {
    if (!discSelectedStudent) { showToast('Select a student first', 'error'); return; }
    if (discType !== 'waiver' && (!discValue || isNaN(+discValue) || +discValue <= 0)) { showToast('Enter a valid discount value', 'error'); return; }
    setDiscSaving(true);
    try {
      const studentId = discSelectedStudent.studentId || discSelectedStudent.id;
      const res = await apiFetch('/fee/discount/save', {
        method: 'POST',
        body: JSON.stringify({ studentId, discountType: discType, discountValue: discType === 'waiver' ? 0 : Number(discValue), reason: discReason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const name = discSelectedStudent.studentName || discSelectedStudent.name || 'Student';
        showToast(`Discount saved for ${name}`);
        setDiscSelectedStudent(null); setDiscStudentSearch(''); setDiscValue(''); setDiscReason(''); setDiscType('percentage');
      } else {
        showToast(data.error || 'Failed to save discount', 'error');
      }
    } catch (e) {
      showToast(getFriendlyError(e, 'Network error'), 'error');
    }
    setDiscSaving(false);
  };

  const classesByGroup = useMemo(() => {
    const unique = {};
    students.forEach(s => {
      const cid = s.classId || s.grade || 'Unknown';
      const cname = s.className || `Grade ${s.grade}` || cid;
      if (!unique[cid]) unique[cid] = { classId: cid, className: cname, students: [] };
      const existing = unique[cid].students.find(x => (x.studentId || x.id) === (s.studentId || s.id));
      if (!existing) unique[cid].students.push(s);
    });
    return Object.values(unique);
  }, [students]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => (s.classId || s.grade) === selectedClass.classId);
  }, [students, selectedClass]);

  const filteredStudents = students
    .filter(s => filter === 'All' || s.status === filter)
    .filter(s => (s.name || s.studentName || '').toLowerCase().includes(search.toLowerCase()) || (s.grade || '').includes(search));

  const totalFees = students.reduce((a, s) => a + (s.totalFee || s.netAmount || 0), 0);
  const totalCollected = students.reduce((a, s) => a + (s.paid || 0), 0);
  const totalPending = students.reduce((a, s) => a + Math.max(0, (s.totalFee || s.netAmount || 0) - (s.paid || 0) - (s.discount || 0) + (s.fine || 0)), 0);

  const totalQty = totalFees || 1;
  const collectedPct = Math.min(100, Math.round((totalCollected / totalQty) * 100));

  if (detail) {
    const balance = Math.max(0, detail.totalFee - detail.paid - detail.discount + detail.fine);
    const feePct = Math.min(100, Math.round(((detail.paid || 0) / (detail.totalFee || 1)) * 100));
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
        <View style={st.pageHeader}>
          <TouchableOpacity style={st.backBtn} onPress={() => { setDetail(null); setPayModal(false); setDiscModal(false); }}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Fee Account</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{detail.adm || detail.studentId || detail.id}</Text>
          </View>
          <Toast {...toast} onHide={() => setToast(t => ({ ...t, visible: false }))} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <LinearGradient colors={[C.teal + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.teal + '44', borderRadius: 22, padding: 20, marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <LinearGradient colors={[C.teal, C.teal + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 20, color: C.white }}>{(detail.name || detail.studentName || 'S').split(' ').map(n => n[0]).join('').substring(0, 2)}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 17, color: C.white }}>{detail.name || detail.studentName}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>Grade {detail.grade} {'\u00B7'} Roll #{detail.roll}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{detail.adm}</Text>
              </View>
              <View style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99, backgroundColor: FEE_STATUS_COLOR(detail.status) + '22' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: FEE_STATUS_COLOR(detail.status) }}>{detail.status}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              {[[INR(detail.totalFee), 'Total', C.white], [INR(detail.paid), 'Paid', '#34D399'], [INR(detail.discount), 'Discount', C.gold], [INR(balance), 'Balance', balance > 0 ? C.coral : '#34D399']].map(([v, l, c]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, backgroundColor: C.navy + '88', borderRadius: 10 }}>
                  <Text style={{ fontWeight: '800', fontSize: 12, color: c }}>{v}</Text>
                  <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{l}</Text>
                </View>
              ))}
            </View>
            <View style={st.progressTrack}>
              <View style={[st.progressFill, { width: feePct + '%', backgroundColor: FEE_STATUS_COLOR(detail.status) }]} />
            </View>
            {detail.fine > 0 && <View style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: C.coral + '22', borderWidth: 1, borderColor: C.coral + '44', borderRadius: 10 }}>
              <Text style={{ fontSize: 12, color: C.coral }}>{'\u26A0\uFE0F'} Late fine applied: {INR(detail.fine)}</Text>
            </View>}
          </LinearGradient>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <TouchableOpacity onPress={() => { setPayModal(!payModal); setDiscModal(false); setNotifyModal(false); }} style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: C.teal, alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 14, color: C.navy }}>{'\uD83D\uDCB0'} Record Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setDiscModal(!discModal); setPayModal(false); setNotifyModal(false); }} style={{ flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: C.gold + '55', backgroundColor: C.gold + '18', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: C.gold }}>{'\uD83C\uDFF7\uFE0F'} Add Discount</Text>
            </TouchableOpacity>
          </View>

          {balance > 0 && (
            <TouchableOpacity onPress={() => { setNotifyModal(!notifyModal); setPayModal(false); setDiscModal(false); }} style={{ paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: C.coral + '55', backgroundColor: C.coral + '18', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: C.coral }}>{'\uD83D\uDD14'} Notify Fee to Parent</Text>
            </TouchableOpacity>
          )}
          {balance <= 0 && <View style={{ marginBottom: 10 }} />}
          <Toast {...toast} onHide={() => setToast(t => ({ ...t, visible: false }))} />

          {notifyModal && (
            <View style={[st.card, { marginBottom: 16, borderRadius: 18, borderTopWidth: 3, borderTopColor: C.coral }]}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 6 }}>{'\uD83D\uDD14'} Send Fee Reminder</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>A notification will be sent to {detail.name || detail.studentName}'s parent about the pending balance of {INR(balance)}.</Text>
              <Text style={st.label}>Due Date (optional)</Text>
              <TextInput style={st.inputField} placeholder="e.g. 15 Mar 2026" placeholderTextColor={C.muted} value={notifyDueDate} onChangeText={setNotifyDueDate} />
              <Text style={[st.label, { marginTop: 10 }]}>Custom Message (optional)</Text>
              <TextInput style={[st.inputField, { marginBottom: 14, minHeight: 60 }]} placeholder="Leave blank for default message" placeholderTextColor={C.muted} value={notifyMsg} onChangeText={setNotifyMsg} multiline />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setNotifyModal(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.navyMid, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '600', color: C.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={sendFeeNotification} disabled={notifySending} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.coral, alignItems: 'center', opacity: notifySending ? 0.6 : 1 }}>
                  {notifySending ? <ActivityIndicator size="small" color={C.white} /> : <Text style={{ fontWeight: '800', color: C.white }}>{'\uD83D\uDD14'} Send Reminder</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {payModal && (
            <View style={[st.card, { marginBottom: 16, borderRadius: 18, borderTopWidth: 3, borderTopColor: C.teal }]}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 14 }}>{'\uD83D\uDCB0'} Record New Payment</Text>
              <Text style={st.label}>Amount ({'\u20B9'})</Text>
              <TextInput style={st.inputField} keyboardType="numeric" placeholder="e.g. 31000" placeholderTextColor={C.muted} value={payAmount} onChangeText={setPayAmount} />
              <Text style={[st.label, { marginTop: 10 }]}>Payment Mode</Text>
              <TouchableOpacity style={st.inputField} onPress={() => setPayModeOpen(true)}>
                <Text style={{ color: C.white, fontSize: 15 }}>{payMode}</Text>
              </TouchableOpacity>
              <Modal visible={payModeOpen} transparent animationType="fade">
                <TouchableOpacity style={st.modalOverlay} onPress={() => setPayModeOpen(false)}>
                  <View style={st.modalContent}>
                    {PAYMENT_MODES.map(m => (
                      <TouchableOpacity key={m} onPress={() => { setPayMode(m); setPayModeOpen(false); }} style={st.modalItem}>
                        <Text style={{ color: payMode === m ? C.gold : C.white, fontSize: 15, fontWeight: payMode === m ? '700' : '400' }}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
              <Text style={[st.label, { marginTop: 10 }]}>Reference / Transaction ID</Text>
              <TextInput style={st.inputField} placeholder="UPI Ref / Cheque No. (optional)" placeholderTextColor={C.muted} value={payRef} onChangeText={setPayRef} />
              <Text style={[st.label, { marginTop: 10 }]}>Note (optional)</Text>
              <TextInput style={[st.inputField, { marginBottom: 14 }]} placeholder="e.g. Full Term 3 payment" placeholderTextColor={C.muted} value={payNote} onChangeText={setPayNote} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setPayModal(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.navyMid, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '600', color: C.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={recordPayment} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.teal, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', color: C.navy }}>{'\u2713'} Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {discModal && (
            <View style={[st.card, { marginBottom: 16, borderRadius: 18, borderTopWidth: 3, borderTopColor: C.gold }]}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white, marginBottom: 14 }}>{'\uD83C\uDFF7\uFE0F'} Add Discount / Concession</Text>
              <Text style={st.label}>Discount Type</Text>
              <TouchableOpacity style={st.inputField} onPress={() => setDiscTypeOpen(true)}>
                <Text style={{ color: C.white, fontSize: 15 }}>{newDiscType}</Text>
              </TouchableOpacity>
              <Modal visible={discTypeOpen} transparent animationType="fade">
                <TouchableOpacity style={st.modalOverlay} onPress={() => setDiscTypeOpen(false)}>
                  <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={st.modalContent}>
                    {DISCOUNT_TYPES.map(d => (
                      <TouchableOpacity key={d} onPress={() => { setNewDiscType(d); setDiscTypeOpen(false); }} style={st.modalItem}>
                        <Text style={{ color: newDiscType === d ? C.gold : C.white, fontSize: 15, fontWeight: newDiscType === d ? '700' : '400' }}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </TouchableOpacity>
              </Modal>
              <Text style={[st.label, { marginTop: 10 }]}>Discount Amount ({'\u20B9'})</Text>
              <TextInput style={[st.inputField, { marginBottom: 14 }]} keyboardType="numeric" placeholder="e.g. 3000" placeholderTextColor={C.muted} value={newDiscAmt} onChangeText={setNewDiscAmt} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setDiscModal(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.navyMid, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '600', color: C.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addDiscount} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.gold, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', color: C.navy }}>{'\u2713'} Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(detail.discounts || []).length > 0 && (
            <View>
              <View style={st.secHead}><Text style={st.secTitle}>Discounts Applied</Text></View>
              {(detail.discounts || []).map((d, i) => (
                <View key={i} style={[st.card, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 }]}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold }} />
                  <Text style={{ flex: 1, fontWeight: '600', fontSize: 13, color: C.white }}>{d.type}</Text>
                  <Text style={{ fontWeight: '800', fontSize: 14, color: C.gold }}>{'\u2013'}{INR(d.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[st.secHead, { marginTop: 10 }]}><Text style={st.secTitle}>Payment History</Text></View>
          {(detail.history || []).map((h, i) => (
            <View key={i} style={[st.card, { marginBottom: 10, borderRadius: 16, padding: 14, borderLeftWidth: 3, borderLeftColor: h.amount > 0 ? '#34D399' : C.coral }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: h.note ? 8 : 0 }}>
                <View>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: h.amount > 0 ? '#34D399' : C.coral }}>{h.amount > 0 ? INR(h.amount) : 'No Payment'}</Text>
                  <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{h.date} {'\u00B7'} {h.mode}</Text>
                  {h.ref && h.ref !== '\u2014' && <Text style={{ fontSize: 10, color: C.border, marginTop: 2 }}>Ref: {h.ref}</Text>}
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: h.amount > 0 ? '#34D39922' : C.coral + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{h.amount > 0 ? '\u2705' : '\u23F3'}</Text>
                </View>
              </View>
              {h.note && <View style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: C.navyMid, borderRadius: 8 }}><Text style={{ fontSize: 11, color: C.muted }}>{h.note}</Text></View>}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading fee data..." />;

  const tabDefs = [
    { key: 'students', label: 'Students' },
    { key: 'classes', label: 'Classes' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <Toast {...toast} onHide={() => setToast(t => ({ ...t, visible: false }))} />
      <View style={st.pageHeader}>
        <TouchableOpacity style={st.backBtn} onPress={() => { if (selectedClass) { setSelectedClass(null); } else { onBack(); } }}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>
            {selectedClass ? selectedClass.className : 'Fee Management'}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {selectedClass ? `${classStudents.length} students` : `Admin \u00B7 ${students.length} records`}
          </Text>
        </View>
      </View>

      {!selectedClass && (
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 4, backgroundColor: C.navyMid, borderRadius: 14, padding: 4 }}>
          {tabDefs.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)} style={{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', backgroundColor: activeTab === t.key ? C.teal : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === t.key ? C.navy : C.muted }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}>

        {activeTab === 'students' && !selectedClass && (
          <>
            <LinearGradient colors={[C.teal + '22', C.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 18 }}>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>Overall Fee Collection</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {[[INR(totalCollected), 'Collected', '#34D399'], [INR(totalPending), 'Pending', C.coral], [INR(totalFees), 'Total', C.white]].map(([v, l, c]) => (
                  <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, backgroundColor: C.navy + '88', borderRadius: 12 }}>
                    <Text style={{ fontWeight: '800', fontSize: 13, color: c }}>{v}</Text>
                    <Text style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{l}</Text>
                  </View>
                ))}
              </View>
              <View style={[st.progressTrack, { height: 10 }]}>
                <View style={[st.progressFill, { width: collectedPct + '%', backgroundColor: '#34D399' }]} />
              </View>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{collectedPct}% of total fees collected</Text>
            </LinearGradient>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[['All', students.length, C.muted], ['Cleared', students.filter(s => s.status === 'Cleared').length, '#34D399'], ['Partial', students.filter(s => s.status === 'Partial').length, C.gold], ['Overdue', students.filter(s => s.status === 'Overdue').length, C.coral]].map(([l, v, c]) => (
                <TouchableOpacity key={l} onPress={() => setFilter(l)} style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, backgroundColor: filter === l ? c + '33' : C.navyMid, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: filter === l ? c : C.white }}>{v}</Text>
                  <Text style={{ marginTop: 2, fontSize: 11, fontWeight: '700', color: filter === l ? c : C.muted }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ position: 'relative', marginBottom: 14 }}>
              <View style={{ position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 }}>
                <Icon name="search" size={15} color={C.muted} />
              </View>
              <TextInput style={[st.inputField, { paddingLeft: 36 }]} placeholder="Search by name or grade\u2026" placeholderTextColor={C.muted} value={search} onChangeText={setSearch} />
            </View>

            {filteredStudents.map(s => {
              const balance = Math.max(0, (s.totalFee || 0) - (s.paid || 0) - (s.discount || 0) + (s.fine || 0));
              const pct = Math.min(100, Math.round(((s.paid || 0) / (s.totalFee || 1)) * 100));
              return (
                <TouchableOpacity key={s.id} onPress={() => setDetail(s)} style={[st.card, { borderLeftWidth: 3, borderLeftColor: FEE_STATUS_COLOR(s.status), marginBottom: 10, borderColor: s.status === 'Overdue' ? C.coral + '55' : C.border, borderRadius: 16, padding: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <LinearGradient colors={[C.teal + '88', C.teal + '44']} style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '800', fontSize: 16, color: C.white }}>{(s.name || s.studentName || 'S').split(' ').map(n => n[0]).join('').substring(0, 2)}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>{s.name || s.studentName}</Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>Grade {s.grade || s.classId} {'\u00B7'} Roll #{s.roll}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: FEE_STATUS_COLOR(s.status) + '22' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: FEE_STATUS_COLOR(s.status) }}>{s.status}</Text>
                      </View>
                      {balance > 0 && <Text style={{ fontSize: 11, color: C.coral, fontWeight: '700', marginTop: 4 }}>Due: {INR(balance)}</Text>}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, color: C.muted }}>Total: <Text style={{ fontWeight: '700', color: C.white }}>{INR(s.totalFee || s.netAmount || 0)}</Text></Text>
                    <Text style={{ fontSize: 11, color: C.muted }}>Paid: <Text style={{ fontWeight: '700', color: '#34D399' }}>{INR(s.paid || 0)}</Text></Text>
                    {(s.discount || 0) > 0 && <Text style={{ fontSize: 11, color: C.muted }}>Disc: <Text style={{ fontWeight: '700', color: C.gold }}>{'\u2013'}{INR(s.discount)}</Text></Text>}
                  </View>
                  <View style={[st.progressTrack, { height: 5 }]}>
                    <View style={[st.progressFill, { width: pct + '%', backgroundColor: FEE_STATUS_COLOR(s.status) }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {activeTab === 'classes' && !selectedClass && (
          <>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Tap a class to view student fee status</Text>
            {classesByGroup.length === 0 && (
              <View style={[st.card, { alignItems: 'center', padding: 32 }]}>
                <Text style={{ fontSize: 32, marginBottom: 10 }}>{'\uD83C\uDFEB'}</Text>
                <Text style={{ color: C.white, fontWeight: '700', marginBottom: 6 }}>No fee records yet</Text>
                <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>Generate fee records from the Settings tab first.</Text>
              </View>
            )}
            {classesByGroup.map(cls => {
              const clsStudents = cls.students;
              const paid = clsStudents.filter(s => s.status === 'paid' || s.status === 'Cleared').length;
              const overdue = clsStudents.filter(s => s.status === 'overdue' || s.status === 'Overdue').length;
              const pending = clsStudents.length - paid - overdue;
              return (
                <TouchableOpacity key={cls.classId} onPress={() => setSelectedClass(cls)} style={[st.card, { marginBottom: 12, borderRadius: 16, padding: 18, borderLeftWidth: 3, borderLeftColor: C.teal }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, color: C.white }}>{cls.className}</Text>
                    <Text style={{ color: C.muted, fontSize: 13 }}>{clsStudents.length} students</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 14 }}>{'\u2705'}</Text>
                      <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 13 }}>{paid}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 14 }}>{'\uD83D\uDD34'}</Text>
                      <Text style={{ color: C.coral, fontWeight: '700', fontSize: 13 }}>{overdue}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 14 }}>{'\u23F3'}</Text>
                      <Text style={{ color: C.gold, fontWeight: '700', fontSize: 13 }}>{pending}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {activeTab === 'classes' && selectedClass && (
          <>
            {classStudents.length === 0 && (
              <View style={[st.card, { alignItems: 'center', padding: 32 }]}>
                <Text style={{ color: C.muted, textAlign: 'center' }}>No fee records for this class.</Text>
              </View>
            )}
            {classStudents.map(s => {
              const balance = Math.max(0, (s.totalFee || s.netAmount || 0) - (s.paid || 0) - (s.discount || 0) + (s.fine || 0));
              const qStatus = (q) => {
                if (s.quarter === q && s.status) {
                  const st2 = (s.status || '').toLowerCase();
                  if (st2 === 'cleared' || st2 === 'paid') return 'paid';
                  if (st2 === 'overdue') return 'overdue';
                  return 'pending';
                }
                return 'upcoming';
              };
              return (
                <TouchableOpacity key={s.id || s.studentId} onPress={() => setDetail(s)} style={[st.card, { marginBottom: 10, borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: FEE_STATUS_COLOR(s.status) }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <LinearGradient colors={[C.teal + '88', C.teal + '44']} style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '800', fontSize: 13, color: C.white }}>{(s.name || s.studentName || 'S').split(' ').map(n => n[0]).join('').substring(0, 2)}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: C.white }}>{s.name || s.studentName}</Text>
                      <Text style={{ color: C.muted, fontSize: 11 }}>{s.studentId || s.id}</Text>
                    </View>
                    {balance > 0 && <Text style={{ fontSize: 12, color: C.coral, fontWeight: '700' }}>Due: {INR(balance)}</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {[1, 2, 3, 4].map(q => (
                      <QPill key={q} label={`Q${q}`} status={qStatus(q)} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <View style={[st.card, { marginBottom: 20, borderRadius: 18, borderTopWidth: 3, borderTopColor: C.teal }]}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: C.white, marginBottom: 4 }}>{'\uD83C\uDFEB'} Fee Structure</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Set quarterly fee amounts per class</Text>

              <Text style={st.label}>Class</Text>
              <TouchableOpacity style={st.inputField} onPress={() => setClassDropOpen(true)}>
                <Text style={{ color: structClassId ? C.white : C.muted, fontSize: 15 }}>{structClassName || 'Select class\u2026'}</Text>
              </TouchableOpacity>
              <Modal visible={classDropOpen} transparent animationType="fade">
                <TouchableOpacity style={st.modalOverlay} onPress={() => setClassDropOpen(false)}>
                  <View style={[st.modalContent, { maxHeight: 340 }]}>
                    <ScrollView>
                      {availableClasses.map(c => (
                        <TouchableOpacity key={c.classId || c.id} onPress={() => { setStructClassId(c.classId || c.id); setStructClassName(c.className || c.name || c.classId || c.id); setClassDropOpen(false); setStructSaved(false); }} style={st.modalItem}>
                          <Text style={{ color: structClassId === (c.classId || c.id) ? C.gold : C.white, fontSize: 15 }}>{c.className || c.name || c.classId || c.id}</Text>
                        </TouchableOpacity>
                      ))}
                      {availableClasses.length === 0 && <View style={{ padding: 20 }}><Text style={{ color: C.muted, textAlign: 'center' }}>No classes found</Text></View>}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              <Text style={[st.label, { marginTop: 14 }]}>Academic Year</Text>
              <TouchableOpacity style={st.inputField} onPress={() => setYearDropOpen(true)}>
                <Text style={{ color: C.white, fontSize: 15 }}>{structYear}</Text>
              </TouchableOpacity>
              <Modal visible={yearDropOpen} transparent animationType="fade">
                <TouchableOpacity style={st.modalOverlay} onPress={() => setYearDropOpen(false)}>
                  <View style={st.modalContent}>
                    {ACADEMIC_YEARS.map(y => (
                      <TouchableOpacity key={y} onPress={() => { setStructYear(y); setYearDropOpen(false); setStructSaved(false); }} style={st.modalItem}>
                        <Text style={{ color: structYear === y ? C.gold : C.white, fontSize: 15 }}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Tuition Fee ({'\u20B9'}) *</Text>
                  <TextInput style={st.inputField} keyboardType="numeric" placeholder="e.g. 25000" placeholderTextColor={C.muted} value={structTuition} onChangeText={t => { setStructTuition(t); setStructSaved(false); }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Bus Fee ({'\u20B9'})</Text>
                  <TextInput style={st.inputField} keyboardType="numeric" placeholder="Optional" placeholderTextColor={C.muted} value={structBus} onChangeText={t => { setStructBus(t); setStructSaved(false); }} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Misc Fee ({'\u20B9'})</Text>
                  <TextInput style={st.inputField} keyboardType="numeric" placeholder="Optional" placeholderTextColor={C.muted} value={structMisc} onChangeText={t => { setStructMisc(t); setStructSaved(false); }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Due Day (1–28)</Text>
                  <TextInput style={st.inputField} keyboardType="numeric" placeholder="10" placeholderTextColor={C.muted} value={structDueDay} onChangeText={setStructDueDay} maxLength={2} />
                </View>
              </View>

              {(structTuition || structBus || structMisc) ? (
                <View style={{ marginTop: 14, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: C.teal + '18', borderWidth: 1, borderColor: C.teal + '44', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>Total per quarter</Text>
                  <Text style={{ color: C.teal, fontWeight: '800', fontSize: 15 }}>{INR((Number(structTuition) || 0) + (Number(structBus) || 0) + (Number(structMisc) || 0))}</Text>
                </View>
              ) : null}

              <TouchableOpacity onPress={saveStructure} disabled={structSaving} style={{ marginTop: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: C.teal, alignItems: 'center', opacity: structSaving ? 0.6 : 1 }}>
                {structSaving ? <ActivityIndicator size="small" color={C.navy} /> : <Text style={{ fontWeight: '800', fontSize: 15, color: C.navy }}>{'\uD83D\uDCBE'} Save Fee Structure</Text>}
              </TouchableOpacity>

              {structSaved && (
                <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.border }}>
                  <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 14, marginBottom: 14 }}>{'\u2705'} Structure saved! Now generate fee records.</Text>
                  <Text style={st.label}>Select Quarter</Text>
                  <TouchableOpacity style={st.inputField} onPress={() => setQuarterDropOpen(true)}>
                    <Text style={{ color: C.white, fontSize: 15 }}>Q{genQuarter}</Text>
                  </TouchableOpacity>
                  <Modal visible={quarterDropOpen} transparent animationType="fade">
                    <TouchableOpacity style={st.modalOverlay} onPress={() => setQuarterDropOpen(false)}>
                      <View style={st.modalContent}>
                        {QUARTERS.map(q => (
                          <TouchableOpacity key={q} onPress={() => { setGenQuarter(q); setQuarterDropOpen(false); }} style={st.modalItem}>
                            <Text style={{ color: genQuarter === q ? C.gold : C.white, fontSize: 15 }}>Quarter {q} (Q{q})</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </TouchableOpacity>
                  </Modal>
                  <TouchableOpacity onPress={generateRecords} disabled={genLoading} style={{ marginTop: 12, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.teal + '66', backgroundColor: C.teal + '22', alignItems: 'center', opacity: genLoading ? 0.6 : 1 }}>
                    {genLoading ? <ActivityIndicator size="small" color={C.teal} /> : <Text style={{ fontWeight: '700', fontSize: 14, color: C.teal }}>{'\u26A1'} Generate for this Quarter</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={[st.card, { marginBottom: 20, borderRadius: 18, borderTopWidth: 3, borderTopColor: C.gold }]}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: C.white, marginBottom: 4 }}>{'\uD83C\uDFF7\uFE0F'} Student Discounts</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Apply concessions to individual students</Text>

              <Text style={st.label}>Search Student</Text>
              <TextInput
                style={st.inputField}
                placeholder="Type student name or ID\u2026"
                placeholderTextColor={C.muted}
                value={discStudentSearch}
                onChangeText={t => { setDiscStudentSearch(t); setDiscSelectedStudent(null); }}
              />
              {discStudentSearchResults.length > 0 && !discSelectedStudent && (
                <View style={{ backgroundColor: C.navyMid, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 4, marginBottom: 8 }}>
                  {discStudentSearchResults.map(s => (
                    <TouchableOpacity key={s.studentId || s.id} onPress={() => { setDiscSelectedStudent(s); setDiscStudentSearch(s.studentName || s.name || ''); setDiscStudentSearchResults([]); }} style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
                      <Text style={{ color: C.white, fontWeight: '600' }}>{s.studentName || s.name}</Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>{s.classId || s.className || `Grade ${s.grade}`} {'\u00B7'} {s.studentId || s.id}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {discSelectedStudent && (
                <View style={{ marginBottom: 14, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.teal + '18', borderWidth: 1, borderColor: C.teal + '44', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 18 }}>{'\uD83D\uDC64'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.white, fontWeight: '700' }}>{discSelectedStudent.studentName || discSelectedStudent.name}</Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>{discSelectedStudent.classId || discSelectedStudent.className || `Grade ${discSelectedStudent.grade}`}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setDiscSelectedStudent(null); setDiscStudentSearch(''); }}>
                    <Text style={{ color: C.coral, fontSize: 12 }}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={[st.label, { marginTop: 4 }]}>Discount Type</Text>
              <TouchableOpacity style={st.inputField} onPress={() => setDiscTypeDropOpen(true)}>
                <Text style={{ color: C.white, fontSize: 15 }}>
                  {discType === 'percentage' ? 'Percentage (%)' : discType === 'fixed' ? 'Fixed Amount (\u20B9)' : 'Full Waiver'}
                </Text>
              </TouchableOpacity>
              <Modal visible={discTypeDropOpen} transparent animationType="fade">
                <TouchableOpacity style={st.modalOverlay} onPress={() => setDiscTypeDropOpen(false)}>
                  <View style={st.modalContent}>
                    {[['percentage', 'Percentage (%)'], ['fixed', 'Fixed Amount (\u20B9)'], ['waiver', 'Full Waiver']].map(([val, label]) => (
                      <TouchableOpacity key={val} onPress={() => { setDiscType(val); setDiscTypeDropOpen(false); }} style={st.modalItem}>
                        <Text style={{ color: discType === val ? C.gold : C.white, fontSize: 15 }}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>

              {discType !== 'waiver' && (
                <>
                  <Text style={[st.label, { marginTop: 14 }]}>Discount Value {discType === 'percentage' ? '(%)' : '(\u20B9)'}</Text>
                  <TextInput style={st.inputField} keyboardType="numeric" placeholder={discType === 'percentage' ? 'e.g. 20' : 'e.g. 5000'} placeholderTextColor={C.muted} value={discValue} onChangeText={setDiscValue} />
                </>
              )}
              <Text style={[st.label, { marginTop: 14 }]}>Reason</Text>
              <TextInput style={[st.inputField, { marginBottom: 16, minHeight: 50 }]} placeholder='e.g. Merit scholarship, Sibling discount' placeholderTextColor={C.muted} value={discReason} onChangeText={setDiscReason} multiline />

              <TouchableOpacity onPress={saveDiscount} disabled={discSaving} style={{ paddingVertical: 14, borderRadius: 14, backgroundColor: C.gold, alignItems: 'center', opacity: discSaving ? 0.6 : 1 }}>
                {discSaving ? <ActivityIndicator size="small" color={C.navy} /> : <Text style={{ fontWeight: '800', fontSize: 15, color: C.navy }}>{'\u2713'} Save Discount</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontSize: 16, fontWeight: '600', color: C.white },
  progressTrack: { backgroundColor: C.border, borderRadius: 99, height: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  label: { fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 8 },
  inputField: { width: '100%', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 14, backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 15, marginBottom: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: C.navyMid, borderRadius: 16, padding: 8, width: 300, borderWidth: 1, borderColor: C.border },
  modalItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
});

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, BackHandler, TextInput, Modal, Share } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';
import { getFriendlyError } from '../../utils/errorMessages';
import Toast from '../../components/Toast';

const INR = (n) => '\u20B9' + Number(n || 0).toLocaleString('en-IN');

const ONLINE_METHODS = [
  { key: 'upi', label: 'UPI / QR Code', icon: '\uD83D\uDCF1' },
  { key: 'card', label: 'Credit / Debit Card', icon: '\uD83D\uDCB3' },
];

function ReceiptModal({ receipt, onClose }) {
  const fmtDate = (iso) => {
    if (!iso) return '\u2014';
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return iso; }
  };
  const handleShare = async () => {
    try {
      await Share.share({
        message: `PAYMENT RECEIPT\n${receipt.receiptNumber}\n\nStudent: ${receipt.studentName}\nQ${receipt.quarter} ${receipt.academicYear}\n\nAmount: ${INR(receipt.amountPaid)}\nMethod: ${(receipt.paymentMethod || '').toUpperCase()}\nDate: ${fmtDate(receipt.paidAt)}\n\nVidyalayam`,
      });
    } catch (_) {}
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.navyMid, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, borderTopWidth: 1, borderColor: C.teal + '44' }}>
          <View style={{ alignItems: 'center', marginBottom: 22 }}>
            <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 18 }} />
            <Text style={{ fontSize: 30, marginBottom: 6 }}>{'\u2705'}</Text>
            <Text style={{ fontWeight: '800', fontSize: 18, color: C.white, marginBottom: 2 }}>Payment Successful!</Text>
            <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13 }}>{receipt.receiptNumber}</Text>
          </View>

          <View style={{ backgroundColor: C.navy + '88', borderRadius: 16, padding: 18, marginBottom: 22, gap: 12 }}>
            {[
              ['Student', receipt.studentName],
              ['Quarter', `Q${receipt.quarter} \u00B7 ${receipt.academicYear}`],
              ['Amount Paid', INR(receipt.amountPaid)],
              ['Method', (receipt.paymentMethod || '').toUpperCase()],
              ['Date', fmtDate(receipt.paidAt)],
            ].map(([label, val]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
                <Text style={{ color: label === 'Amount Paid' ? '#34D399' : C.white, fontWeight: label === 'Amount Paid' ? '800' : '600', fontSize: 13 }}>{val}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={handleShare} style={{ paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.teal + '55', backgroundColor: C.teal + '18', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: C.teal, fontWeight: '700', fontSize: 14 }}>{'\uD83D\uDCE4'} Share Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ paddingVertical: 14, borderRadius: 14, backgroundColor: C.teal, alignItems: 'center' }}>
            <Text style={{ color: C.navy, fontWeight: '800', fontSize: 15 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function FeeScreen({ onBack, currentUser }) {
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [ackLoading, setAckLoading] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ visible: true, message: msg, type });
  const [error, setError] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeError, setFeeError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState('upi');
  const [transactionId, setTransactionId] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (receiptData) { setReceiptData(null); return true; }
      if (payModal) { setPayModal(false); return true; }
      onBack(); return true;
    });
    return () => sub.remove();
  }, [onBack, payModal, receiptData]);

  const studentId = currentUser?.studentId || currentUser?.activeStudentId || '';

  useEffect(() => {
    if (!studentId) { setFeeLoading(false); return; }
    setFeeLoading(true);
    apiFetch(`/parent/fee-summary?studentId=${encodeURIComponent(studentId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.fee) setFeeData(data.fee);
        else setFeeError('No fee records found');
      })
      .catch(() => setFeeError('Failed to load fee details'))
      .finally(() => setFeeLoading(false));
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    setTxLoading(true);
    apiFetch(`/fee/transactions/${encodeURIComponent(studentId)}`)
      .then(r => r.json())
      .then(data => { if (data.success && Array.isArray(data.transactions)) setTransactions(data.transactions); })
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, [studentId]);

  useEffect(() => {
    setRemindersLoading(true);
    apiFetch(`/fee-reminders?studentId=${studentId}`)
      .then(r => r.json())
      .then(data => setReminders(data.reminders || []))
      .catch(() => {})
      .finally(() => setRemindersLoading(false));
  }, [studentId]);

  const acknowledgeReminder = async (reminderId) => {
    setAckLoading(reminderId);
    try {
      const res = await apiFetch('/fee-reminder/acknowledge', { method: 'POST', body: JSON.stringify({ reminderId }) });
      if (res.ok) {
        setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, parentAcknowledged: true } : r));
        showToast('Acknowledgement sent to school');
      }
    } catch (e) { setError(getFriendlyError(e, 'Failed to load fee details')); }
    setAckLoading(null);
  };

  const submitPayment = async () => {
    if (!studentId) { showToast('Student ID not found', 'error'); return; }
    const pendingAmount = feeData?.pending || 0;
    if (pendingAmount <= 0) { showToast('No pending fees', 'error'); return; }

    setSubmittingPay(true);
    try {
      const academicYear = feeData?.academicYear || '2025-2026';
      const quarter = feeData?.currentQuarter || '1';

      const res = await apiFetch('/fee/payment/online', {
        method: 'POST',
        body: JSON.stringify({
          studentId, academicYear, quarter: String(quarter),
          amountPaid: pendingAmount,
          transactionId: transactionId || `TXN-${Date.now()}`,
          paymentMethod: payMethod,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPayModal(false);
        setTransactionId('');
        setReceiptData({
          receiptNumber: data.receiptNumber,
          studentName: currentUser?.full_name || currentUser?.name || '',
          studentId,
          academicYear,
          quarter,
          amountPaid: pendingAmount,
          paymentMethod: payMethod,
          paidAt: new Date().toISOString(),
        });
        setFeeData(prev => prev ? { ...prev, paid: (prev.paid || 0) + pendingAmount, pending: 0 } : prev);
        const newTx = { receiptNumber: data.receiptNumber, amountPaid: pendingAmount, paymentMethod: payMethod, quarter: Number(quarter), academicYear, paidAt: new Date().toISOString(), type: 'online' };
        setTransactions(prev => [newTx, ...prev]);
      } else {
        showToast(data.error || 'Payment failed. Please try again.', 'error');
      }
    } catch (e) {
      showToast(getFriendlyError(e, 'Network error'), 'error');
    }
    setSubmittingPay(false);
  };

  const pendingReminders = reminders.filter(r => !r.parentAcknowledged);
  const hasPending = (feeData?.pending || 0) > 0;
  const fmtDate = (iso) => {
    if (!iso) return '\u2014';
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); } catch { return iso; }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      {receiptData && <ReceiptModal receipt={receiptData} onClose={() => setReceiptData(null)} />}
      <Toast {...toast} onHide={() => setToast(t => ({ ...t, visible: false }))} />
      {error ? <Text style={{ color: 'red', padding: 12, textAlign: 'center' }}>{error}</Text> : null}

      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Fee Details</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Academic Year 2024{'\u20132025'}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {feeLoading && <ActivityIndicator color={C.gold} style={{ marginTop: 40 }} />}
        {!feeLoading && feeError && <Text style={{ color: C.coral, textAlign: 'center', marginTop: 40 }}>{feeError}</Text>}

        {!feeLoading && feeData && (() => {
          const paidPct = Math.round(((feeData.paid || 0) / (feeData.total || 1)) * 100);
          return (
            <>
              <View style={st.heroCard}>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {[
                    { val: INR(feeData.total), lbl: 'Total Fee', color: C.gold },
                    { val: INR(feeData.paid), lbl: 'Paid', color: '#34D399' },
                    { val: INR(feeData.pending), lbl: 'Pending', color: C.coral },
                  ].map(m => (
                    <View key={m.lbl} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.navy + '88', borderRadius: 12 }}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: m.color }}>{m.val}</Text>
                      <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{m.lbl}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: paidPct + '%', backgroundColor: '#34D399', borderRadius: 4 }} />
                </View>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 8, textAlign: 'center' }}>{paidPct}% paid</Text>
              </View>

              {hasPending && (
                <View style={{ marginBottom: 20, padding: 18, borderRadius: 18, backgroundColor: C.coral + '18', borderWidth: 1.5, borderColor: C.coral + '44' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <Text style={{ fontSize: 22 }}>{'\uD83D\uDCB3'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>Fee Due</Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>Current quarter payment pending</Text>
                    </View>
                    <Text style={{ fontWeight: '800', fontSize: 16, color: C.coral }}>{INR(feeData.pending)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setPayMethod('upi'); setTransactionId(''); setPayModal(true); }} style={{ paddingVertical: 13, borderRadius: 14, backgroundColor: C.teal, alignItems: 'center' }}>
                    <Text style={{ fontWeight: '800', fontSize: 15, color: C.navy }}>{'\uD83D\uDCB0'} Pay Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          );
        })()}

        {payModal && (
          <View style={[st.card, { marginBottom: 20, borderRadius: 18, borderTopWidth: 3, borderTopColor: C.teal }]}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: C.white, marginBottom: 4 }}>{'\uD83D\uDCB3'} Pay Fee</Text>
            <Text style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Amount: <Text style={{ color: C.teal, fontWeight: '800' }}>{INR(feeData?.pending || 0)}</Text></Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 10 }}>Choose Payment Method</Text>
            {ONLINE_METHODS.map(m => (
              <TouchableOpacity key={m.key} onPress={() => setPayMethod(m.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, backgroundColor: payMethod === m.key ? C.teal + '22' : C.navyMid, borderWidth: 1.5, borderColor: payMethod === m.key ? C.teal : C.border }}>
                <Text style={{ fontSize: 22 }}>{m.icon}</Text>
                <Text style={{ flex: 1, fontWeight: '700', fontSize: 15, color: payMethod === m.key ? C.teal : C.white }}>{m.label}</Text>
                {payMethod === m.key && <Text style={{ color: C.teal, fontSize: 18 }}>{'\u2713'}</Text>}
              </TouchableOpacity>
            ))}

            {payMethod === 'upi' && (
              <View style={{ marginTop: 4, marginBottom: 14, padding: 16, backgroundColor: C.navy + '88', borderRadius: 14, alignItems: 'center' }}>
                <View style={{ width: 120, height: 120, backgroundColor: C.border + '44', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 40 }}>{'\uD83D\uDCF1'}</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>Scan QR code or pay via UPI ID</Text>
                <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13, marginTop: 4 }}>school@upi</Text>
              </View>
            )}

            <Text style={{ fontSize: 13, fontWeight: '500', color: C.muted, marginBottom: 8, marginTop: 4 }}>Transaction ID / Reference</Text>
            <TextInput style={[st.inputField, { marginBottom: 14 }]} placeholder="Enter UPI transaction ID or ref" placeholderTextColor={C.muted} value={transactionId} onChangeText={setTransactionId} autoCapitalize="characters" />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setPayModal(false)} style={{ flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.navyMid, alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: C.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitPayment} disabled={submittingPay} style={{ flex: 2, paddingVertical: 13, borderRadius: 14, backgroundColor: C.teal, alignItems: 'center', opacity: submittingPay ? 0.6 : 1 }}>
                {submittingPay ? <ActivityIndicator size="small" color={C.navy} /> : <Text style={{ fontWeight: '800', fontSize: 15, color: C.navy }}>{'\u2705'} Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={st.secHead}><Text style={st.secTitle}>Transaction History</Text></View>
        {txLoading && <ActivityIndicator size="small" color={C.teal} style={{ marginBottom: 16 }} />}
        {!txLoading && transactions.length === 0 && (
          <Text style={{ color: C.muted, textAlign: 'center', marginBottom: 16 }}>No payment records yet</Text>
        )}
        {transactions.map((tx, i) => (
          <View key={tx.receiptNumber || i} style={[st.card, { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#34D399' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{INR(tx.amountPaid)}</Text>
                <Text style={{ fontSize: 12, color: '#34D399', marginTop: 4 }}>
                  Q{tx.quarter} {'\u00B7'} {(tx.paymentMethod || '').toUpperCase()} {'\u00B7'} {fmtDate(tx.paidAt)}
                </Text>
                {tx.receiptNumber && <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Receipt: {tx.receiptNumber}</Text>}
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#34D39922' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#34D399' }}>Paid</Text>
              </View>
            </View>
          </View>
        ))}

        {!txLoading && transactions.length === 0 && !feeLoading && feeData && (feeData.history || []).map((inst, i) => (
          <View key={i} style={[st.card, { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#34D399' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>{'Payment ' + (i + 1)}</Text>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#34D39922' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#34D399' }}>Paid</Text>
              </View>
            </View>
            <Text style={{ fontWeight: '800', fontSize: 20, color: C.white, marginBottom: 6 }}>{INR(inst.amount)}</Text>
            <Text style={{ fontSize: 12, color: '#34D399', marginTop: 4 }}>
              Paid on {inst.date || '\u2014'}{inst.ref ? ' \u00B7 Ref: ' + inst.ref : ''}
            </Text>
          </View>
        ))}

        {remindersLoading ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={C.teal} />
          </View>
        ) : pendingReminders.length > 0 ? (
          <View>
            <View style={[st.secHead, { marginTop: 10 }]}>
              <Text style={st.secTitle}>Fee Reminders</Text>
              <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.coral + '22' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.coral }}>{pendingReminders.length} Pending</Text>
              </View>
            </View>
            {pendingReminders.map(r => (
              <View key={r.id} style={[st.card, { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.coral, borderColor: C.coral + '44' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.coral + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{'\uD83D\uDD14'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: C.white, marginBottom: 4 }}>Fee Reminder</Text>
                    <Text style={{ fontSize: 13, color: C.muted, marginBottom: 6, lineHeight: 18 }}>{r.message || `A balance of ${INR(r.amount)} is pending. Please pay by ${r.dueDate}.`}</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: C.coral, fontWeight: '700' }}>Due: {r.dueDate}</Text>
                      <Text style={{ fontSize: 11, color: C.white, fontWeight: '700' }}>Amount: {INR(r.amount)}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: C.muted }}>From: {r.senderName || 'School Admin'} {'\u00B7'} {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => acknowledgeReminder(r.id)}
                  disabled={ackLoading === r.id}
                  style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: C.teal, alignItems: 'center', opacity: ackLoading === r.id ? 0.6 : 1 }}
                >
                  {ackLoading === r.id ? (
                    <ActivityIndicator size="small" color={C.navy} />
                  ) : (
                    <Text style={{ fontWeight: '800', fontSize: 13, color: C.navy }}>{'\u2705'} Acknowledge</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : reminders.length > 0 ? (
          <View style={[st.secHead, { marginTop: 10 }]}>
            <Text style={st.secTitle}>Fee Reminders</Text>
            <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: '#34D39922' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#34D399' }}>All Acknowledged</Text>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  heroCard: { backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.gold + '44', borderRadius: 24, padding: 20, marginBottom: 18 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 18 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontWeight: '700', fontSize: 15, color: C.white },
  inputField: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, color: C.white, fontSize: 15 },
});

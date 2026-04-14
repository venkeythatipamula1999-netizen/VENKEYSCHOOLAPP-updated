import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { apiFetch } from '../../api/client';
import Toast from '../../components/Toast';
import ErrorBanner from '../../components/ErrorBanner';
import { getFriendlyError } from '../../utils/errorMessages';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_COLORS = { paid: '#34D399', unpaid: '#EF4444', partial: '#F59E0B' };
const STATUS_LABELS = { paid: 'Paid', unpaid: 'Unpaid', partial: 'Partial' };

export default function AdminFeeStatus({ onBack }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState([]);

  const [monthDrop, setMonthDrop] = useState(false);
  const [yearDrop, setYearDrop] = useState(false);
  const [classDrop, setClassDrop] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ total: 0, paid: 0, unpaid: 0, partiallyPaid: 0 });
  const [students, setStudents] = useState([]);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState({});

  const [detailStudent, setDetailStudent] = useState(null);
  const [detailHistory, setDetailHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feeRecordsCache, setFeeRecordsCache] = useState(null);

  const [confirmReminder, setConfirmReminder] = useState(false);
  const [sending, setSending] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });

  useEffect(() => {
    apiFetch('/classes')
      .then(r => r.json())
      .then(d => {
        const list = (d.classes || d || []).map(c => c.name || c.className || c.id).filter(Boolean).sort();
        setClasses(list);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setSelectMode(false);
    setSelected({});
    setFeeRecordsCache(null);
    try {
      let url = `/admin/fees/bulk-status?month=${month}&year=${year}`;
      if (classFilter) url += `&class=${encodeURIComponent(classFilter)}`;
      const resp = await apiFetch(url);
      const d = await resp.json();
      if (!resp.ok || !d.success) throw new Error(d.error || 'Failed to load');
      setSummary(d.summary || { total: 0, paid: 0, unpaid: 0, partiallyPaid: 0 });
      setStudents(d.students || []);
    } catch (e) {
      setError(getFriendlyError(e, 'Failed to load fee status'));
    } finally {
      setLoading(false);
    }
  }, [month, year, classFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelect = (sid) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[sid]) delete next[sid]; else next[sid] = true;
      return next;
    });
  };

  const selectAllUnpaid = () => {
    const newSel = {};
    students.forEach(s => {
      if (s.feeStatus !== 'paid') newSel[s.studentId] = true;
    });
    setSelected(newSel);
  };

  const selectedCount = Object.keys(selected).length;

  const sendReminders = async () => {
    setSending(true);
    try {
      const resp = await apiFetch('/admin/fees/send-reminder', {
        method: 'POST',
        body: JSON.stringify({ studentIds: Object.keys(selected), month, year }),
      });
      const d = await resp.json();
      if (!resp.ok || !d.success) throw new Error(d.error || 'Failed to send');
      showToast(`Reminders sent to ${d.sent} parent${d.sent !== 1 ? 's' : ''}`, 'success');
      setConfirmReminder(false);
      setSelectMode(false);
      setSelected({});
    } catch (e) {
      showToast(getFriendlyError(e, 'Failed to send reminders'));
      setConfirmReminder(false);
    } finally {
      setSending(false);
    }
  };

  const openDetail = async (student) => {
    setDetailStudent(student);
    setDetailLoading(true);
    try {
      let records = feeRecordsCache;
      if (!records) {
        const resp = await apiFetch(`/fee-students`);
        const d = await resp.json();
        records = d.success ? (d.students || []) : [];
        setFeeRecordsCache(records);
      }
      const rec = records.find(s => (s.studentId || s.adm || s.id) === student.studentId);
      setDetailHistory(rec?.history || []);
    } catch (e) {
      setDetailHistory([]);
      showToast(getFriendlyError(e, 'Failed to load payment history'));
    }
    setDetailLoading(false);
  };

  const exportCSV = () => {
    const rows = [['Name', 'Class', 'Roll Number', 'Status', 'Amount Due', 'Amount Paid', 'Balance', 'Last Payment']];
    students.forEach(s => {
      rows.push([s.name, s.class, s.rollNumber, s.feeStatus, s.amountDue, s.amountPaid, s.balance, s.lastPaymentDate || 'N/A']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fee-status-${MONTHS[month - 1]}-${year}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    showToast('CSV exported!', 'success');
  };

  const renderSkeleton = () => (
    <View style={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[st.skelCard]}>
            <View style={st.skelLine} />
            <View style={[st.skelLine, { width: '50%', marginTop: 8 }]} />
          </View>
        ))}
      </View>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={st.skelRow}>
          <View style={st.skelCircle} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[st.skelLine, { width: '60%' }]} />
            <View style={[st.skelLine, { width: '40%' }]} />
          </View>
          <View style={[st.skelLine, { width: 50 }]} />
        </View>
      ))}
    </View>
  );

  const renderDropdown = (items, value, onSelect, visible, setVisible, placeholder) => (
    <View style={{ position: 'relative', zIndex: visible ? 100 : 1 }}>
      <TouchableOpacity style={st.filterBtn} onPress={() => { const next = !visible; setMonthDrop(false); setYearDrop(false); setClassDrop(false); setVisible(next); }}>
        <Text style={{ color: value ? C.white : C.muted, fontSize: 12 }} numberOfLines={1}>{value || placeholder}</Text>
        <Icon name="arrow" size={10} color={C.muted} style={{ transform: [{ rotate: visible ? '-90deg' : '90deg' }] }} />
      </TouchableOpacity>
      {visible && (
        <View style={st.filterDrop}>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            {items.map(item => (
              <TouchableOpacity
                key={String(item.value)}
                style={[st.filterItem, value === item.label && { backgroundColor: C.purple + '22' }]}
                onPress={() => { onSelect(item.value, item.label); setVisible(false); }}
              >
                <Text style={{ color: value === item.label ? C.purple : C.white, fontSize: 13 }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const monthItems = MONTHS.map((m, i) => ({ label: m, value: i + 1 }));
  const yearItems = [year - 1, year, year + 1].map(y => ({ label: String(y), value: y }));
  const classItems = [{ label: 'All Classes', value: '' }, ...classes.map(c => ({ label: c, value: c }))];

  const allPaid = !loading && !error && summary.total > 0 && summary.unpaid === 0 && summary.partiallyPaid === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}>
          <Icon name="back" size={18} color={C.white} />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: 18, color: C.white, flex: 1 }}>Fee Status</Text>
        <TouchableOpacity style={st.exportBtn} onPress={exportCSV}>
          <Icon name="download" size={16} color={C.white} />
        </TouchableOpacity>
      </View>

      <View style={st.filterRow}>
        {renderDropdown(monthItems, MONTHS[month - 1], (v) => setMonth(v), monthDrop, setMonthDrop, 'Month')}
        {renderDropdown(yearItems, String(year), (v) => setYear(v), yearDrop, setYearDrop, 'Year')}
        {renderDropdown(classItems, classFilter || 'All Classes', (v) => setClassFilter(v), classDrop, setClassDrop, 'Class')}
      </View>

      <ScrollView style={{ flex: 1 }}>
        {loading ? renderSkeleton() : error ? (
          <View style={{ padding: 20 }}>
            <ErrorBanner message={error} onRetry={fetchData} onDismiss={() => setError('')} />
          </View>
        ) : (
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Total', val: summary.total, color: C.purple },
                { label: 'Paid', val: summary.paid, color: '#34D399' },
                { label: 'Unpaid', val: summary.unpaid, color: '#EF4444' },
                { label: 'Partial', val: summary.partiallyPaid, color: '#F59E0B' },
              ].map(c => (
                <View key={c.label} style={[st.sumCard, { borderColor: c.color + '44' }]}>
                  <Text style={{ fontWeight: '800', fontSize: 22, color: c.color }}>{c.val}</Text>
                  <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{c.label}</Text>
                </View>
              ))}
            </View>

            {allPaid ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>{'🎉'}</Text>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 18 }}>All fees collected for this month</Text>
                <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{MONTHS[month - 1]} {year}</Text>
              </View>
            ) : (
              <>
                {selectMode && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                    <TouchableOpacity style={st.selectAllBtn} onPress={selectAllUnpaid}>
                      <Text style={{ color: C.purple, fontSize: 12, fontWeight: '600' }}>Select All Unpaid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setSelectMode(false); setSelected({}); }}>
                      <Text style={{ color: C.muted, fontSize: 12 }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {students.map(s => (
                  <TouchableOpacity
                    key={s.studentId}
                    style={st.studentRow}
                    onPress={() => selectMode ? toggleSelect(s.studentId) : openDetail(s)}
                    onLongPress={() => {
                      if (s.feeStatus !== 'paid' && !selectMode) {
                        setSelectMode(true);
                        setSelected({ [s.studentId]: true });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {selectMode && s.feeStatus !== 'paid' && (
                      <View style={[st.checkbox, selected[s.studentId] && st.checkboxActive]}>
                        {selected[s.studentId] && <Icon name="check" size={12} color={C.white} />}
                      </View>
                    )}
                    {selectMode && s.feeStatus === 'paid' && <View style={{ width: 28 }} />}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>{s.name}</Text>
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.class}{s.rollNumber ? ` · Roll #${s.rollNumber}` : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[st.badge, { backgroundColor: STATUS_COLORS[s.feeStatus] + '22' }]}>
                        <Text style={{ color: STATUS_COLORS[s.feeStatus], fontSize: 10, fontWeight: '700' }}>{STATUS_LABELS[s.feeStatus]}</Text>
                      </View>
                      <Text style={{ color: C.muted, fontSize: 10 }}>
                        {s.feeStatus === 'paid' ? `\u20B9${s.amountPaid.toLocaleString('en-IN')}` : `\u20B9${s.balance.toLocaleString('en-IN')} due`}
                      </Text>
                      {s.lastPaymentDate ? <Text style={{ color: C.muted, fontSize: 9 }}>{s.lastPaymentDate}</Text> : null}
                    </View>
                    {!selectMode && <Icon name="arrow" size={12} color={C.muted} style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                ))}

                {students.length === 0 && (
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ color: C.muted, fontSize: 14 }}>No fee records found.</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {selectMode && selectedCount > 0 && (
        <View style={st.bottomBar}>
          <TouchableOpacity style={st.reminderBtn} onPress={() => setConfirmReminder(true)}>
            <Icon name="bell" size={16} color={C.white} />
            <Text style={{ color: C.white, fontWeight: '700', marginLeft: 8 }}>Send Reminder to {selectedCount} student{selectedCount !== 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={confirmReminder} transparent animationType="fade" onRequestClose={() => !sending && setConfirmReminder(false)}>
        <View style={st.modalOverlay}>
          <View style={st.modalBox}>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 17, marginBottom: 12 }}>Send Fee Reminders</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
              Send payment reminders to {selectedCount} parent{selectedCount !== 1 ? 's' : ''} for {MONTHS[month - 1]} {year}?
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[st.modalCancelBtn, { flex: 1 }]} onPress={() => setConfirmReminder(false)} disabled={sending}>
                <Text style={{ color: C.muted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.modalConfirmBtn, { flex: 2, opacity: sending ? 0.6 : 1 }]} onPress={sendReminders} disabled={sending}>
                {sending ? <ActivityIndicator size="small" color={C.white} /> : <Text style={{ color: C.white, fontWeight: '700' }}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!detailStudent} transparent animationType="fade" onRequestClose={() => setDetailStudent(null)}>
        <View style={st.modalOverlay}>
          <View style={[st.modalBox, { maxHeight: '70%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 17 }}>{detailStudent?.name}</Text>
              <TouchableOpacity onPress={() => setDetailStudent(null)}>
                <Icon name="x" size={18} color={C.muted} />
              </TouchableOpacity>
            </View>
            {detailStudent && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{detailStudent.class}{detailStudent.rollNumber ? ` · Roll #${detailStudent.rollNumber}` : ''}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: C.navyMid, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 16 }}>{'\u20B9'}{detailStudent.amountPaid?.toLocaleString('en-IN')}</Text>
                    <Text style={{ color: C.muted, fontSize: 10 }}>Paid</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: C.navyMid, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 16 }}>{'\u20B9'}{detailStudent.balance?.toLocaleString('en-IN')}</Text>
                    <Text style={{ color: C.muted, fontSize: 10 }}>Balance</Text>
                  </View>
                </View>
              </View>
            )}
            <Text style={{ color: C.white, fontWeight: '600', fontSize: 14, marginBottom: 10 }}>Payment History</Text>
            {detailLoading ? (
              <ActivityIndicator color={C.purple} style={{ marginTop: 20 }} />
            ) : detailHistory.length === 0 ? (
              <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 12 }}>No payments recorded</Text>
            ) : (
              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                {detailHistory.map((h, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < detailHistory.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                    <View>
                      <Text style={{ color: C.white, fontSize: 13 }}>{'\u20B9'}{Number(h.amount).toLocaleString('en-IN')}</Text>
                      <Text style={{ color: C.muted, fontSize: 10 }}>{h.mode || ''}{h.ref ? ` · ${h.ref}` : ''}</Text>
                    </View>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{h.date || ''}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(t => ({ ...t, visible: false }))} />
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  exportBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.purple + '33', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.purple + '44' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12, zIndex: 10 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.navyMid, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border, flex: 1 },
  filterDrop: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, zIndex: 200, elevation: 10 },
  filterItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  sumCard: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: C.purple, borderColor: C.purple },
  selectAllBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.purple + '44', backgroundColor: C.purple + '15' },
  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.navy },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.purple, borderRadius: 14, paddingVertical: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', maxWidth: 420, backgroundColor: C.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border },
  modalCancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: C.navyMid },
  modalConfirmBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: C.purple },
  skelCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  skelLine: { height: 12, backgroundColor: C.navyMid, borderRadius: 6, width: '80%' },
  skelCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.navyMid },
});

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { PAYMENT_MODES, DISCOUNT_TYPES } from '../../data/admin';
import { INR, FEE_STATUS_COLOR } from '../../theme/styles';
import { apiFetch } from '../../api/client';
export default function AdminFeeScreen({ onBack, currentUser }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [payModal, setPayModal] = useState(false);
  const [discModal, setDiscModal] = useState(false);
  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyDueDate, setNotifyDueDate] = useState("");
  const [notifySending, setNotifySending] = useState(false);
  const [notifyFlash, setNotifyFlash] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState(PAYMENT_MODES[0]);
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [newDiscType, setNewDiscType] = useState(DISCOUNT_TYPES[0]);
  const [newDiscAmt, setNewDiscAmt] = useState("");
  const [saveFlash, setSaveFlash] = useState(false);
  const [payModeOpen, setPayModeOpen] = useState(false);
  const [discTypeOpen, setDiscTypeOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const roleId = currentUser?.role_id || '';
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

  const sendFeeNotification = async () => {
    if (!detail) return;
    const balance = Math.max(0, detail.totalFee - detail.paid - detail.discount + detail.fine);
    if (balance <= 0) { setNotifyFlash("No pending balance"); setTimeout(() => setNotifyFlash(""), 2000); return; }
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
        setNotifyFlash("Notification sent to parent");
        setNotifyModal(false);
        setNotifyMsg("");
        setNotifyDueDate("");
      } else {
        setNotifyFlash("Failed to send");
      }
    } catch (e) {
      setNotifyFlash("Network error");
    }
    setNotifySending(false);
    setTimeout(() => setNotifyFlash(""), 3000);
  };

  const filtered = students
    .filter(s => filter==="All" || s.status===filter)
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.grade.includes(search));

  const totalFees = students.reduce((a,s)=>a+s.totalFee,0);
  const totalCollected = students.reduce((a,s)=>a+s.paid,0);
  const totalPending = students.reduce((a,s)=>a+Math.max(0,s.totalFee-s.paid-s.discount+s.fine),0);

  const recordPayment = () => {
    if (!payAmount || isNaN(+payAmount) || +payAmount <= 0) return;
    const today = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
    const newPay = { date:today, amount:+payAmount, mode:payMode, ref:payRef||`PAY-${detail.id}-${Date.now().toString(36).toUpperCase()}`, note:payNote||null };
    setStudents(p => p.map(s => {
      if (s.id !== detail.id) return s;
      const newPaid = s.paid + +payAmount;
      const balance = s.totalFee - newPaid - s.discount + s.fine;
      const newStatus = balance <= 0 ? "Cleared" : newPaid > 0 ? "Partial" : "Overdue";
      return { ...s, paid:newPaid, status:newStatus, history:[...s.history, newPay] };
    }));
    setDetail(prev => {
      const newPaid = prev.paid + +payAmount;
      const balance = prev.totalFee - newPaid - prev.discount + prev.fine;
      return { ...prev, paid:newPaid, status:balance<=0?"Cleared":newPaid>0?"Partial":"Overdue", history:[...prev.history, newPay] };
    });
    setPayAmount(""); setPayMode(PAYMENT_MODES[0]); setPayRef(""); setPayNote("");
    setPayModal(false); setSaveFlash(true); setTimeout(()=>setSaveFlash(false),2000);
  };

  const addDiscount = () => {
    if (!newDiscAmt || isNaN(+newDiscAmt) || +newDiscAmt <= 0) return;
    const disc = { type:newDiscType, amount:+newDiscAmt };
    setStudents(p => p.map(s => s.id===detail.id ? { ...s, discount:s.discount+(+newDiscAmt), discounts:[...s.discounts, disc] } : s));
    setDetail(prev => ({ ...prev, discount:prev.discount+(+newDiscAmt), discounts:[...prev.discounts, disc] }));
    setNewDiscType(DISCOUNT_TYPES[0]); setNewDiscAmt("");
    setDiscModal(false); setSaveFlash(true); setTimeout(()=>setSaveFlash(false),2000);
  };

  if (detail) {
    const balance = Math.max(0, detail.totalFee - detail.paid - detail.discount + detail.fine);
    const feePct = Math.min(100, Math.round((detail.paid / detail.totalFee)*100));
    return (
      <ScrollView style={{ flex:1, backgroundColor:C.navy }}>
        <View style={st.pageHeader}>
          <TouchableOpacity style={st.backBtn} onPress={() => { setDetail(null); setPayModal(false); setDiscModal(false); }}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex:1 }}>
            <Text style={{ fontWeight:'700', fontSize:18, color:C.white }}>Fee Account</Text>
            <Text style={{ color:C.muted, fontSize:12 }}>{detail.adm}</Text>
          </View>
          {saveFlash && <View style={{ paddingVertical:4, paddingHorizontal:12, borderRadius:99, backgroundColor:'#34D39922' }}><Text style={{ color:'#34D399', fontSize:11, fontWeight:'700' }}>{'\u2713'} Saved</Text></View>}
        </View>

        <View style={{ paddingHorizontal:20, paddingBottom:32 }}>
          <LinearGradient colors={[C.teal+'22', C.navyMid]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ borderWidth:1, borderColor:C.teal+'44', borderRadius:22, padding:20, marginBottom:18 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:14, marginBottom:16 }}>
              <LinearGradient colors={[C.teal, C.teal+'88']} start={{x:0,y:0}} end={{x:1,y:1}} style={{ width:52, height:52, borderRadius:16, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontWeight:'800', fontSize:20, color:C.white }}>{detail.name.split(" ").map(n=>n[0]).join("").substring(0,2)}</Text>
              </LinearGradient>
              <View style={{ flex:1 }}>
                <Text style={{ fontWeight:'800', fontSize:17, color:C.white }}>{detail.name}</Text>
                <Text style={{ color:C.muted, fontSize:12 }}>Grade {detail.grade} {'·'} Roll #{detail.roll}</Text>
                <Text style={{ color:C.muted, fontSize:11, marginTop:1 }}>{detail.adm}</Text>
              </View>
              <View style={{ paddingVertical:4, paddingHorizontal:12, borderRadius:99, backgroundColor:FEE_STATUS_COLOR(detail.status)+'22' }}>
                <Text style={{ fontSize:12, fontWeight:'700', color:FEE_STATUS_COLOR(detail.status) }}>{detail.status}</Text>
              </View>
            </View>

            <View style={{ flexDirection:'row', gap:6, marginBottom:14 }}>
              {[[INR(detail.totalFee),"Total",C.white],[INR(detail.paid),"Paid","#34D399"],[INR(detail.discount),"Discount",C.gold],[INR(balance),"Balance",balance>0?C.coral:"#34D399"]].map(([v,l,c])=>(
                <View key={l} style={{ flex:1, alignItems:'center', paddingVertical:8, paddingHorizontal:4, backgroundColor:C.navy+'88', borderRadius:10 }}>
                  <Text style={{ fontWeight:'800', fontSize:12, color:c }}>{v}</Text>
                  <Text style={{ fontSize:9, color:C.muted, marginTop:2 }}>{l}</Text>
                </View>
              ))}
            </View>
            <View style={st.progressTrack}>
              <View style={[st.progressFill, { width:feePct+'%', backgroundColor:FEE_STATUS_COLOR(detail.status) }]} />
            </View>
            {detail.fine>0 && <View style={{ marginTop:10, paddingVertical:8, paddingHorizontal:12, backgroundColor:C.coral+'22', borderWidth:1, borderColor:C.coral+'44', borderRadius:10 }}>
              <Text style={{ fontSize:12, color:C.coral }}>{'\u26A0\uFE0F'} Late fine applied: {INR(detail.fine)}</Text>
            </View>}
          </LinearGradient>

          <View style={{ flexDirection:'row', gap:10, marginBottom:10 }}>
            <TouchableOpacity onPress={()=>{setPayModal(!payModal);setDiscModal(false);setNotifyModal(false);}} style={{ flex:1, paddingVertical:13, borderRadius:14, backgroundColor:C.teal, alignItems:'center' }}>
              <Text style={{ fontWeight:'800', fontSize:14, color:C.navy }}>{'\uD83D\uDCB0'} Record Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>{setDiscModal(!discModal);setPayModal(false);setNotifyModal(false);}} style={{ flex:1, paddingVertical:13, borderRadius:14, borderWidth:1.5, borderColor:C.gold+'55', backgroundColor:C.gold+'18', alignItems:'center' }}>
              <Text style={{ fontWeight:'700', fontSize:14, color:C.gold }}>{'\uD83C\uDFF7\uFE0F'} Add Discount</Text>
            </TouchableOpacity>
          </View>

          {balance > 0 && (
            <TouchableOpacity onPress={()=>{setNotifyModal(!notifyModal);setPayModal(false);setDiscModal(false);}} style={{ paddingVertical:13, borderRadius:14, borderWidth:1.5, borderColor:C.coral+'55', backgroundColor:C.coral+'18', alignItems:'center', marginBottom:20 }}>
              <Text style={{ fontWeight:'700', fontSize:14, color:C.coral }}>{'\uD83D\uDD14'} Notify Fee to Parent</Text>
            </TouchableOpacity>
          )}
          {balance <= 0 && <View style={{ marginBottom:10 }} />}

          {notifyFlash ? (
            <View style={{ paddingVertical:10, paddingHorizontal:16, borderRadius:12, backgroundColor:notifyFlash.includes('sent')?'#34D39922':C.coral+'22', marginBottom:14, alignItems:'center' }}>
              <Text style={{ fontSize:13, fontWeight:'600', color:notifyFlash.includes('sent')?'#34D399':C.coral }}>{notifyFlash}</Text>
            </View>
          ) : null}

          {notifyModal && (
            <View style={[st.card, { marginBottom:16, borderRadius:18, borderTopWidth:3, borderTopColor:C.coral }]}>
              <Text style={{ fontWeight:'700', fontSize:15, color:C.white, marginBottom:6 }}>{'\uD83D\uDD14'} Send Fee Reminder</Text>
              <Text style={{ fontSize:12, color:C.muted, marginBottom:14 }}>A notification will be sent to {detail.name}'s parent about the pending balance of {INR(balance)}.</Text>
              <Text style={st.label}>Due Date (optional)</Text>
              <TextInput style={st.inputField} placeholder="e.g. 15 Mar 2026" placeholderTextColor={C.muted} value={notifyDueDate} onChangeText={setNotifyDueDate} />
              <Text style={[st.label, { marginTop:10 }]}>Custom Message (optional)</Text>
              <TextInput style={[st.inputField, { marginBottom:14, minHeight:60 }]} placeholder="Leave blank for default message" placeholderTextColor={C.muted} value={notifyMsg} onChangeText={setNotifyMsg} multiline />
              <View style={{ flexDirection:'row', gap:8 }}>
                <TouchableOpacity onPress={()=>setNotifyModal(false)} style={{ flex:1, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:C.border, backgroundColor:C.navyMid, alignItems:'center' }}>
                  <Text style={{ fontWeight:'600', color:C.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={sendFeeNotification} disabled={notifySending} style={{ flex:1, paddingVertical:10, borderRadius:12, backgroundColor:C.coral, alignItems:'center', opacity:notifySending?0.6:1 }}>
                  {notifySending ? <ActivityIndicator size="small" color={C.white} /> : <Text style={{ fontWeight:'800', color:C.white }}>{'\uD83D\uDD14'} Send Reminder</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {payModal && (
            <View style={[st.card, { marginBottom:16, borderRadius:18, borderTopWidth:3, borderTopColor:C.teal }]}>
              <Text style={{ fontWeight:'700', fontSize:15, color:C.white, marginBottom:14 }}>{'\uD83D\uDCB0'} Record New Payment</Text>
              <Text style={st.label}>Amount ({'\u20B9'})</Text>
              <TextInput style={st.inputField} keyboardType="numeric" placeholder="e.g. 31000" placeholderTextColor={C.muted} value={payAmount} onChangeText={setPayAmount} />
              <Text style={[st.label, { marginTop:10 }]}>Payment Mode</Text>
              <TouchableOpacity style={st.inputField} onPress={() => setPayModeOpen(true)}>
                <Text style={{ color:C.white, fontSize:15 }}>{payMode}</Text>
              </TouchableOpacity>
              <Modal visible={payModeOpen} transparent animationType="fade">
                <TouchableOpacity style={st.modalOverlay} onPress={() => setPayModeOpen(false)}>
                  <View style={st.modalContent}>
                    {PAYMENT_MODES.map(m => (
                      <TouchableOpacity key={m} onPress={() => { setPayMode(m); setPayModeOpen(false); }} style={st.modalItem}>
                        <Text style={{ color:payMode===m?C.gold:C.white, fontSize:15, fontWeight:payMode===m?'700':'400' }}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
              <Text style={[st.label, { marginTop:10 }]}>Reference / Transaction ID</Text>
              <TextInput style={st.inputField} placeholder="UPI Ref / Cheque No. (optional)" placeholderTextColor={C.muted} value={payRef} onChangeText={setPayRef} />
              <Text style={[st.label, { marginTop:10 }]}>Note (optional)</Text>
              <TextInput style={[st.inputField, { marginBottom:14 }]} placeholder="e.g. Full Term 3 payment" placeholderTextColor={C.muted} value={payNote} onChangeText={setPayNote} />
              <View style={{ flexDirection:'row', gap:8 }}>
                <TouchableOpacity onPress={()=>setPayModal(false)} style={{ flex:1, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:C.border, backgroundColor:C.navyMid, alignItems:'center' }}>
                  <Text style={{ fontWeight:'600', color:C.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={recordPayment} style={{ flex:1, paddingVertical:10, borderRadius:12, backgroundColor:C.teal, alignItems:'center' }}>
                  <Text style={{ fontWeight:'800', color:C.navy }}>{'\u2713'} Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {discModal && (
            <View style={[st.card, { marginBottom:16, borderRadius:18, borderTopWidth:3, borderTopColor:C.gold }]}>
              <Text style={{ fontWeight:'700', fontSize:15, color:C.white, marginBottom:14 }}>{'\uD83C\uDFF7\uFE0F'} Add Discount / Concession</Text>
              <Text style={st.label}>Discount Type</Text>
              <TouchableOpacity style={st.inputField} onPress={() => setDiscTypeOpen(true)}>
                <Text style={{ color:C.white, fontSize:15 }}>{newDiscType}</Text>
              </TouchableOpacity>
              <Modal visible={discTypeOpen} transparent animationType="fade">
                <TouchableOpacity style={st.modalOverlay} onPress={() => setDiscTypeOpen(false)}>
                  <ScrollView style={{ maxHeight:400 }} contentContainerStyle={st.modalContent}>
                    {DISCOUNT_TYPES.map(d => (
                      <TouchableOpacity key={d} onPress={() => { setNewDiscType(d); setDiscTypeOpen(false); }} style={st.modalItem}>
                        <Text style={{ color:newDiscType===d?C.gold:C.white, fontSize:15, fontWeight:newDiscType===d?'700':'400' }}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </TouchableOpacity>
              </Modal>
              <Text style={[st.label, { marginTop:10 }]}>Discount Amount ({'\u20B9'})</Text>
              <TextInput style={[st.inputField, { marginBottom:14 }]} keyboardType="numeric" placeholder="e.g. 3000" placeholderTextColor={C.muted} value={newDiscAmt} onChangeText={setNewDiscAmt} />
              <View style={{ flexDirection:'row', gap:8 }}>
                <TouchableOpacity onPress={()=>setDiscModal(false)} style={{ flex:1, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:C.border, backgroundColor:C.navyMid, alignItems:'center' }}>
                  <Text style={{ fontWeight:'600', color:C.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addDiscount} style={{ flex:1, paddingVertical:10, borderRadius:12, backgroundColor:C.gold, alignItems:'center' }}>
                  <Text style={{ fontWeight:'800', color:C.navy }}>{'\u2713'} Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {detail.discounts.length > 0 && (
            <View>
              <View style={st.secHead}><Text style={st.secTitle}>Discounts Applied</Text></View>
              {detail.discounts.map((d,i)=>(
                <View key={i} style={[st.card, { marginBottom:8, flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:14 }]}>
                  <View style={{ width:8, height:8, borderRadius:4, backgroundColor:C.gold }} />
                  <Text style={{ flex:1, fontWeight:'600', fontSize:13, color:C.white }}>{d.type}</Text>
                  <Text style={{ fontWeight:'800', fontSize:14, color:C.gold }}>{'–'}{INR(d.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[st.secHead, { marginTop:10 }]}><Text style={st.secTitle}>Payment History</Text></View>
          {detail.history.map((h,i)=>(
            <View key={i} style={[st.card, { marginBottom:10, borderRadius:16, padding:14, borderLeftWidth:3, borderLeftColor:h.amount>0?'#34D399':C.coral }]}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:h.note?8:0 }}>
                <View>
                  <Text style={{ fontWeight:'700', fontSize:14, color:h.amount>0?'#34D399':C.coral }}>{h.amount>0?INR(h.amount):"No Payment"}</Text>
                  <Text style={{ fontSize:12, color:C.muted, marginTop:2 }}>{h.date} {'·'} {h.mode}</Text>
                  {h.ref && h.ref!=="—" && <Text style={{ fontSize:10, color:C.border, marginTop:2 }}>Ref: {h.ref}</Text>}
                </View>
                <View style={{ width:36, height:36, borderRadius:10, backgroundColor:h.amount>0?'#34D39922':C.coral+'22', alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ fontSize:18 }}>{h.amount>0?"\u2705":"\u23F3"}</Text>
                </View>
              </View>
              {h.note && <View style={{ marginTop:8, paddingVertical:6, paddingHorizontal:10, backgroundColor:C.navyMid, borderRadius:8 }}><Text style={{ fontSize:11, color:C.muted }}>{h.note}</Text></View>}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={{ flex:1, backgroundColor:C.navy, alignItems:'center', justifyContent:'center', paddingTop:120 }}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={{ color:C.muted, fontSize:13, marginTop:12 }}>Loading fee data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex:1, backgroundColor:C.navy }}>
      <View style={st.pageHeader}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <View>
          <Text style={{ fontWeight:'700', fontSize:18, color:C.white }}>Fee Management</Text>
          <Text style={{ color:C.muted, fontSize:12 }}>Admin {'·'} {students.length} students</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal:20, paddingBottom:32 }}>
        <LinearGradient colors={[C.teal+'22', C.navyMid]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ borderWidth:1, borderColor:C.border, borderRadius:20, padding:20, marginBottom:18 }}>
          <Text style={{ color:C.muted, fontSize:12, marginBottom:10 }}>Overall Fee Collection</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
            {[[INR(totalCollected),"Collected","#34D399"],[INR(totalPending),"Pending",C.coral],[INR(totalFees),"Total",C.white]].map(([v,l,c])=>(
              <View key={l} style={{ flex:1, alignItems:'center', paddingVertical:10, paddingHorizontal:6, backgroundColor:C.navy+'88', borderRadius:12 }}>
                <Text style={{ fontWeight:'800', fontSize:13, color:c }}>{v}</Text>
                <Text style={{ fontSize:9, color:C.muted, marginTop:3 }}>{l}</Text>
              </View>
            ))}
          </View>
          <View style={[st.progressTrack, { height:10 }]}>
            <View style={[st.progressFill, { width:Math.round((totalCollected/totalFees)*100)+'%', backgroundColor:'#34D399' }]} />
          </View>
          <Text style={{ fontSize:11, color:C.muted, marginTop:8 }}>{Math.round((totalCollected/totalFees)*100)}% of total fees collected</Text>
        </LinearGradient>

        <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
          {[["All",students.length,C.muted],["Cleared",students.filter(s=>s.status==="Cleared").length,"#34D399"],["Partial",students.filter(s=>s.status==="Partial").length,C.gold],["Overdue",students.filter(s=>s.status==="Overdue").length,C.coral]].map(([l,v,c])=>(
            <TouchableOpacity key={l} onPress={()=>setFilter(l)} style={{ flex:1, paddingVertical:8, paddingHorizontal:4, borderRadius:10, backgroundColor:filter===l?c+'33':C.navyMid, alignItems:'center' }}>
              <Text style={{ fontSize:14, fontWeight:'800', color:filter===l?c:C.white }}>{v}</Text>
              <Text style={{ marginTop:2, fontSize:11, fontWeight:'700', color:filter===l?c:C.muted }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ position:'relative', marginBottom:14 }}>
          <View style={{ position:'absolute', left:12, top:0, bottom:0, justifyContent:'center', zIndex:1 }}>
            <Icon name="search" size={15} color={C.muted} />
          </View>
          <TextInput style={[st.inputField, { paddingLeft:36 }]} placeholder="Search by name or grade…" placeholderTextColor={C.muted} value={search} onChangeText={setSearch} />
        </View>

        {filtered.map(s => {
          const balance = Math.max(0, s.totalFee - s.paid - s.discount + s.fine);
          const pct = Math.min(100, Math.round((s.paid/s.totalFee)*100));
          return (
            <TouchableOpacity key={s.id} onPress={()=>setDetail(s)} style={[st.card, { borderLeftWidth:3, borderLeftColor:FEE_STATUS_COLOR(s.status), marginBottom:10, borderColor:s.status==="Overdue"?C.coral+'55':C.border, borderRadius:16, padding:16 }]}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:12 }}>
                <LinearGradient colors={[C.teal+'88', C.teal+'44']} style={{ width:44, height:44, borderRadius:13, alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ fontWeight:'800', fontSize:16, color:C.white }}>{s.name.split(" ").map(n=>n[0]).join("").substring(0,2)}</Text>
                </LinearGradient>
                <View style={{ flex:1 }}>
                  <Text style={{ fontWeight:'700', fontSize:14, color:C.white }}>{s.name}</Text>
                  <Text style={{ color:C.muted, fontSize:12 }}>Grade {s.grade} {'·'} Roll #{s.roll}</Text>
                </View>
                <View style={{ alignItems:'flex-end' }}>
                  <View style={{ paddingVertical:3, paddingHorizontal:10, borderRadius:99, backgroundColor:FEE_STATUS_COLOR(s.status)+'22' }}>
                    <Text style={{ fontSize:11, fontWeight:'700', color:FEE_STATUS_COLOR(s.status) }}>{s.status}</Text>
                  </View>
                  {balance>0 && <Text style={{ fontSize:11, color:C.coral, fontWeight:'700', marginTop:4 }}>Due: {INR(balance)}</Text>}
                </View>
              </View>
              <View style={{ flexDirection:'row', gap:10, marginBottom:8 }}>
                <Text style={{ fontSize:11, color:C.muted }}>Total: <Text style={{ fontWeight:'700', color:C.white }}>{INR(s.totalFee)}</Text></Text>
                <Text style={{ fontSize:11, color:C.muted }}>Paid: <Text style={{ fontWeight:'700', color:'#34D399' }}>{INR(s.paid)}</Text></Text>
                {s.discount>0 && <Text style={{ fontSize:11, color:C.muted }}>Disc: <Text style={{ fontWeight:'700', color:C.gold }}>{'–'}{INR(s.discount)}</Text></Text>}
              </View>
              <View style={[st.progressTrack, { height:5 }]}>
                <View style={[st.progressFill, { width:pct+'%', backgroundColor:FEE_STATUS_COLOR(s.status) }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  pageHeader: { flexDirection:'row', alignItems:'center', gap:14, paddingTop:16, paddingBottom:8, paddingHorizontal:20 },
  backBtn: { width:38, height:38, borderRadius:12, backgroundColor:C.card, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  card: { backgroundColor:C.card, borderWidth:1, borderColor:C.border, borderRadius:20, padding:20 },
  secHead: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  secTitle: { fontSize:16, fontWeight:'600', color:C.white },
  progressTrack: { backgroundColor:C.border, borderRadius:99, height:8, overflow:'hidden' },
  progressFill: { height:'100%', borderRadius:99 },
  label: { fontSize:13, fontWeight:'500', color:C.muted, marginBottom:8 },
  inputField: { width:'100%', paddingVertical:16, paddingHorizontal:18, borderRadius:14, backgroundColor:C.navyMid, borderWidth:1.5, borderColor:C.border, color:C.white, fontSize:15 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' },
  modalContent: { backgroundColor:C.navyMid, borderRadius:16, padding:8, width:300, borderWidth:1, borderColor:C.border },
  modalItem: { paddingVertical:14, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:C.border },
});

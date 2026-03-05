import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { C } from '../theme/colors';
import Icon from '../components/Icon';

export default function ContactScreen({ onBack }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');

  const contacts = [
    { icon: 'phone', label: 'Phone', value: '+91 98765 43210', color: C.teal },
    { icon: 'mail', label: 'Email', value: 'info@venkeys.edu.in', color: C.gold },
    { icon: 'location', label: 'Address', value: '123 School Road, Chennai - 600001', color: C.coral },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: 18, color: C.white }}>Contact Us</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {contacts.map((c, i) => (
          <View key={i} style={[st.card, { marginBottom: 12, flexDirection: 'row', gap: 16, alignItems: 'flex-start' }]}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.icon} size={20} color={c.color} />
            </View>
            <View>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 2 }}>{c.label}</Text>
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.white }}>{c.value}</Text>
            </View>
          </View>
        ))}

        <View style={[st.card, { marginTop: 24 }]}>
          <Text style={{ fontWeight: '600', fontSize: 15, color: C.white, marginBottom: 16 }}>Send Inquiry</Text>
          <TextInput style={st.input} placeholder="Your Name" placeholderTextColor={C.muted} value={name} onChangeText={setName} />
          <TextInput style={st.input} placeholder="Phone / Email" placeholderTextColor={C.muted} value={contact} onChangeText={setContact} />
          <TextInput style={[st.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Your message..." placeholderTextColor={C.muted} value={message} onChangeText={setMessage} multiline />
          <TouchableOpacity style={st.sendBtn}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: C.navy }}>Send Message</Text>
          </TouchableOpacity>
        </View>

        <View style={st.hoursBox}>
          <Text style={{ fontWeight: '600', color: C.white, marginBottom: 4 }}>School Hours</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>Mon{'–'}Sat: 8:00 AM {'–'} 4:30 PM</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>Office: 9:00 AM {'–'} 5:00 PM</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.navyMid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20 },
  input: { backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16, fontSize: 15, color: C.white, marginBottom: 12 },
  sendBtn: { backgroundColor: C.gold, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  hoursBox: { marginTop: 20, backgroundColor: C.navyMid, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
});

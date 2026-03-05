import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import { PHASE_INFO, CLEANER_DEFAULT } from '../../data/cleaner';

function IDCard({ student, nextScan, isAbsent }) {
  const info = isAbsent ? null : PHASE_INFO[nextScan];
  const color = isAbsent ? C.coral : info.color;
  const gradStart = isAbsent ? '#3A1020' : info.color === C.teal ? '#0A2830' : '#2A1E08';

  const fields = [
    { l: 'Roll No.', v: 'VIS-' + String(student.id).padStart(4, '0') },
    { l: 'Bus No.', v: CLEANER_DEFAULT.bus.number },
    { l: 'Stop', v: student.stop.split(' ').slice(0, 2).join(' ') },
    { l: 'Route', v: 'Route 7' },
  ];

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.55, shadowRadius: 64, elevation: 12 }}>
      <LinearGradient colors={[gradStart, C.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, borderWidth: 1.5, borderColor: color + '55' }}>
        <LinearGradient colors={[color + 'cc', color + '44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '900', letterSpacing: 0.5, color: C.white }}>VENKEYS INT'L SCHOOL</Text>
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>Student Identity Card · 2024–25</Text>
          </View>
          <Text style={{ fontSize: 18 }}>🏫</Text>
        </LinearGradient>

        <View style={{ padding: 14, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', gap: 14 }}>
          <View style={{ flexShrink: 0 }}>
            <View style={{ width: 62, height: 62, borderRadius: 14, backgroundColor: color + '33', borderWidth: 2, borderColor: color + '66', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 22, color }}>{student.photo}</Text>
            </View>
            <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 4, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="qr" size={50} color={color} />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', lineHeight: 19, marginBottom: 3, color: C.white }}>{student.name}</Text>
            <Text style={{ color, fontSize: 12, fontWeight: '600', marginBottom: 10 }}>{student.cls}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {fields.map(f => (
                <View key={f.l} style={{ width: '46%' }}>
                  <Text style={{ color: C.muted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.l}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', marginTop: 1, color: C.white }} numberOfLines={1}>{f.v}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 12 }}>{isAbsent ? '❌' : info.icon}</Text>
              <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{isAbsent ? 'ABSENT TODAY' : info.label.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function CleanerScanner({ students, setStudents }) {
  const [phase, setPhase] = useState('idle');
  const [torch, setTorch] = useState(false);
  const [found, setFound] = useState(null);
  const [log, setLog] = useState([]);
  const timer = useRef(null);

  const pending = students.filter(s => !s.absent && s.scanCount < 4);
  const totalDone = students.filter(s => !s.absent).reduce((a, s) => a + s.scanCount, 0);
  const totalMax = students.filter(s => !s.absent).length * 4;
  const absentStudents = students.filter(s => s.absent);

  const startScan = () => {
    if (phase === 'scanning') return;
    setPhase('scanning');
    timer.current = setTimeout(() => {
      const allPending = students.filter(s => s.scanCount < 4 && !s.absent);
      if (allPending.length === 0) { setPhase('all_done'); return; }
      const student = allPending[Math.floor(Math.random() * allPending.length)];
      setFound(student);
      setPhase(student.absent ? 'absent' : 'result');
    }, 1700 + Math.random() * 600);
  };

  const confirm = () => {
    if (!found) return;
    const action = PHASE_INFO[found.scanCount];
    setStudents(prev => prev.map(s => s.id === found.id ? { ...s, scanCount: s.scanCount + 1 } : s));
    setLog(prev => [{
      id: Date.now(), photo: found.photo, name: found.name,
      action: action.label, icon: action.icon, color: action.color,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }, ...prev]);
    setPhase('confirmed');
  };

  const reset = () => { setFound(null); setPhase('idle'); };

  useEffect(() => () => clearTimeout(timer.current), []);

  const action = found && !found.absent && found.scanCount < 4 ? PHASE_INFO[found.scanCount] : null;
  const progressPct = totalMax > 0 ? (totalDone / totalMax) * 100 : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ backgroundColor: C.navyMid, borderBottomWidth: 1, borderBottomColor: C.border, padding: 14, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.white }}>QR Scanner</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{CLEANER_DEFAULT.name} · {CLEANER_DEFAULT.bus.number}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: C.gold }}>{totalDone}<Text style={{ fontSize: 13, color: C.muted, fontWeight: '400' }}>/{totalMax}</Text></Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>scans today</Text>
          </View>
        </View>

        <View style={{ marginTop: 10, height: 6, backgroundColor: '#213D62', borderRadius: 99, overflow: 'hidden' }}>
          <LinearGradient colors={[C.teal, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${progressPct}%`, borderRadius: 99 }} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 2 }}>
            {PHASE_INFO.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: p.color + '12', borderWidth: 1, borderColor: p.color + '30', borderRadius: 50, paddingVertical: 3, paddingHorizontal: 9 }}>
                <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: p.color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: C.navy }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 10, color: p.color, fontWeight: '600' }}>{p.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {absentStudents.length > 0 && (
        <View style={{ backgroundColor: 'rgba(255,107,107,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,107,107,0.22)', padding: 7, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="alert" size={14} color={C.coral} />
          <Text style={{ color: C.coral, fontSize: 11, fontWeight: '600', flex: 1 }}>
            Absent today: {absentStudents.map(s => s.name).join(', ')} — skip their stops
          </Text>
        </View>
      )}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingTop: 20, paddingBottom: 0 }}>
        {(phase === 'idle' || phase === 'scanning') && (
          <>
            <View style={{ position: 'relative', width: 272, height: 272, borderRadius: 28, overflow: 'hidden', backgroundColor: '#050A12', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 22, alignItems: 'center', justifyContent: 'center' }}>
              {torch && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,240,170,0.08)', borderRadius: 28 }} />}
              <View style={{ position: 'absolute', top: 12, right: 14, opacity: 0.28 }}>
                <Icon name="cam" size={16} color="#fff" />
              </View>

              <View style={{ width: 180, height: 180, position: 'relative' }}>
                <View style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTopWidth: 3.5, borderLeftWidth: 3.5, borderColor: C.gold, borderTopLeftRadius: 6 }} />
                <View style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTopWidth: 3.5, borderRightWidth: 3.5, borderColor: C.gold, borderTopRightRadius: 6 }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottomWidth: 3.5, borderLeftWidth: 3.5, borderColor: C.gold, borderBottomLeftRadius: 6 }} />
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottomWidth: 3.5, borderRightWidth: 3.5, borderColor: C.gold, borderBottomRightRadius: 6 }} />

                {phase === 'scanning' && (
                  <View style={{ position: 'absolute', left: 0, right: 0, top: '45%', height: 2.5, backgroundColor: C.gold, shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 }} />
                )}

                {phase === 'idle' && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <View style={{ opacity: 0.16 }}>
                      <Icon name="qr" size={62} color="#fff" />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, textAlign: 'center' }}>Point at student's ID card</Text>
                  </View>
                )}
                {phase === 'scanning' && (
                  <View style={{ position: 'absolute', bottom: -30, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold }} />
                    <Text style={{ color: C.gold, fontSize: 12, fontWeight: '600' }}>Reading QR code…</Text>
                  </View>
                )}
              </View>
            </View>

            {pending.length > 0 && (
              <View style={{ backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '28', borderRadius: 14, padding: 10, paddingHorizontal: 16, marginBottom: 18, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.gold + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontSize: 16 }}>{PHASE_INFO[pending[0]?.scanCount ?? 0]?.icon}</Text>
                </View>
                <View>
                  <Text style={{ color: C.muted, fontSize: 11 }}>Next scan will register</Text>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: C.gold }}>{PHASE_INFO[pending[0]?.scanCount ?? 0]?.label} · {PHASE_INFO[pending[0]?.scanCount ?? 0]?.session}</Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity onPress={() => setTorch(t => !t)} style={{ width: 54, height: 54, borderRadius: 16, borderWidth: 1, borderColor: torch ? 'rgba(232,162,26,0.5)' : C.border, backgroundColor: torch ? 'rgba(232,162,26,0.18)' : C.card, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="flash" size={22} color={torch ? C.gold : C.muted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={startScan} disabled={phase === 'scanning'} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: phase === 'scanning' ? 0.6 : 1 }}>
                {phase === 'scanning'
                  ? <><ActivityIndicator size="small" color={C.navy} /><Text style={{ fontWeight: '700', fontSize: 16, color: C.navy }}>Scanning…</Text></>
                  : <><Icon name="qr" size={20} color={C.navy} /><Text style={{ fontWeight: '700', fontSize: 16, color: C.navy }}>Scan QR Code</Text></>}
              </TouchableOpacity>
            </View>
          </>
        )}

        {(phase === 'result' || phase === 'confirmed') && found && action && (
          <View style={{ width: '100%', maxWidth: 340, alignSelf: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: action.color, backgroundColor: action.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={28} color={action.color} />
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <IDCard student={found} nextScan={found.scanCount} isAbsent={false} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: action.color + '12', borderWidth: 1.5, borderColor: action.color + '40', borderRadius: 16, padding: 14, paddingHorizontal: 18, marginBottom: 16 }}>
              <Text style={{ fontSize: 28 }}>{action.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 15, color: action.color }}>{action.label}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{action.session} Route · {found.stop}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{action.desc}</Text>
              </View>
            </View>

            {phase === 'result' && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={reset} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                  <Icon name="x" size={16} color={C.white} />
                  <Text style={{ fontWeight: '700', fontSize: 15, color: C.white }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirm} style={{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 16, backgroundColor: C.gold }}>
                  <Icon name="check" size={16} color={C.navy} />
                  <Text style={{ fontWeight: '700', fontSize: 15, color: C.navy }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}

            {phase === 'confirmed' && (
              <TouchableOpacity onPress={reset} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 16, backgroundColor: 'rgba(52,211,153,0.14)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)', width: '100%' }}>
                <Icon name="qr" size={16} color="#34D399" />
                <Text style={{ fontWeight: '700', fontSize: 15, color: '#34D399' }}>Scan Next Student</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {phase === 'absent' && found && (
          <View style={{ width: '100%', maxWidth: 340, alignSelf: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: C.coral, backgroundColor: 'rgba(255,107,107,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="alert" size={28} color={C.coral} />
              </View>
            </View>
            <View style={{ marginBottom: 14 }}>
              <IDCard student={found} nextScan={0} isAbsent={true} />
            </View>
            <View style={{ backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1.5, borderColor: 'rgba(255,107,107,0.4)', borderRadius: 16, padding: 14, paddingHorizontal: 18, marginBottom: 16 }}>
              <Text style={{ color: C.coral, fontWeight: '800', fontSize: 15, marginBottom: 4 }}>❌ Student is Absent Today</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>Do not allow boarding — skip <Text style={{ color: C.white, fontWeight: '700' }}>{found.stop}</Text> stop and inform driver.</Text>
            </View>
            <TouchableOpacity onPress={reset} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 16, backgroundColor: C.coral, width: '100%' }}>
              <Icon name="check" size={16} color="#fff" />
              <Text style={{ fontWeight: '700', fontSize: 15, color: '#fff' }}>Noted — Skip Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'all_done' && (
          <View style={{ alignItems: 'center', padding: 10 }}>
            <Text style={{ fontSize: 52, marginBottom: 14 }}>✅</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', marginBottom: 8, color: C.white }}>All Scans Complete!</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24, textAlign: 'center' }}>Every student has been scanned for all 4 trips today</Text>
            <TouchableOpacity onPress={() => setPhase('idle')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 16, backgroundColor: C.gold, width: '100%' }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: C.navy }}>Back to Scanner</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {log.length > 0 && phase === 'idle' && (
        <View style={{ borderTopWidth: 1, borderTopColor: C.border, padding: 14, paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 10 }}>Recent Scans</Text>
          {log.slice(0, 5).map(l => (
            <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: l.color + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontWeight: '700', fontSize: 11, color: l.color }}>{l.photo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 12, color: C.white }}>{l.name}</Text>
                <Text style={{ color: l.color, fontSize: 11 }}>{l.icon} {l.action}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 11 }}>{l.time}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

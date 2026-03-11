import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme/colors';
import Icon from '../../components/Icon';
import DonutRing from '../../components/DonutRing';
import UnitDetail from '../../components/UnitDetail';
import { getFriendlyError } from '../../utils/errorMessages';
import { apiFetch } from '../../api/client';

const SUB_PALETTE = [C.gold, C.teal, C.purple, C.coral, '#34D399', '#60A5FA', '#F59E0B', '#EC4899'];
const subColor = (name, idx) => {
  const map = { maths: C.gold, math: C.gold, mathematics: C.gold, science: C.teal, english: C.purple, social: C.coral, 'social studies': C.coral, 'social science': C.coral, tamil: '#34D399', computer: '#60A5FA', 'computer science': '#60A5FA', hindi: '#F59E0B' };
  return map[(name || '').toLowerCase()] || SUB_PALETTE[idx % SUB_PALETTE.length];
};
const subShort = (name) => (name || '').slice(0, 4);

const BUS_DATA = [];

export default function AdminReports({ onBack }) {
  const [tab, setTab] = useState("attendance");
  const [marksView, setMarksView] = useState("classes");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openUnit, setOpenUnit] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [busTab, setBusTab] = useState("duration");
  const [classList, setClassList] = useState([]);
  const [schoolSubjectAvgs, setSchoolSubjectAvgs] = useState([]);
  const [classMarksData, setClassMarksData] = useState(null);
  const [studentMarksData, setStudentMarksData] = useState(null);
  const [marksLoading, setMarksLoading] = useState(false);
  const [classAttData, setClassAttData] = useState([]);
  const [attLoading, setAttLoading] = useState(true);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    apiFetch('/classes?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.classes)) {
          const mapped = data.classes.map(c => ({ id: c.id, name: 'Grade ' + c.name, studentCount: c.studentCount || 0 }));
          console.log('CLASSES loaded for selector:', mapped);
          setClassList(mapped);
        }
      })
      .catch(() => {});
    apiFetch('/attendance/class-summary')
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.classes)) setClassAttData(d.classes); })
      .catch(() => {})
      .finally(() => setAttLoading(false));
    apiFetch('/marks/summary')
      .then(r => r.json())
      .then(d => {
        console.log('STEP 1 - marks summary response success:', d.success, 'subjects:', d.subjects?.length);
        console.log('STEP 3 - Raw marks summary data:', JSON.stringify(d.subjects));
        console.log('STEP 5 - Computed averages:', d.subjects?.map(s => s.subject + '=' + s.pct + '%'));
        if (d.success) setSchoolSubjectAvgs(d.subjects);
      })
      .catch(e => console.error('Marks summary fetch error:', getFriendlyError(e, 'Could not load marks summary')));
  }, []);

  useEffect(() => {
    if (!selectedClass || marksView !== 'classDetail') return;
    setMarksLoading(true);
    setClassMarksData(null);
    setStudentMarksData(null);
    apiFetch(`/marks/class/${selectedClass.id}`)
      .then(r => r.json())
      .then(d => {
        console.log('STEP 2 - Class marks query: /api/marks/class/' + selectedClass.id);
        console.log('STEP 3 - Raw class marks data:', d.total, 'records,', d.students?.length, 'students');
        console.log('STEP 4 - Students data:', d.students?.map(s => s.name + ':' + s.overallPct + '%'));
        if (d.success) setClassMarksData(d);
      })
      .catch(e => console.error('Class marks fetch error:', getFriendlyError(e, 'Could not load class marks')))
      .finally(() => setMarksLoading(false));
  }, [selectedClass, marksView]);

  useEffect(() => {
    if (!selectedStudent) return;
    setStudentMarksData(null);
    apiFetch(`/marks/student/${selectedStudent.studentId}`)
      .then(r => r.json())
      .then(d => {
        console.log('STEP 3 - Student marks raw:', d.total, 'records, byExam:', d.byExam?.length, 'bySubject:', d.bySubject?.length);
        if (d.success) setStudentMarksData(d);
      })
      .catch(e => console.error('Student marks fetch error:', getFriendlyError(e, 'Could not load student marks')));
  }, [selectedStudent]);

  if (selectedStudent && openUnit && studentMarksData) {
    const examData = studentMarksData.byExam.find(e => e.examType === openUnit);
    if (examData) {
      const unitObj = {
        id: examData.examType, label: examData.examType, date: '',
        subjects: examData.subjects.map((s, i) => ({ name: s.subject, short: subShort(s.subject), color: subColor(s.subject, i), marks: s.marks })),
        total: examData.maxTotal,
      };
      return <UnitDetail unit={unitObj} onBack={() => setOpenUnit(null)} />;
    }
  }

  if (selectedStudent) {
    const smd = studentMarksData;
    const overallPct = smd?.overallPct ?? 0;
    const byExam = smd?.byExam ?? [];
    const bySubject = smd?.bySubject ?? [];
    const bestExamIdx = byExam.length ? byExam.reduce((bi, e, i, arr) => e.pct > arr[bi].pct ? i : bi, 0) : 0;
    const bestSubject = bySubject.length ? bySubject.reduce((a, b) => a.pct > b.pct ? a : b) : null;

    return (
      <ScrollView style={{ flex:1, backgroundColor:C.navy }}>
        <View style={st.pageHeader}>
          <TouchableOpacity style={st.backBtn} onPress={() => setSelectedStudent(null)}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontWeight:'700', fontSize:18, color:C.white }}>{selectedStudent.name}</Text>
            <Text style={{ color:C.muted, fontSize:12 }}>{selectedClass?.name} {'·'} Roll #{selectedStudent.rollNumber}</Text>
          </View>
        </View>

        {!smd ? (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 60 }} />
        ) : (
          <View style={{ paddingHorizontal:20, paddingBottom:20 }}>
            <LinearGradient colors={[C.gold+'22', C.navyMid]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ borderWidth:1, borderColor:C.gold+'44', borderRadius:22, padding:18, marginBottom:16 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:16, marginBottom:14 }}>
                <DonutRing pct={overallPct} color={C.gold} size={82} stroke={9} label={`${overallPct}%`} sublabel="Overall" />
                <View style={{ flex:1 }}>
                  <Text style={{ color:C.muted, fontSize:12, marginBottom:4 }}>Cumulative Average</Text>
                  <Text style={{ fontSize:36, fontWeight:'900', color:C.gold, lineHeight:38 }}>
                    {overallPct}<Text style={{ fontSize:12, color:C.muted, fontWeight:'400' }}>%</Text>
                  </Text>
                  <Text style={{ color:C.muted, fontSize:12, marginTop:6 }}>
                    {byExam.length} Exam{byExam.length !== 1 ? 's' : ''} {'·'} {bySubject.length} Subject{bySubject.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                {[
                  { label:'Best Exam', val: byExam[bestExamIdx]?.examType || '—', color:C.teal },
                  { label:'Best Subject', val: bestSubject ? subShort(bestSubject.subject) : '—', color:'#34D399' },
                  { label:'Total Exams', val: String(byExam.length), color:C.purple },
                ].map(m => (
                  <View key={m.label} style={{ flex:1, minWidth:'30%', alignItems:'center', paddingVertical:8, paddingHorizontal:4, backgroundColor:C.navy+'88', borderRadius:10 }}>
                    <Text style={{ fontWeight:'700', fontSize:14, color:m.color }}>{m.val}</Text>
                    <Text style={{ fontSize:10, color:C.muted, marginTop:2 }}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {byExam.length > 0 && (
              <>
                <View style={st.secHead}><Text style={st.secTitle}>Exam Units</Text><Text style={{ fontSize:12, color:C.muted }}>Tap for details</Text></View>
                {byExam.map((unit, ui) => {
                  const trend = ui > 0 ? unit.pct - byExam[ui-1].pct : null;
                  return (
                    <TouchableOpacity key={unit.examType} onPress={() => setOpenUnit(unit.examType)} style={[st.card, { marginBottom:12 }]}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
                        <DonutRing pct={unit.pct} color={unit.pct>=75?C.teal:C.gold} size={56} stroke={7} label={`${unit.pct}%`} />
                        <View style={{ flex:1 }}>
                          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                            <Text style={{ fontWeight:'700', fontSize:15, color:C.white }}>{unit.examType}</Text>
                            {trend !== null && (
                              <View style={[st.chip, trend>=0?st.chipGreen:st.chipCoral]}>
                                <Text style={{ fontSize:11, fontWeight:'600', color:trend>=0?'#34D399':C.coral }}>{trend>=0?'\u25B2':'\u25BC'} {Math.abs(trend)}</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection:'row', gap:12, marginTop:4 }}>
                            <Text style={{ fontSize:12, color:C.muted }}><Text style={{ fontWeight:'700', color:C.white }}>{unit.total}</Text>/{unit.maxTotal}</Text>
                            <Text style={{ fontSize:12, color:C.muted }}>Avg: <Text style={{ fontWeight:'700', color:C.gold }}>{unit.avg}/20</Text></Text>
                          </View>
                          <View style={{ flexDirection:'row', gap:3, marginTop:6 }}>
                            {unit.subjects.map((s, si) => (
                              <View key={si} style={{ flex:1, height:4, borderRadius:2, backgroundColor:subColor(s.subject, si), opacity:0.8 }} />
                            ))}
                          </View>
                        </View>
                        <Icon name="arrow" size={16} color={C.muted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {bySubject.length > 0 && (
              <>
                <View style={[st.secHead, { marginTop:4 }]}><Text style={st.secTitle}>Subject Averages</Text></View>
                <View style={[st.card, st.cardSm]}>
                  {bySubject.map((s, i) => {
                    const col = subColor(s.subject, i);
                    return (
                      <View key={i} style={{ paddingBottom:i<bySubject.length-1?12:0, marginBottom:i<bySubject.length-1?12:0, borderBottomWidth:i<bySubject.length-1?1:0, borderBottomColor:C.border }}>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:6 }}>
                          <View style={{ width:30, height:30, borderRadius:9, backgroundColor:col+'22', alignItems:'center', justifyContent:'center' }}>
                            <Text style={{ fontSize:10, fontWeight:'800', color:col }}>{subShort(s.subject)[0]}</Text>
                          </View>
                          <Text style={{ flex:1, fontSize:13, fontWeight:'600', color:C.white }}>{s.subject}</Text>
                          <Text style={{ fontSize:15, fontWeight:'800', color:col }}>{s.avg}<Text style={{ fontSize:10, color:C.muted, fontWeight:'400' }}>/20</Text></Text>
                        </View>
                        <View style={st.progressTrack}><View style={[st.progressFill, { width:s.pct+'%', backgroundColor:col }]} /></View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {smd.total === 0 && (
              <View style={{ alignItems:'center', marginTop:40 }}>
                <Text style={{ fontSize:40, marginBottom:12 }}>{'📋'}</Text>
                <Text style={{ color:C.muted, fontSize:14, textAlign:'center' }}>No marks recorded for this student yet.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  if (selectedClass && marksView === "classDetail") {
    const cmd = classMarksData;
    const students = cmd?.students ?? [];
    const classAvgBySubject = cmd?.classAvgBySubject ?? [];
    const classAvgByExam = cmd?.classAvgByExam ?? [];
    const classOverallPct = cmd?.classOverallPct ?? 0;
    const topper = students[0] ?? null;
    const lowest = students[students.length - 1] ?? null;

    const clsTab = selectedUnit.startsWith("tab:") ? selectedUnit.replace("tab:","") : "overview";
    const setClsTab = t => setSelectedUnit("tab:" + t);

    return (
      <ScrollView style={{ flex:1, backgroundColor:C.navy }}>
        <View style={st.pageHeader}>
          <TouchableOpacity style={st.backBtn} onPress={() => { setMarksView("classes"); setSelectedClass(null); setSelectedUnit("all"); setExpandedUnit(null); }}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontWeight:'700', fontSize:18, color:C.white }}>{selectedClass.name}</Text>
            <Text style={{ color:C.muted, fontSize:12 }}>Marks Report {'·'} {marksLoading ? '...' : students.length + ' Students'}</Text>
          </View>
        </View>

        {marksLoading ? (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 80 }} />
        ) : cmd ? (
          <View style={{ paddingHorizontal:20, paddingBottom:20 }}>
            <LinearGradient colors={[C.purple+'22', C.navyMid]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ borderWidth:1, borderColor:C.purple+'44', borderRadius:22, padding:18, marginBottom:16 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:16, marginBottom:14 }}>
                <DonutRing pct={classOverallPct} color={C.purple} size={78} stroke={9} label={`${classOverallPct}%`} sublabel="Class Avg" />
                <View style={{ flex:1 }}>
                  <Text style={{ color:C.muted, fontSize:12, marginBottom:3 }}>Overall Class Average</Text>
                  <Text style={{ fontSize:34, fontWeight:'900', color:C.purple, lineHeight:36 }}>
                    {classOverallPct}<Text style={{ fontSize:12, color:C.muted, fontWeight:'400' }}>%</Text>
                  </Text>
                  <Text style={{ color:C.muted, fontSize:11, marginTop:5 }}>
                    {'\uD83C\uDFC6'} Topper: <Text style={{ fontWeight:'700', color:'#22d38a' }}>{topper?.name?.split(' ')[0] || '—'}</Text>{topper ? ` · ${topper.overallPct}%` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                {[
                  { val:`${topper?.overallPct ?? 0}%`, lbl:'Highest', color:'#22d38a' },
                  { val:`${lowest?.overallPct ?? 0}%`, lbl:'Lowest', color:C.coral },
                  { val:students.length, lbl:'Students', color:C.teal },
                  { val:students.filter(s=>s.overallPct>=75).length, lbl:'≥75%', color:C.gold },
                ].map(m => (
                  <View key={m.lbl} style={{ width:'22%', alignItems:'center', paddingVertical:8, paddingHorizontal:4, backgroundColor:C.navy+'88', borderRadius:10 }}>
                    <Text style={{ fontWeight:'800', fontSize:15, color:m.color }}>{m.val}</Text>
                    <Text style={{ fontSize:9, color:C.muted, marginTop:2 }}>{m.lbl}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            <View style={[st.toggleWrap, { marginBottom:16 }]}>
              {[["overview","\uD83D\uDCCA Overview"],["examwise","\uD83D\uDCDD Exam-wise"],["students","\uD83D\uDC68\u200D\uD83C\uDF93 Students"]].map(([id,lbl]) => (
                <TouchableOpacity key={id} style={[st.toggleBtn, clsTab===id && st.toggleBtnActive]} onPress={() => setClsTab(id)}>
                  <Text style={clsTab===id ? st.toggleBtnTextActive : st.toggleBtnText}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {clsTab === "overview" && (
              <View>
                {classAvgByExam.length > 0 && (
                  <>
                    <View style={st.secHead}><Text style={st.secTitle}>Exam-wise Class Average</Text></View>
                    <View style={[st.card, st.cardSm, { marginBottom:16 }]}>
                      <View style={{ flexDirection:'row', alignItems:'flex-end', gap:10, height:100 }}>
                        {classAvgByExam.map((u,i) => (
                          <View key={i} style={{ flex:1, alignItems:'center', gap:6 }}>
                            <Text style={{ fontSize:10, color:C.purple, fontWeight:'700' }}>{u.pct}%</Text>
                            <LinearGradient colors={[C.purple, C.teal]} style={{ width:'100%', height:Math.max(Math.min(u.pct, 74), 4), borderTopLeftRadius:8, borderTopRightRadius:8, opacity:0.85 }} />
                            <Text style={{ fontSize:9, color:C.muted, textAlign:'center' }}>{u.examType.replace('Unit ','U')}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {classAvgBySubject.length > 0 && (
                  <>
                    <View style={st.secHead}><Text style={st.secTitle}>Subject-wise Class Average</Text></View>
                    <View style={[st.card, st.cardSm, { marginBottom:16 }]}>
                      {classAvgBySubject.map((s,i) => {
                        const col = subColor(s.subject, i);
                        return (
                          <View key={i} style={{ paddingBottom:i<classAvgBySubject.length-1?12:0, marginBottom:i<classAvgBySubject.length-1?12:0, borderBottomWidth:i<classAvgBySubject.length-1?1:0, borderBottomColor:C.border }}>
                            <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:5 }}>
                              <View style={{ width:32, height:32, borderRadius:9, backgroundColor:col+'22', alignItems:'center', justifyContent:'center' }}>
                                <Text style={{ fontSize:10, fontWeight:'800', color:col }}>{subShort(s.subject)[0]}</Text>
                              </View>
                              <Text style={{ flex:1, fontSize:13, fontWeight:'600', color:C.white }}>{s.subject}</Text>
                              <Text style={{ fontSize:15, fontWeight:'800', color:col }}>{s.pct}<Text style={{ fontSize:10, color:C.muted, fontWeight:'400' }}>%</Text></Text>
                            </View>
                            <View style={st.progressTrack}><View style={[st.progressFill, { width:s.pct+'%', backgroundColor:col }]} /></View>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}

                {classAvgBySubject.length === 0 && classAvgByExam.length === 0 && (
                  <View style={{ alignItems:'center', marginTop:30, marginBottom:30 }}>
                    <Text style={{ fontSize:36, marginBottom:10 }}>{'📋'}</Text>
                    <Text style={{ color:C.muted, fontSize:13, textAlign:'center' }}>No marks data yet for this class.</Text>
                  </View>
                )}
              </View>
            )}

            {clsTab === "examwise" && (
              <View>
                <Text style={{ color:C.muted, fontSize:12, marginBottom:14 }}>Tap any exam to see subject breakdown and top performers.</Text>
                {classAvgByExam.map((u,ui) => {
                  const isOpen = expandedUnit === ui;
                  const trend = ui>0 ? u.pct - classAvgByExam[ui-1].pct : null;
                  const avgColor = u.pct>=75?'#22d38a':u.pct>=60?C.gold:C.coral;
                  const examStudents = students.map(s => {
                    const ex = s.byExam.find(e => e.examType === u.examType);
                    return { ...s, examPct: ex?.pct ?? 0, examSubjects: ex?.subjects ?? [] };
                  }).sort((a,b) => b.examPct - a.examPct);
                  const subjectsForExam = (() => {
                    const subMap = {};
                    examStudents.forEach(s => s.examSubjects.forEach(sub => { if (!subMap[sub.subject]) subMap[sub.subject] = []; subMap[sub.subject].push(sub.marks); }));
                    return Object.entries(subMap).map(([subject, vals], i) => ({
                      subject, color: subColor(subject, i),
                      classAvg: Math.round(vals.reduce((a,b)=>a+b,0)/vals.length),
                      highest: Math.max(...vals), lowest: Math.min(...vals),
                    })).sort((a,b)=>a.subject.localeCompare(b.subject));
                  })();
                  return (
                    <View key={ui} style={{ marginBottom:12 }}>
                      <TouchableOpacity style={[st.card, { borderLeftWidth:3, borderLeftColor:C.purple }]} onPress={() => setExpandedUnit(isOpen ? null : ui)}>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
                          <DonutRing pct={u.pct} color={avgColor} size={58} stroke={7} label={`${u.pct}%`} />
                          <View style={{ flex:1 }}>
                            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                              <Text style={{ fontWeight:'700', fontSize:16, color:C.white }}>{u.examType}</Text>
                              {trend !== null && (
                                <View style={[st.chip, trend>=0?st.chipGreen:st.chipCoral]}>
                                  <Text style={{ fontSize:11, fontWeight:'600', color:trend>=0?'#34D399':C.coral }}>{trend>=0?'\u25B2':'\u25BC'} {Math.abs(trend)}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize:11, color:C.muted }}>{examStudents.length} students{subjectsForExam.length > 0 ? ` · ${subjectsForExam.length} subjects` : ''}</Text>
                          </View>
                          <Text style={{ fontSize:16, color:C.muted }}>{isOpen ? '\u25BC' : '\u25B6'}</Text>
                        </View>
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={{ backgroundColor:C.navyMid, borderBottomLeftRadius:16, borderBottomRightRadius:16, paddingHorizontal:14, paddingBottom:14, marginTop:-4, borderWidth:1, borderColor:C.border, borderTopWidth:0 }}>
                          {subjectsForExam.length > 0 && (
                            <>
                              <Text style={{ fontWeight:'700', fontSize:13, color:C.white, paddingTop:14, marginBottom:10 }}>{'\uD83D\uDCDA'} Subject-wise Avg</Text>
                              {subjectsForExam.map((s,si) => (
                                <View key={si} style={{ marginBottom:10 }}>
                                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:5 }}>
                                    <View style={{ width:28, height:28, borderRadius:8, backgroundColor:s.color+'22', alignItems:'center', justifyContent:'center' }}>
                                      <Text style={{ fontSize:9, fontWeight:'800', color:s.color }}>{subShort(s.subject)[0]}</Text>
                                    </View>
                                    <Text style={{ flex:1, fontSize:12, fontWeight:'600', color:C.white }}>{s.subject}</Text>
                                    <Text style={{ fontSize:13, fontWeight:'800', color:s.color }}>{s.classAvg}/20</Text>
                                    <Text style={{ fontSize:10, color:'#22d38a', marginLeft:4 }}>{'\u25B2'}{s.highest}</Text>
                                    <Text style={{ fontSize:10, color:C.coral }}>{'\u25BC'}{s.lowest}</Text>
                                  </View>
                                  <View style={[st.progressTrack, { height:5 }]}><View style={[st.progressFill, { width:(s.classAvg/20*100)+'%', backgroundColor:s.color, height:5 }]} /></View>
                                </View>
                              ))}
                            </>
                          )}
                          <Text style={{ fontWeight:'700', fontSize:13, color:C.white, marginTop:14, marginBottom:10 }}>{'\uD83C\uDFC6'} Top Performers</Text>
                          {examStudents.slice(0,5).map((s,ri) => (
                            <TouchableOpacity key={s.studentId} onPress={() => setSelectedStudent(s)} style={{
                              flexDirection:'row', alignItems:'center', gap:10, paddingVertical:8, paddingHorizontal:10,
                              backgroundColor:ri===0?C.gold+'18':ri===1?'#aaa2':ri===2?C.coral+'12':C.navy+'66',
                              borderRadius:10, marginBottom:6,
                            }}>
                              <Text style={{ fontSize:12, fontWeight:'800', width:22, color:ri===0?C.gold:ri===1?'#bbb':ri===2?C.coral:C.muted }}>#{ri+1}</Text>
                              <View style={{ width:32, height:32, borderRadius:10, backgroundColor:C.teal+'66', alignItems:'center', justifyContent:'center' }}>
                                <Text style={{ fontSize:10, fontWeight:'800', color:C.white }}>{s.name[0]}</Text>
                              </View>
                              <View style={{ flex:1 }}>
                                <Text style={{ fontWeight:'700', fontSize:12, color:C.white }}>{s.name}</Text>
                                <Text style={{ fontSize:10, color:C.muted }}>Roll #{s.rollNumber}</Text>
                              </View>
                              <Text style={{ fontSize:16, fontWeight:'800', color:s.examPct>=75?'#22d38a':s.examPct>=60?C.gold:C.coral }}>{s.examPct}%</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                {classAvgByExam.length === 0 && (
                  <View style={{ alignItems:'center', marginTop:20 }}>
                    <Text style={{ color:C.muted, fontSize:13, textAlign:'center' }}>No exam data available for this class.</Text>
                  </View>
                )}
              </View>
            )}

            {clsTab === "students" && (
              <View>
                <Text style={{ color:C.muted, fontSize:12, marginBottom:14 }}>
                  {students.length} student{students.length!==1?'s':''} {'·'} Ranked by overall marks. Tap to view full profile.
                </Text>
                <View style={{ flexDirection:'row', gap:8, marginBottom:16 }}>
                  {[
                    { val:`${topper?.overallPct ?? 0}%`, lbl:'Class Topper', color:'#22d38a' },
                    { val:students.filter(s=>s.overallPct>=75).length, lbl:'Passed (≥75%)', color:C.teal },
                    { val:students.filter(s=>s.overallPct<75).length, lbl:'Need Help (<75%)', color:C.coral },
                  ].map(s => (
                    <View key={s.lbl} style={st.metricCard}>
                      <Text style={{ fontWeight:'800', fontSize:18, color:s.color }}>{s.val}</Text>
                      <Text style={{ fontSize:10, color:C.muted, marginTop:4, textAlign:'center' }}>{s.lbl}</Text>
                    </View>
                  ))}
                </View>
                {students.map((s,i) => (
                  <TouchableOpacity key={s.studentId} style={[st.studentRow]} onPress={() => setSelectedStudent(s)}>
                    <View style={{ width:30, height:30, borderRadius:9, alignItems:'center', justifyContent:'center',
                      backgroundColor:i===0?C.gold+'33':i===1?'#aaa3':i===2?C.coral+'22':C.navyMid }}>
                      <Text style={{ fontSize:11, fontWeight:'800', color:i===0?C.gold:i===1?'#bbb':i===2?C.coral:C.muted }}>#{i+1}</Text>
                    </View>
                    <View style={{ width:40, height:40, borderRadius:12, backgroundColor:C.teal+'66', alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:13, fontWeight:'800', color:C.white }}>{s.name[0]}</Text>
                    </View>
                    <View style={{ flex:1, minWidth:0 }}>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                        <Text style={{ fontWeight:'700', fontSize:13, color:C.white }}>{s.name}</Text>
                        <Text style={{ fontSize:16, fontWeight:'800', color:s.overallPct>=75?'#22d38a':s.overallPct>=60?C.gold:C.coral, marginLeft:8 }}>{s.overallPct}%</Text>
                      </View>
                      <Text style={{ fontSize:10, color:C.muted, marginBottom:5 }}>Roll #{s.rollNumber} {'·'} {s.byExam.length} exam{s.byExam.length!==1?'s':''}</Text>
                      <View style={{ flexDirection:'row', gap:3 }}>
                        {s.bySubject.slice(0,6).map((sub,si) => (
                          <View key={si} style={{ flex:1, height:4, borderRadius:2, backgroundColor:subColor(sub.subject,si), opacity:0.8 }} />
                        ))}
                      </View>
                    </View>
                    <Icon name="arrow" size={14} color={C.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{ alignItems:'center', marginTop:60 }}>
            <Text style={{ fontSize:36, marginBottom:12 }}>{'📋'}</Text>
            <Text style={{ color:C.muted, fontSize:14, textAlign:'center', paddingHorizontal:30 }}>No marks data available for {selectedClass.name}.\nImport student marks via CSV first.</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  if (tab === "bus" && selectedBus) {
    const b = selectedBus;
    const maxDur = Math.max(...b.daily.map(d => Math.max(d.morning, d.evening)));
    const delayDays = b.daily.filter(d => d.delay > 0).length;
    const onTimeDays = b.daily.filter(d => d.delay === 0).length;
    const avgDelay = b.daily.filter(d=>d.delay>0).reduce((s,d)=>s+d.delay,0) / (delayDays||1);
    const statusColor = s => s==="On Time"?"#22d38a":s==="Slight Delay"?C.gold:C.coral;

    return (
      <ScrollView style={{ flex:1, backgroundColor:C.navy }}>
        <View style={st.pageHeader}>
          <TouchableOpacity style={st.backBtn} onPress={() => setSelectedBus(null)}>
            <Icon name="back" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex:1 }}>
            <Text style={{ fontWeight:'700', fontSize:18, color:C.white }}>{b.bus} {'·'} {b.route}</Text>
            <Text style={{ color:C.muted, fontSize:12 }}>{b.vehicle}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal:20, paddingBottom:20 }}>
          <LinearGradient colors={[C.coral+'18', C.navyMid]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ borderWidth:1, borderColor:C.coral+'44', borderRadius:22, padding:18, marginBottom:16 }}>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:14 }}>
              {[
                { val:`${b.students}`, lbl:"Students", color:C.teal, icon:"\uD83D\uDC68\u200D\uD83C\uDF93" },
                { val:`${b.capacity}`, lbl:"Bus Capacity", color:C.muted, icon:"\uD83D\uDE8C" },
                { val:`${b.compliance}%`, lbl:"Compliance", color:b.compliance>=95?"#22d38a":b.compliance>=90?C.teal:C.gold, icon:"\u2705" },
                { val:`${b.onTimeRate}%`, lbl:"On-Time Rate", color:b.onTimeRate>=90?"#22d38a":C.gold, icon:"\u23F1\uFE0F" },
              ].map(s => (
                <View key={s.lbl} style={{ width:'47%', flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, paddingHorizontal:12, backgroundColor:C.navy+'88', borderRadius:12 }}>
                  <Text style={{ fontSize:20 }}>{s.icon}</Text>
                  <View>
                    <Text style={{ fontSize:18, fontWeight:'800', color:s.color, lineHeight:20 }}>{s.val}</Text>
                    <Text style={{ fontSize:10, color:C.muted, marginTop:2 }}>{s.lbl}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ marginBottom:6 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                <Text style={{ fontSize:11, color:C.muted }}>Bus Occupancy</Text>
                <Text style={{ fontSize:11, fontWeight:'700', color:C.teal }}>{Math.round(b.students/b.capacity*100)}%</Text>
              </View>
              <View style={st.progressTrack}><View style={[st.progressFill, { width:`${Math.round(b.students/b.capacity*100)}%`, backgroundColor:C.teal }]} /></View>
            </View>
          </LinearGradient>

          <View style={[st.toggleWrap, { marginBottom:16 }]}>
            {[["duration","\u23F1\uFE0F Duration"],["driver","\uD83E\uDDD1\u200D\u2708\uFE0F Driver"],["students","\uD83D\uDC68\u200D\uD83C\uDF93 Students"]].map(([id,lbl]) => (
              <TouchableOpacity key={id} style={[st.toggleBtn, busTab===id && st.toggleBtnActive]} onPress={() => setBusTab(id)}>
                <Text style={busTab===id ? st.toggleBtnTextActive : st.toggleBtnText}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {busTab === "duration" && (
            <View>
              <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
                {[
                  { val:onTimeDays, lbl:"On Time", color:"#22d38a" },
                  { val:delayDays, lbl:"Delayed", color:C.coral },
                  { val:`${Math.round(avgDelay)}m`, lbl:"Avg Delay", color:C.gold },
                ].map(s => (
                  <View key={s.lbl} style={st.metricCard}>
                    <Text style={{ fontWeight:'800', fontSize:20, color:s.color }}>{s.val}</Text>
                    <Text style={{ fontSize:11, color:C.muted, marginTop:4 }}>{s.lbl}</Text>
                  </View>
                ))}
              </View>

              <View style={st.secHead}><Text style={st.secTitle}>Morning vs Evening Duration (min)</Text></View>
              <View style={[st.card, st.cardSm, { marginBottom:16 }]}>
                <View style={{ flexDirection:'row', alignItems:'flex-end', gap:6, height:100, marginBottom:10 }}>
                  {b.daily.map((d,i) => (
                    <View key={i} style={{ flex:1, alignItems:'center', justifyContent:'flex-end', height:80, gap:1 }}>
                      <View style={{ width:'45%', backgroundColor:C.teal+'cc', borderTopLeftRadius:3, borderTopRightRadius:3,
                        height:Math.max((d.morning/maxDur)*72, 4) }} />
                      <View style={{ width:'45%', backgroundColor:C.gold+'cc', borderTopLeftRadius:3, borderTopRightRadius:3,
                        height:Math.max((d.evening/maxDur)*72, 4) }} />
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection:'row', gap:6 }}>
                  {b.daily.map((d,i) => (
                    <View key={i} style={{ flex:1, alignItems:'center' }}>
                      <Text style={{ fontSize:8, color:C.muted }}>{d.day.split(" ")[0].slice(0,3)}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <View style={{ width:12, height:12, borderRadius:3, backgroundColor:C.teal+'cc' }} />
                    <Text style={{ fontSize:11, color:C.muted }}>Morning (avg {b.avgMorning} min)</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <View style={{ width:12, height:12, borderRadius:3, backgroundColor:C.gold+'cc' }} />
                    <Text style={{ fontSize:11, color:C.muted }}>Evening (avg {b.avgEvening} min)</Text>
                  </View>
                </View>
              </View>

              <View style={st.secHead}><Text style={st.secTitle}>Daily Log</Text></View>
              {b.daily.map((d,i) => (
                <View key={i} style={[st.card, st.cardSm, { marginBottom:10 }]}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <Text style={{ fontWeight:'700', fontSize:13, color:C.white }}>{d.day}</Text>
                    <View style={{ paddingVertical:3, paddingHorizontal:10, borderRadius:20, backgroundColor:statusColor(d.status)+'22', borderWidth:1, borderColor:statusColor(d.status)+'44' }}>
                      <Text style={{ fontSize:10, fontWeight:'700', color:statusColor(d.status) }}>{d.status}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                    {[
                      { ic:"\uD83C\uDF05", lbl:"Morning", val:`${d.morning} min`, color:C.teal },
                      { ic:"\uD83C\uDF06", lbl:"Evening", val:`${d.evening} min`, color:C.gold },
                      { ic:"\u26A0\uFE0F", lbl:"Delay", val:d.delay>0?`${d.delay} min`:"None", color:d.delay>0?C.coral:"#22d38a" },
                      { ic:"\uD83D\uDC68\u200D\uD83C\uDF93", lbl:"Students", val:d.students, color:C.purple },
                    ].map(s => (
                      <View key={s.lbl} style={{ width:'22%', alignItems:'center', paddingVertical:8, paddingHorizontal:4, backgroundColor:C.navyMid, borderRadius:10 }}>
                        <Text style={{ fontSize:14, marginBottom:3 }}>{s.ic}</Text>
                        <Text style={{ fontSize:13, fontWeight:'800', color:s.color }}>{s.val}</Text>
                        <Text style={{ fontSize:9, color:C.muted, marginTop:2 }}>{s.lbl}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <View style={st.secHead}><Text style={st.secTitle}>Route Stops</Text></View>
              <View style={[st.card, st.cardSm]}>
                {b.stops.map((stop, i) => (
                  <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:12, paddingBottom:i<b.stops.length-1?12:0, marginBottom:i<b.stops.length-1?12:0, borderBottomWidth:i<b.stops.length-1?1:0, borderBottomColor:C.border }}>
                    <View style={{ alignItems:'center' }}>
                      <View style={{ width:12, height:12, borderRadius:6, backgroundColor:i===b.stops.length-1?C.gold:i===0?"#22d38a":C.teal }} />
                      {i<b.stops.length-1 && <View style={{ width:2, height:20, backgroundColor:C.border, marginTop:2 }} />}
                    </View>
                    <View>
                      <Text style={{ fontSize:13, fontWeight:'600', color:i===b.stops.length-1?C.gold:C.white }}>{stop}</Text>
                      {i===0 && <Text style={{ fontSize:10, color:C.muted, marginTop:1 }}>First pickup {'—'} ~7:10 AM</Text>}
                      {i===b.stops.length-1 && <Text style={{ fontSize:10, color:C.muted, marginTop:1 }}>Destination {'·'} ~8:00 AM</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {busTab === "driver" && (
            <View>
              <View style={st.secHead}><Text style={st.secTitle}>Driver Details</Text></View>
              <View style={[st.card, st.cardSm, { marginBottom:16 }]}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:14, marginBottom:16 }}>
                  <LinearGradient colors={[C.teal+'44', C.teal+'22']} style={{ width:56, height:56, borderRadius:18, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.teal+'44' }}>
                    <Text style={{ fontSize:26 }}>{'\uD83E\uDDD1\u200D\u2708\uFE0F'}</Text>
                  </LinearGradient>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontWeight:'800', fontSize:16, color:C.white }}>{b.driver}</Text>
                    <Text style={{ color:C.muted, fontSize:12, marginTop:2 }}>Bus Driver {'·'} {b.bus}</Text>
                    <View style={[st.chip, st.chipGreen, { marginTop:6 }]}><Text style={{ fontSize:10, fontWeight:'600', color:'#34D399' }}>Active</Text></View>
                  </View>
                </View>
                {[
                  ["\uD83D\uDCDE","Phone",b.driverPhone],
                  ["\uD83D\uDE8C","Assigned Bus",`${b.bus} · ${b.vehicle}`],
                  ["\uD83D\uDEE3\uFE0F","Route",b.route],
                  ["\u23F3","Experience",b.driverExp],
                  ["\uD83D\uDCC5","Joined",b.driverJoined],
                  ["\uD83D\uDC68\u200D\uD83C\uDF93","Students on Board",`${b.students} students`],
                ].map(([ic,lbl,val],i,arr) => (
                  <View key={lbl} style={{ flexDirection:'row', alignItems:'center', gap:12, paddingBottom:i<arr.length-1?12:0, marginBottom:i<arr.length-1?12:0, borderBottomWidth:i<arr.length-1?1:0, borderBottomColor:C.border }}>
                    <View style={{ width:34, height:34, borderRadius:10, backgroundColor:C.navyMid, alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:16 }}>{ic}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:10, color:C.muted }}>{lbl}</Text>
                      <Text style={{ fontSize:13, fontWeight:'600', color:C.white, marginTop:1 }}>{val}</Text>
                    </View>
                  </View>
                ))}
                <View style={{ flexDirection:'row', gap:8, marginTop:14 }}>
                  <TouchableOpacity style={[st.btnTeal, { flex:1, paddingVertical:10, borderRadius:14, alignItems:'center' }]}>
                    <Text style={{ fontWeight:'600', color:C.white }}>{'\uD83D\uDCDE'} Call Driver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.btnOutline, { flex:1, paddingVertical:10, borderRadius:14, alignItems:'center' }]}>
                    <Text style={{ fontWeight:'600', color:C.white }}>{'\uD83D\uDCAC'} Message</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={st.secHead}><Text style={st.secTitle}>PET (Physical Education Teacher) Details</Text></View>
              <View style={[st.card, st.cardSm, { marginBottom:16 }]}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:14, marginBottom:16 }}>
                  <LinearGradient colors={[C.purple+'44', C.purple+'22']} style={{ width:56, height:56, borderRadius:18, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.purple+'44' }}>
                    <Text style={{ fontSize:26 }}>{'\uD83D\uDC64'}</Text>
                  </LinearGradient>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontWeight:'800', fontSize:16, color:C.white }}>{b.pet}</Text>
                    <Text style={{ color:C.muted, fontSize:12, marginTop:2 }}>Bus PET {'·'} {b.bus}</Text>
                    <View style={[st.chip, st.chipTeal, { marginTop:6 }]}><Text style={{ fontSize:10, fontWeight:'600', color:C.teal }}>On Duty</Text></View>
                  </View>
                </View>
                {[
                  ["\uD83D\uDCDE","Phone",b.petPhone],
                  ["\uD83D\uDE8C","Assigned Bus",b.bus],
                  ["\uD83D\uDEE3\uFE0F","Route",b.route],
                ].map(([ic,lbl,val],i,arr) => (
                  <View key={lbl} style={{ flexDirection:'row', alignItems:'center', gap:12, paddingBottom:i<arr.length-1?12:0, marginBottom:i<arr.length-1?12:0, borderBottomWidth:i<arr.length-1?1:0, borderBottomColor:C.border }}>
                    <View style={{ width:34, height:34, borderRadius:10, backgroundColor:C.navyMid, alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:16 }}>{ic}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:10, color:C.muted }}>{lbl}</Text>
                      <Text style={{ fontSize:13, fontWeight:'600', color:C.white, marginTop:1 }}>{val}</Text>
                    </View>
                  </View>
                ))}
                <View style={{ flexDirection:'row', gap:8, marginTop:14 }}>
                  <TouchableOpacity style={[st.btnTeal, { flex:1, paddingVertical:10, borderRadius:14, alignItems:'center' }]}>
                    <Text style={{ fontWeight:'600', color:C.white }}>{'\uD83D\uDCDE'} Call PET</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.btnOutline, { flex:1, paddingVertical:10, borderRadius:14, alignItems:'center' }]}>
                    <Text style={{ fontWeight:'600', color:C.white }}>{'\uD83D\uDCAC'} Message</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={st.secHead}><Text style={st.secTitle}>Driver Performance This Week</Text></View>
              <View style={[st.card, st.cardSm]}>
                {[
                  { lbl:"On-Time Rate", val:b.onTimeRate, color:b.onTimeRate>=90?"#22d38a":C.gold, suffix:"%" },
                  { lbl:"Pickup Compliance", val:b.compliance, color:b.compliance>=95?"#22d38a":C.teal, suffix:"%" },
                  { lbl:"Avg Morning (min)", val:b.avgMorning, color:C.teal, suffix:" min", pct:Math.round(b.avgMorning/60*100) },
                  { lbl:"Avg Evening (min)", val:b.avgEvening, color:C.gold, suffix:" min", pct:Math.round(b.avgEvening/60*100) },
                ].map((s,i,arr) => (
                  <View key={s.lbl} style={{ paddingBottom:i<arr.length-1?12:0, marginBottom:i<arr.length-1?12:0, borderBottomWidth:i<arr.length-1?1:0, borderBottomColor:C.border }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                      <Text style={{ fontSize:12, color:C.muted }}>{s.lbl}</Text>
                      <Text style={{ fontSize:14, fontWeight:'800', color:s.color }}>{s.val}{s.suffix}</Text>
                    </View>
                    <View style={st.progressTrack}><View style={[st.progressFill, { width:`${s.pct||s.val}%`, backgroundColor:s.color }]} /></View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {busTab === "students" && (
            <View>
              <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
                {[
                  { val:b.students, lbl:"On Bus", color:C.teal },
                  { val:b.capacity, lbl:"Capacity", color:C.muted },
                  { val:b.classes.length+" cls", lbl:"Classes", color:C.purple },
                ].map(s => (
                  <View key={s.lbl} style={st.metricCard}>
                    <Text style={{ fontWeight:'800', fontSize:20, color:s.color }}>{s.val}</Text>
                    <Text style={{ fontSize:11, color:C.muted, marginTop:4 }}>{s.lbl}</Text>
                  </View>
                ))}
              </View>

              <View style={[st.card, st.cardSm, { marginBottom:16 }]}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                  <Text style={{ fontWeight:'700', fontSize:13, color:C.white }}>Bus Occupancy</Text>
                  <Text style={{ color:C.teal, fontWeight:'800' }}>{b.students}/{b.capacity} seats</Text>
                </View>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:3, marginBottom:10 }}>
                  {Array.from({ length:b.capacity }).map((_,i) => (
                    <View key={i} style={{ width:10, height:10, borderRadius:3,
                      backgroundColor: i<b.students ? C.teal+'cc' : C.border,
                      opacity: i<b.students ? 1 : 0.4,
                    }} />
                  ))}
                </View>
                <View style={{ flexDirection:'row', gap:16 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}><View style={{ width:10, height:10, borderRadius:3, backgroundColor:C.teal+'cc' }} /><Text style={{ fontSize:11, color:C.muted }}>Occupied ({b.students})</Text></View>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}><View style={{ width:10, height:10, borderRadius:3, backgroundColor:C.border, opacity:0.4 }} /><Text style={{ fontSize:11, color:C.muted }}>Empty ({b.capacity-b.students})</Text></View>
                </View>
              </View>

              <View style={st.secHead}><Text style={st.secTitle}>Classes on this Bus</Text></View>
              {b.classes.map((cls) => (
                <View key={cls} style={[st.card, st.cardSm, { marginBottom:10 }]}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                    <View style={{ width:44, height:44, borderRadius:13, backgroundColor:C.purple+'22', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.purple+'44' }}>
                      <Text style={{ fontSize:14, fontWeight:'800', color:C.purple }}>{cls}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontWeight:'700', fontSize:14, color:C.white }}>Grade {cls}</Text>
                      <Text style={{ color:C.muted, fontSize:12, marginTop:2 }}>Students boarding this route</Text>
                    </View>
                    <View style={{ alignItems:'flex-end' }}>
                      <Text style={{ fontSize:18, fontWeight:'800', color:C.teal }}>{b.students > 0 ? Math.round(b.students / b.classes.length) : 0}</Text>
                      <Text style={{ fontSize:10, color:C.muted }}>students</Text>
                    </View>
                  </View>
                </View>
              ))}

              <View style={[st.secHead, { marginTop:8 }]}><Text style={st.secTitle}>Export</Text></View>
              {["\uD83D\uDCC4 PDF – Student List","\uD83D\uDCCA Excel – Boarding Log","\uD83D\uDCF1 Share via WhatsApp"].map(e => (
                <TouchableOpacity key={e} style={[st.btnOutline, { marginBottom:8, width:'100%' }]}>
                  <Text style={{ color:C.white, fontWeight:'600', fontSize:15 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex:1, backgroundColor:C.navy }}>
      <View style={st.pageHeader}>
        <TouchableOpacity style={st.backBtn} onPress={onBack}><Icon name="back" size={18} color={C.white} /></TouchableOpacity>
        <Text style={{ fontWeight:'700', fontSize:18, color:C.white }}>Reports & Analytics</Text>
      </View>

      <View style={{ paddingHorizontal:20, paddingBottom:20 }}>
        <View style={[st.toggleWrap, { marginBottom:16 }]}>
          {[["attendance","\uD83D\uDCC5 Attend."],["marks","\uD83D\uDCDD Marks"],["bus","\uD83D\uDE8C Bus"]].map(([id,lbl]) => (
            <TouchableOpacity key={id} style={[st.toggleBtn, tab===id && st.toggleBtnActive]} onPress={() => setTab(id)}>
              <Text style={tab===id ? st.toggleBtnTextActive : st.toggleBtnText}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "attendance" && (
          <View>
            <View style={st.secHead}><Text style={st.secTitle}>Term Summary</Text></View>
            <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
              {[["Term 1","—","#22d38a"],["Term 2","—",C.teal],["Term 3","—",C.gold]].map(([t,v,c]) => (
                <View key={t} style={st.metricCard}>
                  <Text style={{ fontWeight:'800', fontSize:22, color:c }}>{v}</Text>
                  <Text style={{ fontSize:11, color:C.muted, marginTop:4 }}>{t}</Text>
                </View>
              ))}
            </View>
            <View style={st.secHead}><Text style={st.secTitle}>Class-wise This Month</Text></View>
            <View style={[st.card, st.cardSm, { marginBottom:16 }]}>
              {attLoading ? (
                <ActivityIndicator size="small" color={C.teal} />
              ) : classAttData.length === 0 ? (
                <Text style={{ color:C.muted, fontSize:12, textAlign:'center', paddingVertical:12 }}>No attendance data available</Text>
              ) : classAttData.map(c => {
                const col = c.pct>=90?"#22d38a":c.pct>=80?C.teal:C.gold;
                return (
                  <View key={c.cls} style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 }}>
                    <Text style={{ fontSize:11, fontWeight:'700', width:38, color:C.white }}>{c.cls}</Text>
                    <View style={[st.progressTrack, { flex:1 }]}><View style={[st.progressFill, { width:`${c.pct}%`, backgroundColor:col }]} /></View>
                    <Text style={{ fontSize:11, fontWeight:'700', color:col, width:34, textAlign:'right' }}>{c.pct}%</Text>
                  </View>
                );
              })}
            </View>
            <View style={st.secHead}><Text style={st.secTitle}>Export</Text></View>
            {["\uD83D\uDCC4 PDF – Daily Report","\uD83D\uDCCA Excel – Monthly Sheet","\uD83D\uDCCB PDF – Term Report"].map(e => (
              <TouchableOpacity key={e} style={[st.btnOutline, { marginBottom:8, width:'100%' }]}>
                <Text style={{ color:C.white, fontWeight:'600', fontSize:15 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === "marks" && (
          <View>
            <View style={{ backgroundColor:C.navyMid, borderRadius:14, paddingVertical:12, paddingHorizontal:14, marginBottom:16, flexDirection:'row', alignItems:'center', gap:10 }}>
              <Text style={{ fontSize:20 }}>{'\uD83D\uDCCA'}</Text>
              <View>
                <Text style={{ fontWeight:'700', fontSize:13, color:C.white }}>Class-wise Marks Report</Text>
                <Text style={{ color:C.muted, fontSize:11, marginTop:2 }}>Tap any class to view full breakdown, student rankings & subject averages</Text>
              </View>
            </View>

            {schoolSubjectAvgs.length > 0 && (
              <>
                <View style={st.secHead}><Text style={st.secTitle}>School-wide Subject Averages</Text></View>
                <View style={[st.card, st.cardSm, { marginBottom:16 }]}>
                  <View style={{ flexDirection:'row', alignItems:'flex-end', gap:10, height:90 }}>
                    {schoolSubjectAvgs.map((s, i) => {
                      const col = subColor(s.subject, i);
                      return (
                        <View key={s.subject} style={{ flex:1, alignItems:'center', gap:6 }}>
                          <Text style={{ fontSize:9, color:col, fontWeight:'700' }}>{s.pct}%</Text>
                          <View style={{ height:Math.max(Math.min(s.pct, 70), 4), width:'100%', borderTopLeftRadius:8, borderTopRightRadius:8, backgroundColor:col+'cc' }} />
                          <Text style={{ fontSize:9, color:C.muted, textAlign:'center' }}>{subShort(s.subject)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={st.secHead}><Text style={st.secTitle}>Select a Class</Text></View>
            {classList.length === 0 && (
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>{'📚'}</Text>
                <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>No classes found. Add classes from the Admin panel.</Text>
              </View>
            )}
            {classList.map(cls => (
              <TouchableOpacity key={cls.id} style={[st.card, st.cardSm, { marginBottom:12 }]}
                onPress={() => { setSelectedClass(cls); setMarksView("classDetail"); setSelectedUnit("all"); }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
                  <LinearGradient colors={[C.purple+'44', C.purple+'22']} start={{x:0,y:0}} end={{x:1,y:1}} style={{ width:52, height:52, borderRadius:16, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.purple+'44' }}>
                    <Text style={{ fontSize:11, fontWeight:'800', color:C.purple, textAlign:'center', lineHeight:14 }}>
                      {cls.name.replace("Grade ","")}
                    </Text>
                  </LinearGradient>
                  <View style={{ flex:1 }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <Text style={{ fontWeight:'800', fontSize:15, color:C.white }}>{cls.name}</Text>
                    </View>
                    <Text style={{ color:C.muted, fontSize:11, marginBottom:6 }}>
                      {'\uD83D\uDC68\u200D\uD83C\uDF93'} {cls.studentCount || 0} students
                    </Text>
                    <View style={{ flexDirection:'row', gap:4, marginTop:4 }}>
                      {schoolSubjectAvgs.slice(0,6).map((s,i) => (
                        <View key={i} style={{ flex:1, height:4, borderRadius:2, backgroundColor:subColor(s.subject,i), opacity:0.7 }} />
                      ))}
                    </View>
                  </View>
                  <Icon name="arrow" size={16} color={C.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === "bus" && (
          <View>
            <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
              {[
                { val:BUS_DATA.length, lbl:"Total Buses", color:C.teal },
                { val:BUS_DATA.reduce((s,b)=>s+b.students,0), lbl:"Students", color:C.purple },
                { val:BUS_DATA.length > 0 ? Math.round(BUS_DATA.reduce((s,b)=>s+b.onTimeRate,0)/BUS_DATA.length)+"%" : "—", lbl:"On-Time", color:"#22d38a" },
              ].map(s => (
                <View key={s.lbl} style={st.metricCard}>
                  <Text style={{ fontWeight:'800', fontSize:20, color:s.color }}>{s.val}</Text>
                  <Text style={{ fontSize:11, color:C.muted, marginTop:4 }}>{s.lbl}</Text>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor:C.navyMid, borderRadius:14, paddingVertical:10, paddingHorizontal:14, marginBottom:16, flexDirection:'row', alignItems:'center', gap:10 }}>
              <Text style={{ fontSize:18 }}>{'\uD83D\uDE8C'}</Text>
              <Text style={{ color:C.muted, fontSize:12 }}>Tap any bus to view daily duration, driver details & student count</Text>
            </View>

            {BUS_DATA.map(b => {
              const col = b.compliance>=95?"#22d38a":b.compliance>=90?C.teal:C.gold;
              const latestDay = b.daily[b.daily.length-1];
              return (
                <TouchableOpacity key={b.id} style={[st.card, st.cardSm, { marginBottom:12 }]}
                  onPress={() => { setSelectedBus(b); setBusTab("duration"); }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:12 }}>
                    <LinearGradient colors={[C.coral+'44', C.coral+'22']} start={{x:0,y:0}} end={{x:1,y:1}} style={{ width:52, height:52, borderRadius:16, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.coral+'44' }}>
                      <Text style={{ fontSize:24 }}>{'\uD83D\uDE8C'}</Text>
                    </LinearGradient>
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                        <Text style={{ fontWeight:'800', fontSize:15, color:C.white }}>{b.bus}</Text>
                        <Text style={{ fontSize:13, fontWeight:'800', color:col }}>{b.compliance}%</Text>
                      </View>
                      <Text style={{ color:C.muted, fontSize:11, marginTop:2 }}>{b.route}</Text>
                      <Text style={{ color:C.muted, fontSize:11, marginTop:1 }}>{'\uD83E\uDDD1\u200D\u2708\uFE0F'} {b.driver}  {'·'}  {'\uD83D\uDC64'} {b.pet}</Text>
                    </View>
                    <Icon name="arrow" size={15} color={C.muted} />
                  </View>

                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                    {[
                      { ic:"\uD83D\uDC68\u200D\uD83C\uDF93", val:b.students, lbl:"Students", color:C.teal },
                      { ic:"\u23F1\uFE0F", val:b.avgMorning+"m", lbl:"Avg Morn", color:C.purple },
                      { ic:"\uD83C\uDF06", val:b.avgEvening+"m", lbl:"Avg Eve", color:C.gold },
                    ].map(s => (
                      <View key={s.lbl} style={{ width:'30%', alignItems:'center', paddingVertical:7, paddingHorizontal:4, backgroundColor:C.navyMid, borderRadius:10 }}>
                        <Text style={{ fontSize:13, marginBottom:2 }}>{s.ic}</Text>
                        <Text style={{ fontSize:14, fontWeight:'800', color:s.color }}>{s.val}</Text>
                        <Text style={{ fontSize:9, color:C.muted }}>{s.lbl}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={{ fontSize:10, color:C.muted, width:68 }}>Compliance</Text>
                    <View style={[st.progressTrack, { flex:1 }]}>
                      <View style={[st.progressFill, { width:`${b.compliance}%`, backgroundColor:col }]} />
                    </View>
                    <Text style={{ fontSize:11, fontWeight:'700', color:col, width:32, textAlign:'right' }}>{b.compliance}%</Text>
                  </View>

                  {latestDay.delay > 0 && (
                    <View style={{ backgroundColor:C.coral+'11', borderWidth:1, borderColor:C.coral+'33', borderRadius:8, paddingVertical:5, paddingHorizontal:10, marginTop:8 }}>
                      <Text style={{ fontSize:11, color:C.coral }}>{'\u26A0\uFE0F'} Latest trip delayed {latestDay.delay} min {'—'} {latestDay.day}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  pageHeader: { flexDirection:'row', alignItems:'center', gap:14, paddingTop:16, paddingBottom:8, paddingHorizontal:20 },
  backBtn: { width:38, height:38, borderRadius:12, backgroundColor:C.card, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  card: { backgroundColor:C.card, borderWidth:1, borderColor:C.border, borderRadius:20, padding:20 },
  cardSm: { borderRadius:16, padding:16 },
  secHead: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  secTitle: { fontSize:16, fontWeight:'600', color:C.white },
  progressTrack: { backgroundColor:C.border, borderRadius:99, height:8, overflow:'hidden' },
  progressFill: { height:'100%', borderRadius:99 },
  toggleWrap: { flexDirection:'row', backgroundColor:C.navyMid, borderRadius:12, padding:4, gap:4 },
  toggleBtn: { flex:1, paddingVertical:8, borderRadius:9, alignItems:'center' },
  toggleBtnActive: { backgroundColor:C.gold },
  toggleBtnText: { fontSize:13, fontWeight:'600', color:C.muted },
  toggleBtnTextActive: { fontSize:13, fontWeight:'600', color:C.navy },
  chip: { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:6, paddingHorizontal:12, borderRadius:50 },
  chipGreen: { backgroundColor:'rgba(52,211,153,0.15)' },
  chipCoral: { backgroundColor:'rgba(255,107,107,0.15)' },
  chipTeal: { backgroundColor:'rgba(0,184,169,0.15)' },
  metricCard: { flex:1, backgroundColor:C.card, borderWidth:1, borderColor:C.border, borderRadius:16, padding:16, alignItems:'center' },
  studentRow: { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.border },
  btnOutline: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:14, paddingHorizontal:24, borderRadius:14, borderWidth:1.5, borderColor:C.border, backgroundColor:'transparent' },
  btnTeal: { backgroundColor:C.teal },
});

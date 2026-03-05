import { C } from '../theme/colors';

export const INITIAL_LEAVE_REQS = [
  { id:"LR001", student:"Aarav Kumar", initials:"AK", color:C.teal, roll:1, grade:"8-A", icon:"\u{1F912}", reason:"Medical / Sick Leave",
    detail:"Aarav has been running high fever since last night (102\u00B0F). Doctor has advised complete bed rest for 2 days and has prescribed antibiotics. We will share the medical certificate on his return.",
    parentName:"Mrs. Kavitha Kumar", parentRelation:"Mother",
    from:"Jan 28", to:"Jan 29", days:2, status:"Pending", time:"8:02 AM", unread:true },
  { id:"LR002", student:"Priya Rajan", initials:"PR", color:C.coral, roll:2, grade:"8-A", icon:"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", reason:"Family Function / Event",
    detail:"My elder sister's engagement ceremony is scheduled at our hometown (Madurai). Our entire family will be travelling — she will miss only one day and will complete any missed work on return.",
    parentName:"Mr. Suresh Rajan", parentRelation:"Father",
    from:"Jan 30", to:"Jan 30", days:1, status:"Pending", time:"7:55 AM", unread:true },
  { id:"LR003", student:"Ananya M", initials:"AM", color:C.purple, roll:4, grade:"8-A", icon:"\u2708\uFE0F", reason:"Out of Station / Travel",
    detail:"Family trip to our native place for grandfather's 80th birthday celebration. Extended family gathering — we will be back by Feb 4 morning. Please share any important homework.",
    parentName:"Mr. Mahesh M", parentRelation:"Father",
    from:"Feb 01", to:"Feb 03", days:3, status:"Approved", time:"Yesterday", unread:false },
  { id:"LR004", student:"Rohit V", initials:"RV", color:C.coral, roll:7, grade:"8-A", icon:"\u{1F4DA}", reason:"Competitive Exam",
    detail:"Rohit has registered for the National Talent Search (NTS) scholarship examination conducted by NCERT. The exam centre is 45 km away and we need to leave early morning.",
    parentName:"Mrs. Anitha V", parentRelation:"Mother",
    from:"Jan 25", to:"Jan 25", days:1, status:"Rejected", time:"Jan 24", unread:false },
  { id:"LR005", student:"Karan P", initials:"KP", color:"#60A5FA", roll:5, grade:"8-A", icon:"\u{1F3E5}", reason:"Medical Appointment",
    detail:"Karan has a scheduled orthopaedic follow-up appointment for his knee injury (sports day accident). The appointment is at 11 AM and we expect to be back by early afternoon.",
    parentName:"Mr. Prakash P", parentRelation:"Father",
    from:"Feb 05", to:"Feb 05", days:1, status:"Pending", time:"Just now", unread:true },
];

export const TEACHER_NOTIFS = [
  { icon:"\u{1F4CB}", title:"Staff Meeting — Tomorrow", desc:"All teachers, 10 AM, Staff Room 1", time:"1:00 PM", color:C.gold },
  { icon:"\u{1F4DD}", title:"Unit 4 Marks Due in 2 Days", desc:"Submit all marks by Jan 31 via portal", time:"Yesterday", color:C.coral },
  { icon:"\u{1F3EB}", title:"PTA Meeting — Feb 08", desc:"Parent-teacher meet for Grade 8-A & 8-B classes", time:"2 days ago", color:C.purple },
  { icon:"\u{1F389}", title:"Annual Day Practice Schedule", desc:"Updated rehearsal timetable posted", time:"3 days ago", color:C.teal },
];

export const TEACHER_SALARY = {
  name:"Mr. Raj Sharma", empId:"VIS-T-042", dept:"Mathematics", designation:"Senior Teacher",
  doj:"Aug 01, 2019", bankAc:"HDFC ····8821", ifsc:"HDFC0001234",
  gross:68000,
  components: [
    { label:"Basic Salary", amount:34000, type:"earning" },
    { label:"House Rent Allowance", amount:13600, type:"earning" },
    { label:"Dearness Allowance", amount:10200, type:"earning" },
    { label:"Transport Allowance", amount:5100, type:"earning" },
    { label:"Special Allowance", amount:5100, type:"earning" },
  ],
  current:{
    month:"January 2025", gross:68000, deductions:5100, net:62900,
    credited:"Jan 31, 2025", ref:"SAL-VIS-042-0125", workingDays:26, lopDays:0,
    deductionItems:[
      { label:"Provident Fund (PF)", amount:2720, note:"12% of Basic Salary" },
      { label:"Professional Tax", amount:200, note:"As per Tamil Nadu slab" },
      { label:"TDS (Income Tax)", amount:2180, note:"As per Form 16 computation" },
    ],
  },
  history:[
    { month:"December 2024", gross:68000, deductions:5100, net:62900, credited:"Dec 31, 2024", workingDays:26, lopDays:0, note:null },
    { month:"November 2024", gross:68000, deductions:6600, net:61400, credited:"Nov 30, 2024", workingDays:25, lopDays:0, note:"TDS revised per new annual slab calculation" },
    { month:"October 2024", gross:68000, deductions:5100, net:62900, credited:"Oct 31, 2024", workingDays:27, lopDays:0, note:null },
    { month:"September 2024", gross:65000, deductions:4875, net:60125, credited:"Sep 30, 2024", workingDays:26, lopDays:0, note:"Pre-increment salary" },
    { month:"August 2024", gross:65000, deductions:7050, net:57950, credited:"Aug 31, 2024", workingDays:26, lopDays:1, note:"1-day LOP: Aug 14" },
    { month:"July 2024", gross:65000, deductions:4875, net:60125, credited:"Jul 31, 2024", workingDays:27, lopDays:0, note:null },
  ],
};

export const TEACHER_LEAVE_REASONS = [
  { id:"sick", icon:"\u{1F912}", label:"Medical / Sick Leave" },
  { id:"personal", icon:"\u{1F464}", label:"Personal / Family Matter" },
  { id:"travel", icon:"\u2708\uFE0F", label:"Out of Station / Travel" },
  { id:"study", icon:"\u{1F4DA}", label:"Training / Study Leave" },
  { id:"ceremony", icon:"\u{1F38A}", label:"Religious / Ceremony Leave" },
  { id:"other", icon:"\u{1F4DD}", label:"Other (describe below)" },
];

export const MY_PAST_LEAVES = [
  { id:"TL001", reason:"Medical / Sick Leave", from:"Jan 14", to:"Jan 15", days:2, status:"Approved", icon:"\u{1F912}" },
  { id:"TL002", reason:"Personal / Family", from:"Dec 05", to:"Dec 05", days:1, status:"Approved", icon:"\u{1F464}" },
  { id:"TL003", reason:"Out of Station / Travel", from:"Nov 22", to:"Nov 23", days:2, status:"Rejected", icon:"\u2708\uFE0F" },
];

export const CAL_MONTHS_T = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const EVENT_TYPE_META = {
  all:      { icon: "\u{1F4C5}", label: "All",      color: C.gold },
  class:    { icon: "\u{1F4D6}", label: "Class",    color: C.teal },
  exam:     { icon: "\u{1F4DD}", label: "Exam",     color: C.coral },
  revision: { icon: "\u{1F4D6}", label: "Revision", color: "#A78BFA" },
  meeting:  { icon: "\u{1F465}", label: "Meeting",  color: C.purple },
  event:    { icon: "\u{1F3AD}", label: "Event",    color: "#F59E0B" },
  holiday:  { icon: "\u{1F3D6}\uFE0F", label: "Holiday",  color: "#34D399" },
};

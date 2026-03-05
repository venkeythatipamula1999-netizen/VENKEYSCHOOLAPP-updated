import { C } from '../theme/colors';

export const INR = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');

export const FEE_STATUS_COLOR = (s) =>
  ({ Cleared: '#34D399', Partial: C.gold, Overdue: C.coral, Paid: '#34D399', Pending: C.coral })[s] || C.muted;

export const ADMIN_EMPLOYEES = [
  { id:"E001", name:"Raj Sharma", role:"Senior Teacher", dept:"Mathematics", gross:68000, joined:"Jun 2019", empId:"VIS-T-042", attPct:96, presentDays:22, absentDays:1, lopDays:0, phone:"98765 43001",
    deductions:{pf:2720,pt:200,tds:2180}, net:62900,
    history:[{month:"Jan 2025",gross:68000,deductions:5100,net:62900,credited:"Jan 31",mode:"Bank Transfer",ref:"SAL-042-0125",note:null},{month:"Dec 2024",gross:68000,deductions:5100,net:62900,credited:"Dec 31",mode:"Bank Transfer",ref:"SAL-042-1224",note:null},{month:"Nov 2024",gross:68000,deductions:6600,net:61400,credited:"Nov 30",mode:"Bank Transfer",ref:"SAL-042-1124",note:"TDS revised"},{month:"Oct 2024",gross:65000,deductions:4875,net:60125,credited:"Oct 31",mode:"Bank Transfer",ref:"SAL-042-1024",note:"Pre-increment"},{month:"Sep 2024",gross:65000,deductions:7125,net:57875,credited:"Sep 30",mode:"Bank Transfer",ref:"SAL-042-0924",note:"1-day LOP: Sep 14"},{month:"Aug 2024",gross:65000,deductions:4875,net:60125,credited:"Aug 31",mode:"Bank Transfer",ref:"SAL-042-0824",note:null}] },
  { id:"E002", name:"Priya Iyer", role:"Science Teacher", dept:"Science", gross:62000, joined:"Jul 2020", empId:"VIS-T-018", attPct:88, presentDays:20, absentDays:2, lopDays:1, phone:"98765 43002",
    deductions:{pf:2480,pt:200,tds:1820}, net:57500,
    history:[{month:"Jan 2025",gross:62000,deductions:4500,net:57500,credited:"Jan 31",mode:"Bank Transfer",ref:"SAL-018-0125",note:"1-day LOP: Jan 10"},{month:"Dec 2024",gross:62000,deductions:4500,net:57500,credited:"Dec 31",mode:"Bank Transfer",ref:"SAL-018-1224",note:null},{month:"Nov 2024",gross:62000,deductions:4500,net:57500,credited:"Nov 30",mode:"Bank Transfer",ref:"SAL-018-1124",note:null},{month:"Oct 2024",gross:58000,deductions:4350,net:53650,credited:"Oct 31",mode:"Bank Transfer",ref:"SAL-018-1024",note:"Pre-increment"},{month:"Sep 2024",gross:58000,deductions:4350,net:53650,credited:"Sep 30",mode:"Bank Transfer",ref:"SAL-018-0924",note:null},{month:"Aug 2024",gross:58000,deductions:4350,net:53650,credited:"Aug 31",mode:"Bank Transfer",ref:"SAL-018-0824",note:null}] },
  { id:"E003", name:"Anand Menon", role:"English Teacher", dept:"English", gross:70000, joined:"Apr 2017", empId:"VIS-T-007", attPct:100, presentDays:23, absentDays:0, lopDays:0, phone:"98765 43003",
    deductions:{pf:2800,pt:200,tds:2800}, net:64200,
    history:[{month:"Jan 2025",gross:70000,deductions:5800,net:64200,credited:"Jan 31",mode:"Bank Transfer",ref:"SAL-007-0125",note:null},{month:"Dec 2024",gross:70000,deductions:5800,net:64200,credited:"Dec 31",mode:"Bank Transfer",ref:"SAL-007-1224",note:null},{month:"Nov 2024",gross:70000,deductions:7000,net:63000,credited:"Nov 30",mode:"Bank Transfer",ref:"SAL-007-1124",note:"TDS adjustment"},{month:"Oct 2024",gross:70000,deductions:5800,net:64200,credited:"Oct 31",mode:"Bank Transfer",ref:"SAL-007-1024",note:null},{month:"Sep 2024",gross:70000,deductions:5800,net:64200,credited:"Sep 30",mode:"Bank Transfer",ref:"SAL-007-0924",note:null},{month:"Aug 2024",gross:70000,deductions:5800,net:64200,credited:"Aug 31",mode:"Bank Transfer",ref:"SAL-007-0824",note:null}] },
  { id:"E004", name:"Sunita Rao", role:"Social Sci. Teacher", dept:"Social Sci.", gross:58000, joined:"Mar 2021", empId:"VIS-T-031", attPct:91, presentDays:21, absentDays:2, lopDays:0, phone:"98765 43004",
    deductions:{pf:2320,pt:200,tds:1380}, net:54100,
    history:[{month:"Jan 2025",gross:58000,deductions:3900,net:54100,credited:"Jan 31",mode:"Bank Transfer",ref:"SAL-031-0125",note:null},{month:"Dec 2024",gross:58000,deductions:3900,net:54100,credited:"Dec 31",mode:"Bank Transfer",ref:"SAL-031-1224",note:null},{month:"Nov 2024",gross:58000,deductions:3900,net:54100,credited:"Nov 30",mode:"Bank Transfer",ref:"SAL-031-1124",note:null},{month:"Oct 2024",gross:55000,deductions:3700,net:51300,credited:"Oct 31",mode:"Bank Transfer",ref:"SAL-031-1024",note:"Pre-increment"},{month:"Sep 2024",gross:55000,deductions:5700,net:49300,credited:"Sep 30",mode:"Bank Transfer",ref:"SAL-031-0924",note:"2-day LOP: Sep 5-6"},{month:"Aug 2024",gross:55000,deductions:3700,net:51300,credited:"Aug 31",mode:"Bank Transfer",ref:"SAL-031-0824",note:null}] },
  { id:"E005", name:"Karthik Nair", role:"Tamil Teacher", dept:"Tamil", gross:54000, joined:"Jun 2022", empId:"VIS-T-055", attPct:78, presentDays:18, absentDays:5, lopDays:2, phone:"98765 43005",
    deductions:{pf:2160,pt:200,tds:940}, net:46700,
    history:[{month:"Jan 2025",gross:54000,deductions:7300,net:46700,credited:"Jan 31",mode:"Bank Transfer",ref:"SAL-055-0125",note:"2-day LOP deducted: Jan 14-15"},{month:"Dec 2024",gross:54000,deductions:3300,net:50700,credited:"Dec 31",mode:"Bank Transfer",ref:"SAL-055-1224",note:null},{month:"Nov 2024",gross:54000,deductions:3300,net:50700,credited:"Nov 30",mode:"Bank Transfer",ref:"SAL-055-1124",note:null},{month:"Oct 2024",gross:54000,deductions:3300,net:50700,credited:"Oct 31",mode:"Bank Transfer",ref:"SAL-055-1024",note:null},{month:"Sep 2024",gross:52000,deductions:5200,net:46800,credited:"Sep 30",mode:"Bank Transfer",ref:"SAL-055-0924",note:"1-day LOP"},{month:"Aug 2024",gross:52000,deductions:3200,net:48800,credited:"Aug 31",mode:"Bank Transfer",ref:"SAL-055-0824",note:null}] },
  { id:"E006", name:"Meena Pillai", role:"Computer Teacher", dept:"Computer", gross:56000, joined:"Jan 2023", empId:"VIS-T-062", attPct:95, presentDays:22, absentDays:1, lopDays:0, phone:"98765 43006",
    deductions:{pf:2240,pt:200,tds:1160}, net:52400,
    history:[{month:"Jan 2025",gross:56000,deductions:3600,net:52400,credited:"Jan 31",mode:"Bank Transfer",ref:"SAL-062-0125",note:null},{month:"Dec 2024",gross:56000,deductions:3600,net:52400,credited:"Dec 31",mode:"Bank Transfer",ref:"SAL-062-1224",note:null},{month:"Nov 2024",gross:56000,deductions:3600,net:52400,credited:"Nov 30",mode:"Bank Transfer",ref:"SAL-062-1124",note:null},{month:"Oct 2024",gross:56000,deductions:3600,net:52400,credited:"Oct 31",mode:"Bank Transfer",ref:"SAL-062-1024",note:null},{month:"Sep 2024",gross:54000,deductions:3500,net:50500,credited:"Sep 30",mode:"Bank Transfer",ref:"SAL-062-0924",note:"Pre-increment"},{month:"Aug 2024",gross:54000,deductions:3500,net:50500,credited:"Aug 31",mode:"Bank Transfer",ref:"SAL-062-0824",note:null}] },
  { id:"E007", name:"Kumar S.", role:"Bus Driver", dept:"Transport", gross:28000, joined:"Aug 2018", empId:"VIS-D-003", attPct:100, presentDays:23, absentDays:0, lopDays:0, phone:"98765 43007",
    deductions:{pf:1120,pt:150,tds:0}, net:26730,
    history:[{month:"Jan 2025",gross:28000,deductions:1270,net:26730,credited:"Jan 31",mode:"Bank Transfer",ref:"SAL-D03-0125",note:null},{month:"Dec 2024",gross:28000,deductions:1270,net:26730,credited:"Dec 31",mode:"Bank Transfer",ref:"SAL-D03-1224",note:null},{month:"Nov 2024",gross:28000,deductions:1270,net:26730,credited:"Nov 30",mode:"Bank Transfer",ref:"SAL-D03-1124",note:null},{month:"Oct 2024",gross:28000,deductions:1270,net:26730,credited:"Oct 31",mode:"Bank Transfer",ref:"SAL-D03-1024",note:null},{month:"Sep 2024",gross:26000,deductions:1200,net:24800,credited:"Sep 30",mode:"Bank Transfer",ref:"SAL-D03-0924",note:"Pre-increment"},{month:"Aug 2024",gross:26000,deductions:1200,net:24800,credited:"Aug 31",mode:"Bank Transfer",ref:"SAL-D03-0824",note:null}] },
];

export const SAL_MODES = ["Bank Transfer","Cash","Cheque"];

export const CLASSES_LIST = [
  { name: "8-A", studentCount: 38 },
  { name: "8-B", studentCount: 36 },
  { name: "9-A", studentCount: 40 },
  { name: "9-B", studentCount: 39 },
  { name: "10-A", studentCount: 35 },
  { name: "10-B", studentCount: 37 },
];

export const ADMIN_DATA = {
  stats: { students: 1240, teachers: 68, classes: 42, buses: 12, parents: 1180, attendance: 87.4 },
  weeklyAtt: [82, 85, 88, 83, 90, 87, 84],
  classAtt: [
    { cls: "8-A", pct: 92 }, { cls: "8-B", pct: 88 }, { cls: "9-A", pct: 95 },
    { cls: "9-B", pct: 84 }, { cls: "10-A", pct: 91 }, { cls: "10-B", pct: 86 },
  ],
  recentExams: [
    { exam: "Unit 4 – Math", grade: "8-A", avg: 87.2, highest: 98, lowest: 55, date: "Jan 28" },
    { exam: "Unit 4 – Science", grade: "9-A", avg: 82.5, highest: 95, lowest: 48, date: "Jan 27" },
    { exam: "Half-Yearly – Eng", grade: "10-A", avg: 79.8, highest: 97, lowest: 42, date: "Jan 24" },
  ],
  teachers: [
    { id: 1, name: "Raj Sharma", subject: "Mathematics", classes: ["8-A","9-A","8-B"], status: "active", attPending: false },
    { id: 2, name: "Priya Iyer", subject: "Science", classes: ["9-A","9-B","10-A"], status: "active", attPending: true },
    { id: 3, name: "Anand Menon", subject: "English", classes: ["10-A","10-B"], status: "active", attPending: false },
    { id: 4, name: "Sunita Rao", subject: "Social Sci.", classes: ["8-A","8-B","11-A"], status: "active", attPending: true },
    { id: 5, name: "Karthik Nair", subject: "Tamil", classes: ["11-A","11-B"], status: "inactive", attPending: false },
    { id: 6, name: "Meena Pillai", subject: "Computer", classes: ["8-A","9-A"], status: "active", attPending: true },
  ],
  buses: [
    { id: 1, bus: "Bus 01", route: "Route 1 – North", driver: "Kumar S.", pet: "Ravi Kumar", students: 88, status: "En Route", delay: 0 },
    { id: 2, bus: "Bus 02", route: "Route 2 – West", driver: "Rajan M.", pet: "Suresh Babu", students: 73, status: "At School", delay: 0 },
    { id: 3, bus: "Bus 03", route: "Route 3 – South", driver: "Vijay P.", pet: "Anitha Devi", students: 67, status: "Returning", delay: 12 },
    { id: 4, bus: "Bus 04", route: "Route 4 – East", driver: "Suresh K.", pet: "Kala Priya", students: 52, status: "Parked", delay: 0 },
  ],
  classes: [
    { id: 1, name: "Grade 8-A", teacher: "Raj Sharma", students: 38, bus: "Route 1" },
    { id: 2, name: "Grade 8-B", teacher: "Raj Sharma", students: 36, bus: "Route 2" },
    { id: 3, name: "Grade 9-A", teacher: "Priya Iyer", students: 40, bus: "Route 1" },
    { id: 4, name: "Grade 9-B", teacher: "Sunita Rao", students: 39, bus: "Route 3" },
    { id: 5, name: "Grade 10-A", teacher: "Anand Menon", students: 35, bus: "Route 2" },
    { id: 6, name: "Grade 10-B", teacher: "Anand Menon", students: 37, bus: "Route 4" },
  ],
  alerts: [
    { id: 1, type: "warn", icon: "\u26A0\uFE0F", msg: "Priya Iyer – attendance not submitted for 9-A", time: "9:15 AM" },
    { id: 2, type: "warn", icon: "\u26A0\uFE0F", msg: "Sunita Rao – attendance not submitted for 8-A", time: "9:10 AM" },
    { id: 3, type: "warn", icon: "\u26A0\uFE0F", msg: "Meena Pillai – marks pending for Unit 4 Computer", time: "8:50 AM" },
    { id: 4, type: "delay", icon: "\uD83D\uDE8C", msg: "Bus 03 (Route 3 South) is running 12 minutes late", time: "8:35 AM" },
    { id: 5, type: "info", icon: "\u2139\uFE0F", msg: "86 parents have not viewed Unit 4 marks", time: "Yesterday" },
    { id: 6, type: "ok", icon: "\u2705", msg: "All buses completed morning route successfully", time: "Jan 30" },
  ],
};

export const ADMIN_STUDENT_LEAVES = [
  { id:"SL001", student:"Arjun Kumar", grade:"8-A", roll:"001", type:"Sick Leave", days:2, from:"Feb 3", to:"Feb 4", icon:"\uD83E\uDE92", status:"Pending", time:"Today 8:30 AM", appliedBy:"Mrs. Priya Kumar (Parent)", detail:"Arjun has high fever and has been prescribed rest for 2 days. Doctor’s certificate attached." },
  { id:"SL002", student:"Preethi Nair", grade:"8-A", roll:"004", type:"Family Function", days:3, from:"Feb 10", to:"Feb 12", icon:"\uD83C\uDFE0", status:"Pending", time:"Yesterday", appliedBy:"Mr. Suresh Nair (Parent)", detail:"Family wedding in Kochi. Request leave for 3 days. Will complete all pending assignments." },
  { id:"SL003", student:"Kavya Reddy", grade:"8-B", roll:"004", type:"Medical", days:1, from:"Jan 30", to:"Jan 30", icon:"\uD83C\uDFE5", status:"Approved", time:"Jan 29", appliedBy:"Mr. Krishna Reddy (Parent)", detail:"Dental appointment scheduled. Will return the next day." },
  { id:"SL004", student:"Siddharth Babu", grade:"8-B", roll:"003", type:"Personal", days:5, from:"Feb 15", to:"Feb 19", icon:"\u2708\uFE0F", status:"Rejected", time:"Jan 28", appliedBy:"Mrs. Radha Babu (Parent)", detail:"Family vacation to Kerala. Requested during exam week – rejected by admin." },
];

export const ADMIN_STAFF_LEAVES = [
  { id:"TL001", staff:"Karthik Nair", role:"Tamil Teacher", dept:"Tamil", type:"Casual Leave", days:1, from:"Feb 5", icon:"\uD83C\uDFE0", status:"Pending", time:"Today 7:45 AM", detail:"Personal errand – will arrange substitute for Tamil periods." },
  { id:"TL002", staff:"Priya Iyer", role:"Science Teacher", dept:"Science", type:"Sick Leave", days:2, from:"Feb 6", to:"Feb 7", icon:"\uD83E\uDE92", status:"Pending", time:"Today 6:30 AM", detail:"Suffering from migraine. Doctor advised rest for 2 days." },
  { id:"TL003", staff:"Kumar S.", role:"Bus Driver", dept:"Transport", type:"Earned Leave", days:3, from:"Feb 12", to:"Feb 14", icon:"\u2708\uFE0F", status:"Approved", time:"Jan 30", detail:"Family function in native village. Replacement driver arranged." },
];

export const ADMIN_FEE_STUDENTS = [
  { id:101, name:"Arjun Kumar", grade:"8-B", roll:"001", adm:"VIS/2019/001", totalFee:95000, paid:95000, discount:3000, fine:0, status:"Cleared",
    discounts:[{type:"Sibling Discount",amount:3000}],
    history:[{date:"Apr 2024",amount:32000,mode:"Online / UPI",ref:"PAY-001-APR24",note:null},{date:"Oct 2024",amount:32000,mode:"Online / UPI",ref:"PAY-001-OCT24",note:null},{date:"Jan 2025",amount:31000,mode:"Online / UPI",ref:"PAY-001-JAN25",note:null}] },
  { id:102, name:"Priya Rajan", grade:"8-A", roll:"002", adm:"VIS/2019/002", totalFee:95000, paid:57000, discount:5000, fine:500, status:"Overdue",
    discounts:[{type:"Merit Scholarship",amount:3000},{type:"Early Bird",amount:2000}],
    history:[{date:"Apr 2024",amount:32000,mode:"DD / Cheque",ref:"CHQ-002-APR24",note:null},{date:"Oct 2024",amount:25000,mode:"Cash",ref:"CASH-002-OCT24",note:"Partial payment"},{date:"Jan 2025",amount:0,mode:"—",ref:"—",note:"Payment due — \u20B931,000 + fine \u20B9500"}] },
  { id:103, name:"Vikram S", grade:"8-A", roll:"003", adm:"VIS/2019/003", totalFee:95000, paid:64000, discount:0, fine:0, status:"Partial",
    discounts:[],
    history:[{date:"Apr 2024",amount:32000,mode:"Online / UPI",ref:"PAY-003-APR24",note:null},{date:"Oct 2024",amount:32000,mode:"Online / UPI",ref:"PAY-003-OCT24",note:null},{date:"Jan 2025",amount:0,mode:"—",ref:"—",note:"Term 3 pending — \u20B931,000"}] },
  { id:104, name:"Ananya M", grade:"8-A", roll:"004", adm:"VIS/2019/004", totalFee:95000, paid:32000, discount:0, fine:1000, status:"Overdue",
    discounts:[],
    history:[{date:"Apr 2024",amount:32000,mode:"Cash",ref:"CASH-004-APR24",note:null},{date:"Oct 2024",amount:0,mode:"—",ref:"—",note:"Defaulted — notice sent"},{date:"Jan 2025",amount:0,mode:"—",ref:"—",note:"Fine \u20B91,000 added"}] },
  { id:105, name:"Karan P", grade:"8-A", roll:"005", adm:"VIS/2019/005", totalFee:95000, paid:64000, discount:2000, fine:0, status:"Partial",
    discounts:[{type:"Sports Achievement",amount:2000}],
    history:[{date:"Apr 2024",amount:32000,mode:"Online / UPI",ref:"PAY-005-APR24",note:null},{date:"Oct 2024",amount:32000,mode:"Online / UPI",ref:"PAY-005-OCT24",note:null},{date:"Jan 2025",amount:0,mode:"—",ref:"—",note:"Term 3 pending"}] },
  { id:106, name:"Deepika R", grade:"8-A", roll:"006", adm:"VIS/2019/006", totalFee:95000, paid:90000, discount:7000, fine:0, status:"Partial",
    discounts:[{type:"Academic Excellence",amount:5000},{type:"Sibling",amount:2000}],
    history:[{date:"Apr 2024",amount:32000,mode:"Online / UPI",ref:"PAY-006-APR24",note:null},{date:"Oct 2024",amount:32000,mode:"Online / UPI",ref:"PAY-006-OCT24",note:null},{date:"Jan 2025",amount:26000,mode:"Online / UPI",ref:"PAY-006-JAN25",note:"Partial — \u20B95,000 pending"}] },
];

export const PAYMENT_MODES = ["Online / UPI","DD / Cheque","Cash","NEFT / RTGS","Card (POS)"];
export const DISCOUNT_TYPES = ["Sibling Discount","Merit Scholarship","Sports Achievement","Academic Excellence","Staff Ward Concession","Early Bird Discount","Management Quota","SC/ST Scholarship"];

export const ADMIN_CLASS_STUDENTS = {
  1: [
    { id:101, name:"Arjun Kumar", roll:"001", gender:"M", dob:"12 Mar 2012", blood:"O+", parent:"Mrs. Priya Kumar", phone:"9876543001", bus:"Route 1", att:92, rank:7, status:"Present", photo:"AK" },
    { id:102, name:"Divya Sharma", roll:"002", gender:"F", dob:"05 Jul 2012", blood:"A+", parent:"Mr. Ramesh Sharma", phone:"9876543002", bus:"Route 1", att:88, rank:12, status:"Present", photo:"DS" },
    { id:103, name:"Karthik Rajan", roll:"003", gender:"M", dob:"22 Jan 2012", blood:"B+", parent:"Mrs. Lakshmi Rajan", phone:"9876543003", bus:"Route 2", att:95, rank:3, status:"Present", photo:"KR" },
    { id:104, name:"Preethi Nair", roll:"004", gender:"F", dob:"18 Apr 2012", blood:"AB+", parent:"Mr. Suresh Nair", phone:"9876543004", bus:"Route 1", att:84, rank:18, status:"Absent", photo:"PN" },
    { id:105, name:"Rohit Menon", roll:"005", gender:"M", dob:"30 Sep 2012", blood:"O-", parent:"Mrs. Anitha Menon", phone:"9876543005", bus:"Route 3", att:90, rank:9, status:"Present", photo:"RM" },
    { id:106, name:"Sneha Pillai", roll:"006", gender:"F", dob:"14 Jun 2012", blood:"A-", parent:"Mr. Vijay Pillai", phone:"9876543006", bus:"Route 2", att:97, rank:1, status:"Present", photo:"SP" },
    { id:107, name:"Aditya Rao", roll:"007", gender:"M", dob:"08 Feb 2012", blood:"B-", parent:"Mrs. Kavitha Rao", phone:"9876543007", bus:"Route 1", att:86, rank:15, status:"Present", photo:"AR" },
    { id:108, name:"Meenakshi Iyer", roll:"008", gender:"F", dob:"25 Nov 2012", blood:"O+", parent:"Mr. Prakash Iyer", phone:"9876543008", bus:"Route 2", att:91, rank:8, status:"Present", photo:"MI" },
  ],
  2: [
    { id:201, name:"Vikram Singh", roll:"001", gender:"M", dob:"03 May 2012", blood:"B+", parent:"Mrs. Sunita Singh", phone:"9876543101", bus:"Route 2", att:89, rank:6, status:"Present", photo:"VS" },
    { id:202, name:"Ananya Krishnan", roll:"002", gender:"F", dob:"19 Aug 2012", blood:"A+", parent:"Mr. Murali Krishnan", phone:"9876543102", bus:"Route 2", att:94, rank:2, status:"Present", photo:"AK" },
    { id:203, name:"Siddharth Babu", roll:"003", gender:"M", dob:"11 Dec 2011", blood:"O+", parent:"Mrs. Radha Babu", phone:"9876543103", bus:"Route 3", att:82, rank:20, status:"Absent", photo:"SB" },
    { id:204, name:"Kavya Reddy", roll:"004", gender:"F", dob:"27 Mar 2012", blood:"AB-", parent:"Mr. Krishna Reddy", phone:"9876543104", bus:"Route 2", att:96, rank:1, status:"Present", photo:"KR" },
    { id:205, name:"Harish Nambiar", roll:"005", gender:"M", dob:"09 Oct 2012", blood:"A-", parent:"Mrs. Uma Nambiar", phone:"9876543105", bus:"Route 4", att:87, rank:13, status:"Present", photo:"HN" },
    { id:206, name:"Lavanya Suresh", roll:"006", gender:"F", dob:"16 Jan 2012", blood:"O-", parent:"Mr. Suresh Babu", phone:"9876543106", bus:"Route 2", att:93, rank:4, status:"Present", photo:"LS" },
  ],
  3: [
    { id:301, name:"Rahul Varma", roll:"001", gender:"M", dob:"14 Apr 2011", blood:"O+", parent:"Mrs. Meena Varma", phone:"9876543201", bus:"Route 1", att:91, rank:5, status:"Present", photo:"RV" },
    { id:302, name:"Nithya Chandran", roll:"002", gender:"F", dob:"22 Jul 2011", blood:"A+", parent:"Mr. Ram Chandran", phone:"9876543202", bus:"Route 1", att:98, rank:1, status:"Present", photo:"NC" },
    { id:303, name:"Sriram Pillai", roll:"003", gender:"M", dob:"05 Feb 2011", blood:"B+", parent:"Mrs. Geetha Pillai", phone:"9876543203", bus:"Route 3", att:85, rank:16, status:"Present", photo:"SP" },
    { id:304, name:"Bhavani Devi", roll:"004", gender:"F", dob:"30 Nov 2011", blood:"AB+", parent:"Mr. Selvam Devi", phone:"9876543204", bus:"Route 2", att:79, rank:24, status:"Absent", photo:"BD" },
    { id:305, name:"Ashwin Kumar", roll:"005", gender:"M", dob:"18 Sep 2011", blood:"O-", parent:"Mrs. Revathi Kumar", phone:"9876543205", bus:"Route 1", att:93, rank:3, status:"Present", photo:"AK" },
    { id:306, name:"Priya Venkat", roll:"006", gender:"F", dob:"07 Jun 2011", blood:"B-", parent:"Mr. Venkat Raman", phone:"9876543206", bus:"Route 4", att:88, rank:10, status:"Present", photo:"PV" },
    { id:307, name:"Gowtham Raj", roll:"007", gender:"M", dob:"25 Jan 2011", blood:"A-", parent:"Mrs. Saranya Raj", phone:"9876543207", bus:"Route 1", att:96, rank:2, status:"Present", photo:"GR" },
  ],
  4: [
    { id:401, name:"Deepika Mohan", roll:"001", gender:"F", dob:"10 Mar 2011", blood:"O+", parent:"Mr. Mohan Das", phone:"9876543301", bus:"Route 3", att:90, rank:8, status:"Present", photo:"DM" },
    { id:402, name:"Ajith Rajan", roll:"002", gender:"M", dob:"28 Aug 2011", blood:"A+", parent:"Mrs. Kalai Rajan", phone:"9876543302", bus:"Route 3", att:84, rank:17, status:"Present", photo:"AR" },
    { id:403, name:"Sangeetha Nair", roll:"003", gender:"F", dob:"15 Jun 2011", blood:"B+", parent:"Mr. Pradeep Nair", phone:"9876543303", bus:"Route 2", att:94, rank:3, status:"Present", photo:"SN" },
    { id:404, name:"Mani Vel", roll:"004", gender:"M", dob:"02 Dec 2011", blood:"AB-", parent:"Mrs. Padmini Vel", phone:"9876543304", bus:"Route 3", att:78, rank:28, status:"Absent", photo:"MV" },
    { id:405, name:"Rekha Prabhu", roll:"005", gender:"F", dob:"20 Oct 2011", blood:"O-", parent:"Mr. Prabhu Kumar", phone:"9876543305", bus:"Route 4", att:92, rank:6, status:"Present", photo:"RP" },
  ],
  5: [
    { id:501, name:"Arun Selvam", roll:"001", gender:"M", dob:"08 May 2010", blood:"O+", parent:"Mrs. Vimala Selvam", phone:"9876543401", bus:"Route 2", att:95, rank:4, status:"Present", photo:"AS" },
    { id:502, name:"Janani Krishnan", roll:"002", gender:"F", dob:"17 Sep 2010", blood:"A-", parent:"Mr. Krishnan Babu", phone:"9876543402", bus:"Route 2", att:89, rank:9, status:"Present", photo:"JK" },
    { id:503, name:"Surya Prakash", roll:"003", gender:"M", dob:"24 Feb 2010", blood:"B+", parent:"Mrs. Usha Prakash", phone:"9876543403", bus:"Route 1", att:97, rank:1, status:"Present", photo:"SP" },
    { id:504, name:"Devi Priya", roll:"004", gender:"F", dob:"11 Nov 2010", blood:"AB+", parent:"Mr. Balu Priya", phone:"9876543404", bus:"Route 3", att:81, rank:22, status:"Absent", photo:"DP" },
    { id:505, name:"Karan Mehta", roll:"005", gender:"M", dob:"06 Jul 2010", blood:"A+", parent:"Mrs. Rekha Mehta", phone:"9876543405", bus:"Route 2", att:93, rank:5, status:"Present", photo:"KM" },
    { id:506, name:"Thenmozhi S.", roll:"006", gender:"F", dob:"29 Apr 2010", blood:"O-", parent:"Mr. Selvakumar", phone:"9876543406", bus:"Route 4", att:99, rank:1, status:"Present", photo:"TS" },
  ],
  6: [
    { id:601, name:"Prashanth Dev", roll:"001", gender:"M", dob:"13 Aug 2010", blood:"B-", parent:"Mrs. Preetha Dev", phone:"9876543501", bus:"Route 4", att:87, rank:14, status:"Present", photo:"PD" },
    { id:602, name:"Haritha Mohan", roll:"002", gender:"F", dob:"01 Mar 2010", blood:"O+", parent:"Mr. Mohanraj", phone:"9876543502", bus:"Route 4", att:91, rank:7, status:"Present", photo:"HM" },
    { id:603, name:"Vignesh Raman", roll:"003", gender:"M", dob:"19 Jun 2010", blood:"A+", parent:"Mrs. Kamala Raman", phone:"9876543503", bus:"Route 4", att:94, rank:3, status:"Present", photo:"VR" },
    { id:604, name:"Pooja Sundaram", roll:"004", gender:"F", dob:"07 Sep 2010", blood:"B+", parent:"Mr. Sundaram K.", phone:"9876543504", bus:"Route 4", att:98, rank:1, status:"Present", photo:"PS" },
    { id:605, name:"Naveen Kumar", roll:"005", gender:"M", dob:"22 Nov 2010", blood:"AB+", parent:"Mrs. Jaya Kumar", phone:"9876543505", bus:"Route 4", att:83, rank:19, status:"Present", photo:"NK" },
  ],
};

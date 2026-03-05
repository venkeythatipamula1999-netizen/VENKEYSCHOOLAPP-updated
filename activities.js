import { C } from '../theme/colors';

export const SCHOOL_EVENTS = [
  { id:1, title:"Annual Science Fair", date:"Feb 28, 2025", time:"9:00 AM", venue:"School Auditorium", type:"Academic", classes:"All Classes", icon:"\uD83D\uDD2C", color:"#00B8A9", status:"Upcoming", desc:"Students present their science projects. Parents invited.", reg:true },
  { id:2, title:"Sports Day 2025", date:"Mar 8, 2025", time:"8:00 AM", venue:"School Grounds", type:"Sports", classes:"All Classes", icon:"\uD83C\uDFC6", color:"#FF6B6B", status:"Upcoming", desc:"Annual Sports Day with track & field events for all grades.", reg:false },
  { id:3, title:"Cultural Fest – Kaleidoscope", date:"Mar 22, 2025", time:"10:00 AM", venue:"Main Hall", type:"Cultural", classes:"All Classes", icon:"\uD83C\uDFAD", color:"#A78BFA", status:"Upcoming", desc:"Inter-class cultural performances, dance, drama, and music.", reg:true },
  { id:4, title:"PTM – Parent-Teacher Meet", date:"Mar 15, 2025", time:"10:00 AM", venue:"Respective Classrooms", type:"Academic", classes:"All Classes", icon:"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67", color:"#E8A21A", status:"Upcoming", desc:"Quarterly parent-teacher interaction session.", reg:false },
  { id:5, title:"Inter-School Debate", date:"Apr 5, 2025", time:"11:00 AM", venue:"District Auditorium", type:"Academic", classes:"9-A, 10-A", icon:"\uD83C\uDF99\uFE0F", color:"#60A5FA", status:"Upcoming", desc:"District-level inter-school debate competition.", reg:true },
  { id:6, title:"Art & Craft Exhibition", date:"Apr 12, 2025", time:"9:30 AM", venue:"School Gallery", type:"Arts", classes:"8-A, 8-B, 9-A", icon:"\uD83C\uDFA8", color:"#7C5CBF", status:"Upcoming", desc:"Student artwork on display. Best works receive awards.", reg:false },
  { id:7, title:"Republic Day Celebration", date:"Jan 26, 2025", time:"8:30 AM", venue:"School Grounds", type:"Cultural", classes:"All Classes", icon:"\uD83C\uDDEE\uD83C\uDDF3", color:"#FB923C", status:"Completed", desc:"Flag hoisting and cultural programme.", reg:false },
  { id:8, title:"Unit 4 Exam Week", date:"Jan 27–31, 2025", time:"9:00 AM", venue:"Respective Classrooms", type:"Academic", classes:"All Classes", icon:"\uD83D\uDCDD", color:"#E8A21A", status:"Completed", desc:"Unit 4 examinations for all classes.", reg:false },
];

export const CLASS_ACTIVITIES = {
  "Grade 8-A": [
    { id:"c1a1", title:"Maths Olympiad Winner", date:"Nov 2024", icon:"\uD83C\uDFC6", color:"#E8A21A", type:"Academic", result:"1st Place", students:"Sneha Pillai, Karthik Rajan" },
    { id:"c1a2", title:"Science Fair – Best Project", date:"Jan 2025", icon:"\uD83D\uDD2C", color:"#00B8A9", type:"Science", result:"Best Project", students:"Arjun Kumar, Rohit Menon" },
    { id:"c1a3", title:"Cultural Fest – Folk Dance", date:"Sep 2024", icon:"\uD83D\uDC83", color:"#A78BFA", type:"Cultural", result:"1st Place", students:"Meenakshi Iyer, Divya Sharma" },
    { id:"c1a4", title:"Cleanest Classroom Award", date:"Dec 2024", icon:"\u2B50", color:"#34D399", type:"Community", result:"Class Award", students:"Entire Class" },
  ],
  "Grade 8-B": [
    { id:"c2a1", title:"Inter-Class Quiz Champions", date:"Oct 2024", icon:"\uD83E\uDDE0", color:"#60A5FA", type:"Academic", result:"1st Place", students:"Kavya Reddy, Ananya Krishnan" },
    { id:"c2a2", title:"Drama Club – Best Cast", date:"Dec 2024", icon:"\uD83C\uDFAD", color:"#A78BFA", type:"Cultural", result:"Best Cast", students:"Lavanya Suresh, Vikram Singh" },
    { id:"c2a3", title:"Kabaddi Champions", date:"Oct 2024", icon:"\uD83C\uDFC5", color:"#FF6B6B", type:"Sports", result:"1st Place", students:"Harish Nambiar, Vikram Singh" },
  ],
  "Grade 9-A": [
    { id:"c3a1", title:"District Debate Winner", date:"Jan 2025", icon:"\uD83C\uDF99\uFE0F", color:"#E8A21A", type:"Academic", result:"1st – District", students:"Nithya Chandran, Rahul Varma" },
    { id:"c3a2", title:"Robotics Project – Best Innovation", date:"Nov 2024", icon:"\uD83E\uDD16", color:"#60A5FA", type:"Tech", result:"Best Innovation", students:"Gowtham Raj, Ashwin Kumar" },
    { id:"c3a3", title:"Sports Day – Relay Winners", date:"Nov 2024", icon:"\uD83C\uDFC3", color:"#FF6B6B", type:"Sports", result:"Champions", students:"Gowtham Raj, Ashwin Kumar, Rahul Varma" },
  ],
  "Grade 9-B": [
    { id:"c4a1", title:"Science Olympiad – District", date:"Dec 2024", icon:"\uD83D\uDD2C", color:"#00B8A9", type:"Science", result:"2nd – District", students:"Sangeetha Nair, Deepika Mohan" },
    { id:"c4a2", title:"Art Exhibition Excellence", date:"Jan 2025", icon:"\uD83C\uDFA8", color:"#7C5CBF", type:"Arts", result:"Excellence", students:"Deepika Mohan, Rekha Prabhu" },
  ],
  "Grade 10-A": [
    { id:"c5a1", title:"Board Prep – Best Attendance", date:"Jan 2025", icon:"\uD83D\uDCC5", color:"#34D399", type:"Academic", result:"100% Attend.", students:"Surya Prakash, Thenmozhi S." },
    { id:"c5a2", title:"Coding Club Champions", date:"Nov 2024", icon:"\uD83D\uDCBB", color:"#60A5FA", type:"Tech", result:"1st Place", students:"Karan Mehta, Arun Selvam" },
    { id:"c5a3", title:"Cultural Fest – Drama Lead", date:"Sep 2024", icon:"\uD83C\uDFAD", color:"#A78BFA", type:"Cultural", result:"Lead Role", students:"Thenmozhi S., Janani Krishnan" },
  ],
  "Grade 10-B": [
    { id:"c6a1", title:"Environmental Awareness Project", date:"Dec 2024", icon:"\uD83C\uDF31", color:"#34D399", type:"Community", result:"District Award", students:"Pooja Sundaram, Haritha Mohan" },
    { id:"c6a2", title:"Chess Tournament Finalists", date:"Oct 2024", icon:"\u265F\uFE0F", color:"#60A5FA", type:"Sports", result:"Runners-up", students:"Prashanth Dev, Vignesh Raman" },
  ],
};

export const SCHOOL_ACHIEVEMENTS = [
  { id:"sa1", title:"Best School Award – District 2024", icon:"\uD83C\uDFC6", color:"#E8A21A", date:"Dec 2024", awardedBy:"District Education Office", level:"District", desc:"Awarded for overall excellence in academics, sports and co-curricular activities." },
  { id:"sa2", title:"100% Board Results – 5 Consecutive Yrs", icon:"\u2B50", color:"#00B8A9", date:"Apr 2024", awardedBy:"Tamil Nadu Board of Education", level:"State", desc:"All Grade 12 students passed with distinction for 5 years in a row." },
  { id:"sa3", title:"Green School Certification", icon:"\uD83C\uDF31", color:"#34D399", date:"Oct 2024", awardedBy:"National Green Schools Programme", level:"National", desc:"Certified for eco-friendly campus with solar panels, rain-water harvesting and a bio-diversity garden." },
  { id:"sa4", title:"Sports Excellence Shield – 2024", icon:"\uD83C\uDFC5", color:"#FF6B6B", date:"Nov 2024", awardedBy:"District Sports Authority", level:"District", desc:"Winner of the inter-school sports shield across 5 disciplines." },
  { id:"sa5", title:"Digital Innovation School – 2024", icon:"\uD83D\uDCBB", color:"#60A5FA", date:"Sep 2024", awardedBy:"CBSE Digital Innovation Programme", level:"National", desc:"Recognised for integrating robotics, coding, and AI labs into the curriculum." },
];

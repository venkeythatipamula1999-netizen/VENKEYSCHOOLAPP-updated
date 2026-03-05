export const CLEANER_DEFAULT = {
  name: "Muthu S.", id: "CLN-022", phone: "+91 87654 32109",
  experience: "5 yrs", joined: "March 2020", photo: "MS",
  bus: { number: "TN 01 AB 4521", route: "Route 7 – Velachery ↔ School", capacity: 42 },
  driver: { name: "Rajan Kumar", id: "DRV-041", phone: "+91 98765 43210", photo: "RK" },
};

export const STUDENTS_INIT = [
  { id: 1,  name: "Arjun Sharma", cls: "Grade 8A",  stop: "Velachery Signal",   photo: "AS", absent: false, scanCount: 0 },
  { id: 2,  name: "Priya Nair",   cls: "Grade 6B",  stop: "Velachery Signal",   photo: "PN", absent: false, scanCount: 0 },
  { id: 3,  name: "Karthik R.",   cls: "Grade 9A",  stop: "Medavakkam Main Rd", photo: "KR", absent: true,  scanCount: 0 },
  { id: 4,  name: "Sneha M.",     cls: "Grade 7C",  stop: "Medavakkam Main Rd", photo: "SM", absent: false, scanCount: 0 },
  { id: 5,  name: "Dev Patel",    cls: "Grade 5A",  stop: "Perungudi Flyover",  photo: "DP", absent: false, scanCount: 0 },
  { id: 6,  name: "Ananya K.",    cls: "Grade 10B", stop: "OMR Junction",       photo: "AK", absent: false, scanCount: 0 },
  { id: 7,  name: "Rohan Das",    cls: "Grade 4A",  stop: "OMR Junction",       photo: "RD", absent: true,  scanCount: 0 },
  { id: 8,  name: "Meera T.",     cls: "Grade 3B",  stop: "Karapakkam",         photo: "MT", absent: false, scanCount: 0 },
  { id: 9,  name: "Vivek B.",     cls: "Grade 6A",  stop: "Sholinganallur",     photo: "VB", absent: false, scanCount: 0 },
  { id: 10, name: "Ishaan P.",    cls: "Grade 2A",  stop: "Sholinganallur",     photo: "IP", absent: false, scanCount: 0 },
];

export const PHASE_INFO = [
  { label: "Boarding at Home Stop",  icon: "⬆", session: "Morning", color: "#00B8A9", desc: "Student picked up from home stop" },
  { label: "Deboarding at School",   icon: "⬇", session: "Morning", color: "#E8A21A", desc: "Student dropped at school gate"   },
  { label: "Boarding at School",     icon: "⬆", session: "Evening", color: "#00B8A9", desc: "Student picked up from school"    },
  { label: "Deboarding at Home",     icon: "⬇", session: "Evening", color: "#E8A21A", desc: "Student dropped at home stop"     },
];

export const NOTIFS_INIT = [
  { id: 1, type: "absent",  title: "Karthik R. marked absent",        body: "Grade 9A – skip Medavakkam stop",     time: "6:30 AM", icon: "❌", color: "#FF6B6B", read: false },
  { id: 2, type: "absent",  title: "Rohan Das marked absent",          body: "Grade 4A – skip OMR Junction stop",   time: "6:31 AM", icon: "❌", color: "#FF6B6B", read: false },
  { id: 3, type: "route",   title: "Route update from admin",          body: "Skip Perungudi – road block today",   time: "6:45 AM", icon: "🚧", color: "#E8A21A", read: false },
  { id: 4, type: "general", title: "Scan session started",             body: "GPS activated for morning route",     time: "7:00 AM", icon: "📡", color: "#00B8A9", read: true  },
  { id: 5, type: "general", title: "Bus reached school",               body: "8 students delivered safely",         time: "8:15 AM", icon: "🏫", color: "#34D399", read: true  },
  { id: 6, type: "general", title: "Evening route at 3:30 PM",         body: "Please be at school gate by 3:25 PM", time: "2:00 PM", icon: "🕒", color: "#7C5CBF", read: true  },
];

export const LEAVE_INIT = [
  { id: 1, type: "Sick Leave",      from: "Jan 8",  to: "Jan 8",  days: 1, status: "Approved", reason: "Fever"        },
  { id: 2, type: "Casual Leave",    from: "Dec 20", to: "Dec 20", days: 1, status: "Approved", reason: "Family event" },
  { id: 3, type: "Emergency Leave", from: "Nov 10", to: "Nov 11", days: 2, status: "Rejected", reason: "Personal"     },
];

export const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Emergency Leave", "Earned Leave"];

export const DURATIONS = [
  { day: "Mon",   m: 48, e: 52 },
  { day: "Tue",   m: 44, e: 47 },
  { day: "Wed",   m: 51, e: 55 },
  { day: "Thu",   m: 46, e: 49 },
  { day: "Fri",   m: 43, e: 50 },
  { day: "Sat",   m: 39, e: 0  },
  { day: "Today", m: 45, e: 38 },
];

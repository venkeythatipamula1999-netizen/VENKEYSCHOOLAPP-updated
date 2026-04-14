export const CLEANER_DEFAULT = {
  name: "Muthu S.", id: "CLN-022", phone: "+91 87654 32109",
  experience: "5 yrs", joined: "March 2020", photo: "MS",
  bus: { number: "TN 01 AB 4521", route: "Route 7 – Velachery \u2194 School", capacity: 42 },
  driver: { name: "Rajan Kumar", id: "DRV-041", phone: "+91 98765 43210", photo: "RK" },
};

export const PHASE_INFO = [
  { label: "Boarding at Home Stop",  icon: "\u2B06", session: "Morning", color: "#00B8A9", desc: "Student picked up from home stop" },
  { label: "Deboarding at School",   icon: "\u2B07", session: "Morning", color: "#E8A21A", desc: "Student dropped at school gate"   },
  { label: "Boarding at School",     icon: "\u2B06", session: "Evening", color: "#00B8A9", desc: "Student picked up from school"    },
  { label: "Deboarding at Home",     icon: "\u2B07", session: "Evening", color: "#E8A21A", desc: "Student dropped at home stop"     },
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

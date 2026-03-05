export const DRIVER_DEFAULT = {
  name: "Rajan Kumar", id: "DRV-041", phone: "+91 98765 43210",
  license: "TN-0920210003456", experience: "8 yrs", joined: "June 2017", photo: "RK",
  bus: { number: "TN 01 AB 4521", route: "Route 7 – Velachery \u2194 School", capacity: 42 },
  cleaner: { name: "Muthu S.", id: "CLN-022", phone: "+91 87654 32109", photo: "MS" },
};

export const TODAY_SCANS = [
  { id: 1, student: "Arjun Sharma",  cls: "Grade 8A",  time: "06:48 AM", type: "board",  stop: "Velachery Signal",   photo: "AS" },
  { id: 2, student: "Priya Nair",    cls: "Grade 6B",  time: "06:53 AM", type: "board",  stop: "Medavakkam Main Rd", photo: "PN" },
  { id: 3, student: "Karthik R.",    cls: "Grade 9A",  time: "07:02 AM", type: "board",  stop: "Perungudi Flyover",  photo: "KR" },
  { id: 4, student: "Sneha M.",      cls: "Grade 7C",  time: "07:09 AM", type: "board",  stop: "OMR Junction",       photo: "SM" },
  { id: 5, student: "Dev Patel",     cls: "Grade 5A",  time: "07:18 AM", type: "board",  stop: "Karapakkam",         photo: "DP" },
  { id: 6, student: "Ananya K.",     cls: "Grade 10B", time: "07:24 AM", type: "board",  stop: "Sholinganallur",     photo: "AK" },
  { id: 7, student: "Arjun Sharma",  cls: "Grade 8A",  time: "03:52 PM", type: "alight", stop: "Velachery Signal",   photo: "AS" },
  { id: 8, student: "Priya Nair",    cls: "Grade 6B",  time: "03:59 PM", type: "alight", stop: "Medavakkam Main Rd", photo: "PN" },
  { id: 9, student: "Sneha M.",      cls: "Grade 7C",  time: "04:07 PM", type: "alight", stop: "OMR Junction",       photo: "SM" },
];

export const DURATION_DATA = [
  { day: "Mon",   morning: 48, evening: 52 },
  { day: "Tue",   morning: 44, evening: 47 },
  { day: "Wed",   morning: 51, evening: 55 },
  { day: "Thu",   morning: 46, evening: 49 },
  { day: "Fri",   morning: 43, evening: 50 },
  { day: "Sat",   morning: 39, evening: 0  },
  { day: "Today", morning: 45, evening: 38 },
];

export const LEAVE_HISTORY_INIT = [
  { id: 1, type: "Sick Leave",      from: "Jan 10", to: "Jan 11", days: 2, status: "Approved", reason: "Fever"         },
  { id: 2, type: "Emergency Leave", from: "Dec 22", to: "Dec 22", days: 1, status: "Approved", reason: "Family matter" },
  { id: 3, type: "Casual Leave",    from: "Nov 15", to: "Nov 16", days: 2, status: "Rejected", reason: "Personal"      },
];

export const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Emergency Leave", "Earned Leave"];

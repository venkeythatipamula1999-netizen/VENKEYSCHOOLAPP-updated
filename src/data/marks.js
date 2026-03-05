import { C } from '../theme/colors';

export const UNITS_DATA = [
  {
    id: "u1", label: "Unit - 1", date: "Aug 2024", total: 600,
    subjects: [
      { name: "Mathematics", short: "Math", marks: 82, max: 100, color: C.gold, grade: "A" },
      { name: "Science", short: "Sci", marks: 88, max: 100, color: C.teal, grade: "A+" },
      { name: "English", short: "Eng", marks: 74, max: 100, color: C.purple, grade: "B+" },
      { name: "Social Studies", short: "Soc", marks: 79, max: 100, color: C.coral, grade: "B+" },
      { name: "Tamil", short: "Tam", marks: 91, max: 100, color: "#34D399", grade: "A+" },
      { name: "Computer", short: "Comp", marks: 85, max: 100, color: "#60A5FA", grade: "A" },
    ],
  },
  {
    id: "u2", label: "Unit - 2", date: "Oct 2024", total: 600,
    subjects: [
      { name: "Mathematics", short: "Math", marks: 88, max: 100, color: C.gold, grade: "A" },
      { name: "Science", short: "Sci", marks: 92, max: 100, color: C.teal, grade: "A+" },
      { name: "English", short: "Eng", marks: 78, max: 100, color: C.purple, grade: "B+" },
      { name: "Social Studies", short: "Soc", marks: 84, max: 100, color: C.coral, grade: "A" },
      { name: "Tamil", short: "Tam", marks: 95, max: 100, color: "#34D399", grade: "A+" },
      { name: "Computer", short: "Comp", marks: 90, max: 100, color: "#60A5FA", grade: "A+" },
    ],
  },
  {
    id: "u3", label: "Unit - 3", date: "Dec 2024", total: 600,
    subjects: [
      { name: "Mathematics", short: "Math", marks: 91, max: 100, color: C.gold, grade: "A+" },
      { name: "Science", short: "Sci", marks: 89, max: 100, color: C.teal, grade: "A+" },
      { name: "English", short: "Eng", marks: 83, max: 100, color: C.purple, grade: "A" },
      { name: "Social Studies", short: "Soc", marks: 87, max: 100, color: C.coral, grade: "A" },
      { name: "Tamil", short: "Tam", marks: 96, max: 100, color: "#34D399", grade: "A+" },
      { name: "Computer", short: "Comp", marks: 93, max: 100, color: "#60A5FA", grade: "A+" },
    ],
  },
  {
    id: "u4", label: "Unit - 4", date: "Jan 2025", total: 600,
    subjects: [
      { name: "Mathematics", short: "Math", marks: 94, max: 100, color: C.gold, grade: "A+" },
      { name: "Science", short: "Sci", marks: 90, max: 100, color: C.teal, grade: "A+" },
      { name: "English", short: "Eng", marks: 86, max: 100, color: C.purple, grade: "A" },
      { name: "Social Studies", short: "Soc", marks: 88, max: 100, color: C.coral, grade: "A" },
      { name: "Tamil", short: "Tam", marks: 98, max: 100, color: "#34D399", grade: "A+" },
      { name: "Computer", short: "Comp", marks: 95, max: 100, color: "#60A5FA", grade: "A+" },
    ],
  },
];

export function getGradeColor(g) {
  if (g === "A+") return C.teal;
  if (g === "A") return C.gold;
  if (g === "B+") return C.coral;
  return C.muted;
}

export const STUDENTS_DATA = [
  {
    id: 0, name: "Aarav Kumar", roll: 1, grade: "8-A", initials: "AK",
    color: C.teal, attendance: 94,
    units: [
      { ...UNITS_DATA[0], subjects: UNITS_DATA[0].subjects.map((s, si) => ({ ...s, marks: [88, 90, 76, 82, 95, 89][si] })) },
      { ...UNITS_DATA[1], subjects: UNITS_DATA[1].subjects.map((s, si) => ({ ...s, marks: [91, 93, 79, 85, 97, 92][si] })) },
      { ...UNITS_DATA[2], subjects: UNITS_DATA[2].subjects.map((s, si) => ({ ...s, marks: [93, 88, 82, 87, 98, 94][si] })) },
      { ...UNITS_DATA[3], subjects: UNITS_DATA[3].subjects.map((s, si) => ({ ...s, marks: [96, 91, 85, 90, 99, 95][si] })) },
    ],
  },
  {
    id: 1, name: "Priya Rajan", roll: 2, grade: "8-A", initials: "PR",
    color: C.coral, attendance: 88,
    units: [
      { ...UNITS_DATA[0], subjects: UNITS_DATA[0].subjects.map((s, si) => ({ ...s, marks: [72, 80, 68, 74, 88, 76][si] })) },
      { ...UNITS_DATA[1], subjects: UNITS_DATA[1].subjects.map((s, si) => ({ ...s, marks: [75, 83, 71, 77, 90, 79][si] })) },
      { ...UNITS_DATA[2], subjects: UNITS_DATA[2].subjects.map((s, si) => ({ ...s, marks: [78, 85, 74, 80, 92, 82][si] })) },
      { ...UNITS_DATA[3], subjects: UNITS_DATA[3].subjects.map((s, si) => ({ ...s, marks: [80, 87, 76, 83, 93, 84][si] })) },
    ],
  },
  {
    id: 2, name: "Vikram S", roll: 3, grade: "8-A", initials: "VS",
    color: C.gold, attendance: 96,
    units: [
      { ...UNITS_DATA[0], subjects: UNITS_DATA[0].subjects.map((s, si) => ({ ...s, marks: [91, 86, 83, 88, 94, 90][si] })) },
      { ...UNITS_DATA[1], subjects: UNITS_DATA[1].subjects.map((s, si) => ({ ...s, marks: [93, 89, 86, 90, 96, 92][si] })) },
      { ...UNITS_DATA[2], subjects: UNITS_DATA[2].subjects.map((s, si) => ({ ...s, marks: [95, 91, 88, 92, 97, 94][si] })) },
      { ...UNITS_DATA[3], subjects: UNITS_DATA[3].subjects.map((s, si) => ({ ...s, marks: [97, 93, 90, 94, 99, 96][si] })) },
    ],
  },
  {
    id: 3, name: "Ananya M", roll: 4, grade: "8-A", initials: "AM",
    color: C.purple, attendance: 82,
    units: [
      { ...UNITS_DATA[0], subjects: UNITS_DATA[0].subjects.map((s, si) => ({ ...s, marks: [65, 70, 60, 68, 78, 72][si] })) },
      { ...UNITS_DATA[1], subjects: UNITS_DATA[1].subjects.map((s, si) => ({ ...s, marks: [68, 73, 63, 71, 81, 75][si] })) },
      { ...UNITS_DATA[2], subjects: UNITS_DATA[2].subjects.map((s, si) => ({ ...s, marks: [72, 76, 67, 74, 84, 78][si] })) },
      { ...UNITS_DATA[3], subjects: UNITS_DATA[3].subjects.map((s, si) => ({ ...s, marks: [75, 79, 70, 77, 87, 81][si] })) },
    ],
  },
  {
    id: 4, name: "Karan P", roll: 5, grade: "8-A", initials: "KP",
    color: "#60A5FA", attendance: 90,
    units: [
      { ...UNITS_DATA[0], subjects: UNITS_DATA[0].subjects.map((s, si) => ({ ...s, marks: [78, 82, 75, 79, 88, 83][si] })) },
      { ...UNITS_DATA[1], subjects: UNITS_DATA[1].subjects.map((s, si) => ({ ...s, marks: [81, 85, 78, 82, 91, 86][si] })) },
      { ...UNITS_DATA[2], subjects: UNITS_DATA[2].subjects.map((s, si) => ({ ...s, marks: [84, 87, 80, 85, 93, 88][si] })) },
      { ...UNITS_DATA[3], subjects: UNITS_DATA[3].subjects.map((s, si) => ({ ...s, marks: [86, 89, 83, 88, 94, 90][si] })) },
    ],
  },
  {
    id: 5, name: "Deepika R", roll: 6, grade: "8-A", initials: "DR",
    color: "#34D399", attendance: 98,
    units: [
      { ...UNITS_DATA[0], subjects: UNITS_DATA[0].subjects.map((s, si) => ({ ...s, marks: [95, 92, 89, 91, 98, 93][si] })) },
      { ...UNITS_DATA[1], subjects: UNITS_DATA[1].subjects.map((s, si) => ({ ...s, marks: [96, 94, 91, 93, 99, 95][si] })) },
      { ...UNITS_DATA[2], subjects: UNITS_DATA[2].subjects.map((s, si) => ({ ...s, marks: [97, 95, 92, 94, 99, 96][si] })) },
      { ...UNITS_DATA[3], subjects: UNITS_DATA[3].subjects.map((s, si) => ({ ...s, marks: [98, 96, 93, 95, 100, 97][si] })) },
    ],
  },
  {
    id: 6, name: "Rohit V", roll: 7, grade: "8-A", initials: "RV",
    color: C.coral, attendance: 78,
    units: [
      { ...UNITS_DATA[0], subjects: UNITS_DATA[0].subjects.map((s, si) => ({ ...s, marks: [60, 65, 55, 62, 70, 64][si] })) },
      { ...UNITS_DATA[1], subjects: UNITS_DATA[1].subjects.map((s, si) => ({ ...s, marks: [63, 68, 58, 65, 73, 67][si] })) },
      { ...UNITS_DATA[2], subjects: UNITS_DATA[2].subjects.map((s, si) => ({ ...s, marks: [66, 71, 61, 68, 76, 70][si] })) },
      { ...UNITS_DATA[3], subjects: UNITS_DATA[3].subjects.map((s, si) => ({ ...s, marks: [69, 74, 64, 71, 79, 73][si] })) },
    ],
  },
  {
    id: 7, name: "Sneha L", roll: 8, grade: "8-A", initials: "SL",
    color: C.purple, attendance: 92,
    units: [
      { ...UNITS_DATA[0], subjects: UNITS_DATA[0].subjects.map((s, si) => ({ ...s, marks: [83, 87, 80, 84, 92, 86][si] })) },
      { ...UNITS_DATA[1], subjects: UNITS_DATA[1].subjects.map((s, si) => ({ ...s, marks: [86, 89, 83, 87, 94, 89][si] })) },
      { ...UNITS_DATA[2], subjects: UNITS_DATA[2].subjects.map((s, si) => ({ ...s, marks: [88, 91, 85, 89, 95, 91][si] })) },
      { ...UNITS_DATA[3], subjects: UNITS_DATA[3].subjects.map((s, si) => ({ ...s, marks: [90, 93, 87, 91, 96, 93][si] })) },
    ],
  },
];

export const CLASS_STUDENTS = {
  1: [
    { id: "8a1", name: "Aarav Kumar", roll: 1, att: 94, photo: "AK", rank: 3 },
    { id: "8a2", name: "Deepika R", roll: 2, att: 98, photo: "DR", rank: 1 },
    { id: "8a3", name: "Vikram S", roll: 3, att: 96, photo: "VS", rank: 2 },
    { id: "8a4", name: "Priya Rajan", roll: 4, att: 88, photo: "PR", rank: 5 },
    { id: "8a5", name: "Karan P", roll: 5, att: 90, photo: "KP", rank: 4 },
    { id: "8a6", name: "Ananya M", roll: 6, att: 82, photo: "AM", rank: 7 },
    { id: "8a7", name: "Sneha L", roll: 7, att: 92, photo: "SL", rank: 6 },
    { id: "8a8", name: "Rohit V", roll: 8, att: 78, photo: "RV", rank: 8 },
  ],
  2: [
    { id: "8b1", name: "Arjun Kumar", roll: 1, att: 91, photo: "AK", rank: 2 },
    { id: "8b2", name: "Meera S", roll: 2, att: 95, photo: "MS", rank: 1 },
    { id: "8b3", name: "Rahul M", roll: 3, att: 87, photo: "RM", rank: 4 },
    { id: "8b4", name: "Divya P", roll: 4, att: 93, photo: "DP", rank: 3 },
    { id: "8b5", name: "Sanjay K", roll: 5, att: 84, photo: "SK", rank: 5 },
    { id: "8b6", name: "Nisha R", roll: 6, att: 89, photo: "NR", rank: 6 },
  ],
  3: [
    { id: "9a1", name: "Aditya R", roll: 1, att: 96, photo: "AR", rank: 1 },
    { id: "9a2", name: "Kavya M", roll: 2, att: 93, photo: "KM", rank: 2 },
    { id: "9a3", name: "Rajesh K", roll: 3, att: 88, photo: "RK", rank: 4 },
    { id: "9a4", name: "Pooja S", roll: 4, att: 91, photo: "PS", rank: 3 },
    { id: "9a5", name: "Suresh V", roll: 5, att: 85, photo: "SV", rank: 5 },
  ],
  4: [
    { id: "9b1", name: "Lakshmi N", roll: 1, att: 97, photo: "LN", rank: 1 },
    { id: "9b2", name: "Ganesh P", roll: 2, att: 90, photo: "GP", rank: 3 },
    { id: "9b3", name: "Harini S", roll: 3, att: 94, photo: "HS", rank: 2 },
    { id: "9b4", name: "Mohan K", roll: 4, att: 86, photo: "MK", rank: 4 },
    { id: "9b5", name: "Preethi R", roll: 5, att: 92, photo: "PR", rank: 5 },
    { id: "9b6", name: "Venkat M", roll: 6, att: 83, photo: "VM", rank: 6 },
    { id: "9b7", name: "Swetha K", roll: 7, att: 89, photo: "SK", rank: 7 },
  ],
  5: [
    { id: "10a1", name: "Ashwin R", roll: 1, att: 95, photo: "AR", rank: 2 },
    { id: "10a2", name: "Bhavani K", roll: 2, att: 98, photo: "BK", rank: 1 },
    { id: "10a3", name: "Dinesh M", roll: 3, att: 87, photo: "DM", rank: 4 },
    { id: "10a4", name: "Gayathri S", roll: 4, att: 93, photo: "GS", rank: 3 },
    { id: "10a5", name: "Hari P", roll: 5, att: 81, photo: "HP", rank: 6 },
    { id: "10a6", name: "Indira V", roll: 6, att: 90, photo: "IV", rank: 5 },
  ],
  6: [
    { id: "10b1", name: "Jayesh N", roll: 1, att: 94, photo: "JN", rank: 1 },
    { id: "10b2", name: "Keerthi M", roll: 2, att: 91, photo: "KM", rank: 3 },
    { id: "10b3", name: "Logesh R", roll: 3, att: 96, photo: "LR", rank: 2 },
    { id: "10b4", name: "Malar S", roll: 4, att: 88, photo: "MS", rank: 4 },
    { id: "10b5", name: "Naveen K", roll: 5, att: 85, photo: "NK", rank: 5 },
  ],
};

export function getStudentMarks(studentId) {
  const seed = typeof studentId === "string"
    ? studentId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
    : studentId * 37;
  const base = 60 + (seed % 30);
  return [0, 1, 2, 3].map((ui) => ({
    ...UNITS_DATA[ui],
    subjects: UNITS_DATA[ui].subjects.map((s, si) => {
      const m = Math.min(100, Math.max(40, base + ((si * 7 + ui * 5 + seed) % 25) - 8 + ui * 3));
      return { ...s, marks: m, grade: m >= 90 ? "A+" : m >= 75 ? "A" : m >= 60 ? "B+" : "B" };
    }),
  }));
}

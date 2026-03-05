export const MONTHS_ATT = [
  {
    id: "aug", label: "August", year: 2024, workingDays: 26,
    weeks: [
      [null, null, null, 1, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 0, 1, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 1, 0, 1, null, null],
    ],
    absentDates: [14, 23],
  },
  {
    id: "sep", label: "September", year: 2024, workingDays: 25,
    weeks: [
      [null, null, null, null, null, null, 1],
      [1, 1, 1, 1, 1, null, null],
      [1, 0, 1, 1, 1, null, null],
      [1, 1, 0, 1, 1, null, null],
      [1, 1, 1, 1, 0, null, null],
    ],
    absentDates: [10, 18, 27],
  },
  {
    id: "oct", label: "October", year: 2024, workingDays: 27,
    weeks: [
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 1, 0, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 1, null, null, null, null],
    ],
    absentDates: [17],
  },
  {
    id: "nov", label: "November", year: 2024, workingDays: 24,
    weeks: [
      [null, null, null, null, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 0, 1, 1, null, null],
      [1, 1, 1, 1, 0, null, null],
      [1, 1, null, null, null, null, null],
    ],
    absentDates: [13, 22],
  },
  {
    id: "dec", label: "December", year: 2024, workingDays: 22,
    weeks: [
      [null, null, null, null, null, null, 1],
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
    ],
    absentDates: [],
  },
  {
    id: "jan", label: "January", year: 2025, workingDays: 25,
    weeks: [
      [null, null, null, 1, 1, null, null],
      [1, 1, 0, 1, 1, null, null],
      [1, 1, 1, 1, 1, null, null],
      [1, 0, 1, 1, 1, null, null],
      [1, 1, null, null, null, null, null],
    ],
    absentDates: [8, 21],
  },
];

export function getPresent(m) {
  return m.workingDays - m.absentDates.length;
}

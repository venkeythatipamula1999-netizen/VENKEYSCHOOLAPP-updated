'use strict';

const FA_TABLE = [
  { min: 18.5, grade: 'A1', points: 10, color: '#059669' },
  { min: 16.5, grade: 'A2', points: 9,  color: '#10b981' },
  { min: 14.5, grade: 'B1', points: 8,  color: '#3b82f6' },
  { min: 12.5, grade: 'B2', points: 7,  color: '#6366f1' },
  { min: 10.5, grade: 'C1', points: 6,  color: '#f59e0b' },
  { min: 8.5,  grade: 'C2', points: 5,  color: '#f97316' },
  { min: 7.0,  grade: 'D',  points: 4,  color: '#ef4444' },
  { min: 0,    grade: 'E',  points: 3,  color: '#dc2626' },
];

const SA_MAIN_TABLE = [
  { min: 91, grade: 'A1', points: 10, color: '#059669' },
  { min: 81, grade: 'A2', points: 9,  color: '#10b981' },
  { min: 71, grade: 'B1', points: 8,  color: '#3b82f6' },
  { min: 61, grade: 'B2', points: 7,  color: '#6366f1' },
  { min: 51, grade: 'C1', points: 6,  color: '#f59e0b' },
  { min: 41, grade: 'C2', points: 5,  color: '#f97316' },
  { min: 35, grade: 'D',  points: 4,  color: '#ef4444' },
  { min: 0,  grade: 'E',  points: 3,  color: '#dc2626' },
];

const SA_HINDI_TABLE = [
  { min: 91, grade: 'A1', points: 10, color: '#059669' },
  { min: 80, grade: 'A2', points: 9,  color: '#10b981' },
  { min: 68, grade: 'B1', points: 8,  color: '#3b82f6' },
  { min: 56, grade: 'B2', points: 7,  color: '#6366f1' },
  { min: 44, grade: 'C1', points: 6,  color: '#f59e0b' },
  { min: 32, grade: 'C2', points: 5,  color: '#f97316' },
  { min: 20, grade: 'D',  points: 4,  color: '#ef4444' },
  { min: 0,  grade: 'E',  points: 3,  color: '#dc2626' },
];

function applyTable(value, table) {
  for (const row of table) {
    if (Number(value) >= row.min) return { grade: row.grade, points: row.points, color: row.color };
  }
  return { grade: 'E', points: 3, color: '#dc2626' };
}

export function getFAGrade(marks)             { return applyTable(marks, FA_TABLE); }
export function getSAGrade(pct, subjectId)    { return applyTable(pct, subjectId === 'Hindi' ? SA_HINDI_TABLE : SA_MAIN_TABLE); }
export function getFinalGrade(score)          { return applyTable(score, SA_MAIN_TABLE); }

export const MAX_MARKS       = { FA1: 20, FA2: 20, FA3: 20, FA4: 20, SA1: 80, SA2: 80 };
export const VALID_EXAM_TYPES = ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2'];
export const SUBJECTS        = ['Telugu', 'English', 'Mathematics', 'Science', 'Social Studies', 'Hindi'];
export const ACADEMIC_YEARS  = ['2024-25', '2025-26', '2026-27'];

export const GRADE_COLORS = {
  A1: '#059669', A2: '#10b981', B1: '#3b82f6', B2: '#6366f1',
  C1: '#f59e0b', C2: '#f97316', D: '#ef4444',  E:  '#dc2626',
};

export function isSAExam(examType) { return examType === 'SA1' || examType === 'SA2'; }
export function isFAExam(examType) { return examType && examType.startsWith('FA'); }

export function getPrecedingFAs(examType) {
  if (examType === 'SA1') return ['FA1', 'FA2'];
  if (examType === 'SA2') return ['FA3', 'FA4'];
  return [];
}

export function calcHalfYear(fa1, fa2, sa1) {
  const faTotal  = (Number(fa1) || 0) + (Number(fa2) || 0);
  const faWeight = (faTotal / 40) * 20;
  const hy       = faWeight + (Number(sa1) || 0);
  return { faTotal, faWeight: parseFloat(faWeight.toFixed(2)), halfYear: parseFloat(hy.toFixed(2)) };
}

export function calcFinal(fa1, fa2, fa3, fa4, sa1, sa2) {
  const faTotal  = [fa1, fa2, fa3, fa4].reduce((s, v) => s + (Number(v) || 0), 0);
  const faWeight = (faTotal / 80) * 40;
  const saTotal  = (Number(sa1) || 0) + (Number(sa2) || 0);
  const saWeight = (saTotal / 160) * 60;
  const final    = faWeight + saWeight;
  return {
    faTotal, faWeight: parseFloat(faWeight.toFixed(2)),
    saTotal, saWeight: parseFloat(saWeight.toFixed(2)),
    finalScore: parseFloat(final.toFixed(2)),
  };
}

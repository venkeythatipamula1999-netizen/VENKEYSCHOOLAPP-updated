'use strict';

const FA_GRADES = [
  { min: 18.5, max: 20,    grade: 'A1', points: 10 },
  { min: 16.5, max: 18.49, grade: 'A2', points: 9  },
  { min: 14.5, max: 16.49, grade: 'B1', points: 8  },
  { min: 12.5, max: 14.49, grade: 'B2', points: 7  },
  { min: 10.5, max: 12.49, grade: 'C1', points: 6  },
  { min: 8.5,  max: 10.49, grade: 'C2', points: 5  },
  { min: 7.0,  max: 8.49,  grade: 'D',  points: 4  },
  { min: 0,    max: 6.99,  grade: 'E',  points: 3  },
];

const SA_MAIN_GRADES = [
  { min: 91, max: 100, grade: 'A1', points: 10 },
  { min: 81, max: 90,  grade: 'A2', points: 9  },
  { min: 71, max: 80,  grade: 'B1', points: 8  },
  { min: 61, max: 70,  grade: 'B2', points: 7  },
  { min: 51, max: 60,  grade: 'C1', points: 6  },
  { min: 41, max: 50,  grade: 'C2', points: 5  },
  { min: 35, max: 40,  grade: 'D',  points: 4  },
  { min: 0,  max: 34,  grade: 'E',  points: 3  },
];

const SA_HINDI_GRADES = [
  { min: 91, max: 100, grade: 'A1', points: 10 },
  { min: 80, max: 90,  grade: 'A2', points: 9  },
  { min: 68, max: 79,  grade: 'B1', points: 8  },
  { min: 56, max: 67,  grade: 'B2', points: 7  },
  { min: 44, max: 55,  grade: 'C1', points: 6  },
  { min: 32, max: 43,  grade: 'C2', points: 5  },
  { min: 20, max: 31,  grade: 'D',  points: 4  },
  { min: 0,  max: 19,  grade: 'E',  points: 3  },
];

function applyGrade(value, table) {
  for (const row of table) {
    if (value >= row.min && value <= row.max) {
      return { grade: row.grade, points: row.points };
    }
  }
  return { grade: 'E', points: 3 };
}

function getFAGrade(marks) {
  return applyGrade(Number(marks), FA_GRADES);
}

function getSAGrade(pct, subjectId) {
  const table = subjectId === 'Hindi' ? SA_HINDI_GRADES : SA_MAIN_GRADES;
  return applyGrade(Number(pct), table);
}

function getFinalGrade(score) {
  return applyGrade(Number(score), SA_MAIN_GRADES);
}

const MAX_MARKS        = { FA1: 20, FA2: 20, FA3: 20, FA4: 20, SA1: 80, SA2: 80 };
const VALID_EXAM_TYPES = ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2'];
const SECOND_LANG      = ['Hindi'];

module.exports = { getFAGrade, getSAGrade, getFinalGrade, MAX_MARKS, VALID_EXAM_TYPES, SECOND_LANG };

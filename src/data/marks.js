import { C } from '../theme/colors';

export function getGradeColor(g) {
  if (g === "A+") return C.teal;
  if (g === "A") return C.gold;
  if (g === "B+") return C.coral;
  return C.muted;
}

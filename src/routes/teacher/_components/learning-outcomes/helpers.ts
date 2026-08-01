import type { Coverage } from "./types";

// Coverage thresholds (derived from question→outcome assignment counts).
//   0 questions → none, 1 → limited, 2+ → covered.
export function coverageOf(count: number): Coverage {
  if (count <= 0) return "none";
  if (count === 1) return "limited";
  return "covered";
}

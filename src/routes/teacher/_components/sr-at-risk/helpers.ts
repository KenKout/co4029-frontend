import type { AtRiskStudent } from "@/lib/api/types";

import { FLAG_KEYS, type FlagKey } from "./constants";

export function activeFlagsOf(student: AtRiskStudent): FlagKey[] {
  return FLAG_KEYS.filter((k) => student[k]);
}

export function flagCountOf(student: AtRiskStudent): number {
  return (
    Number(student.low_compliance) +
    Number(student.frozen_kr) +
    Number(student.high_theory_practice_gap)
  );
}

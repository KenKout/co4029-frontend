import { AlertTriangle, Snowflake, TrendingDown } from "lucide-react";

import type { useTranslation } from "react-i18next";

/**
 * Flag catalogue for the at-risk roster, extracted from the former 293-line
 * `sr-at-risk.tsx` so the summary cards, the chips and the table columns read
 * from one source instead of three parallel switch chains.
 */

/** `t` exactly as the page's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

export const FLAG_KEYS = [
  "low_compliance",
  "frozen_kr",
  "high_theory_practice_gap",
] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

export const FLAG_ICONS: Record<FlagKey, typeof TrendingDown> = {
  low_compliance: TrendingDown,
  frozen_kr: Snowflake,
  high_theory_practice_gap: AlertTriangle,
};

export const FLAG_LABEL_KEYS: Record<
  FlagKey,
  { label: string; short: string; desc: string; action: string }
> = {
  low_compliance: {
    label: "teacher_sr_at_risk.flags.low_compliance_label",
    short: "teacher_sr_at_risk.flags.low_compliance_short",
    desc: "teacher_sr_at_risk.flags.low_compliance_desc",
    action: "teacher_sr_at_risk.flags.low_compliance_action",
  },
  frozen_kr: {
    label: "teacher_sr_at_risk.flags.frozen_kr_label",
    short: "teacher_sr_at_risk.flags.frozen_kr_short",
    desc: "teacher_sr_at_risk.flags.frozen_kr_desc",
    action: "teacher_sr_at_risk.flags.frozen_kr_action",
  },
  high_theory_practice_gap: {
    label: "teacher_sr_at_risk.flags.tp_gap_label",
    short: "teacher_sr_at_risk.flags.tp_gap_short",
    desc: "teacher_sr_at_risk.flags.tp_gap_desc",
    action: "teacher_sr_at_risk.flags.tp_gap_action",
  },
};

/** Route for one student's SR detail view. */
export const SR_DETAIL_TO =
  "/teacher/courses/$courseId/students/$studentId/sr" as const;

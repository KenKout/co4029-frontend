import type { useTranslation } from "react-i18next";

import type { StudentSrDetailLesson } from "@/lib/api/types";

/**
 * Constants and pure helpers for the teacher SR student-detail screen,
 * extracted from the former 331-line `sr-student-detail.tsx`.
 */

/** `t` exactly as the page's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

export const STATUS_KEY: Record<StudentSrDetailLesson["status"], string> = {
  mature: "sr_dashboard.status.mature",
  learning: "sr_dashboard.status.learning",
  locked: "sr_dashboard.status.locked",
};

export const STATUS_BADGE: Record<StudentSrDetailLesson["status"], string> = {
  mature: "bg-emerald-50 text-emerald-700 border-emerald-200",
  learning: "bg-amber-50 text-amber-700 border-amber-200",
  locked: "bg-slate-100 text-slate-600 border-slate-200",
};

// Maps a spaced-repetition easiness factor (EF) to a human difficulty
// bucket + colour, identical to the cohort page's efMeta so teachers see
// the same "Hard / Medium / Easier" language everywhere instead of a raw
// EF number. Lower EF = the student gets it wrong more often.
export function efMeta(ef: number) {
  if (ef < 1.6) {
    return {
      cls: "bg-red-100 text-red-700 border-red-200",
      labelKey: "teacher_sr_cohort.difficulty.hard",
    };
  }
  if (ef < 2.0) {
    return {
      cls: "bg-amber-100 text-amber-700 border-amber-200",
      labelKey: "teacher_sr_cohort.difficulty.medium",
    };
  }
  return {
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    labelKey: "teacher_sr_cohort.difficulty.easier",
  };
}

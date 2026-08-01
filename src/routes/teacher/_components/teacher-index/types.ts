import type { useTranslation } from "react-i18next";
import type { ClipboardCheck } from "lucide-react";

/**
 * Shared types for the teacher dashboard, extracted from the former 239-line
 * `teacher/index.tsx` so the signal tiles, the review queue and the course list
 * agree on one contract.
 */

/** `t` exactly as the page's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

/** One row of the Human-in-the-Loop review queue, before zero-count filtering. */
export interface ReviewCandidate {
  key: string;
  label: string;
  count: number;
  hint?: string;
  icon: typeof ClipboardCheck;
  to: string;
  tone: "amber" | "violet" | "sky";
}

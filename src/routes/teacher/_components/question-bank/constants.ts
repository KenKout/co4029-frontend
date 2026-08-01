import type { ReviewStatus } from "./types";

/**
 * Constant tables for the Question Bank, extracted from the former 2.4k-line
 * question-bank.tsx.
 *
 * The unified status control maps the existing `review_status` enum
 * (pending | approved | edited | rejected) onto the four teacher-facing labels
 * (Needs review | Approved | Draft | Has issues). This is the display order
 * used by every status menu and the status segmented filter.
 */
export const STATUS_ORDER: ReviewStatus[] = [
  "edited",
  "pending",
  "approved",
  "rejected",
];

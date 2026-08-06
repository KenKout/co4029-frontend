import {
  AlertTriangle,
  CheckCircle2,
  History,
  ListChecks,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Constant tables for the course-interview results screen. Each table replaces
 * one of the exhaustive ternary chains that used to be inlined in the results
 * branch of course-interview.tsx — same six phases, same values, in the same
 * order the chains tested them.
 */

/**
 * Verdict phase — drives the hero treatment.
 *
 * "retry" IS the failed verdict, and it now reads as one: an X on red, titled
 * "Not passed". It used to borrow the encouraging primary gradient and the
 * title "Interview completed" on the theory that a normal fail should not feel
 * punitive — but "completed" beside a retry arrow does not tell the candidate
 * they failed, which is the one thing the screen has to communicate. The
 * supportive framing lives in the summary line and the study plan below, where
 * it can be specific instead of ambiguous.
 *
 * `eval_failed` keeps its own red-with-warning-triangle treatment: a grader
 * crash is not the candidate's failure, so the two must stay visually distinct.
 */
export type ResultPhase =
  | "pass"
  | "retry"
  | "evaluating"
  | "eval_failed"
  | "abandoned"
  | "practice";

export const RESULT_HERO_TONE_CLASS: Record<ResultPhase, string> = {
  practice: "bg-gradient-to-br from-sky-400 to-blue-500 text-white",
  pass: "bg-gradient-to-br from-emerald-400 to-teal-500 text-white",
  eval_failed: "bg-gradient-to-br from-danger to-red-600 text-white",
  abandoned: "bg-m3-surface-container text-m3-on-surface-variant",
  evaluating:
    "bg-gradient-to-br from-m3-surface-container to-m3-surface-container-high text-m3-primary",
  retry: "bg-gradient-to-br from-red-500 to-rose-600 text-white",
};

export const RESULT_HERO_ICON: Record<ResultPhase, LucideIcon> = {
  practice: ListChecks,
  pass: CheckCircle2,
  eval_failed: AlertTriangle,
  evaluating: Loader2,
  retry: XCircle,
  abandoned: History,
};

export const RESULT_HERO_TITLE_KEY: Record<ResultPhase, string> = {
  practice: "course_interview.mode.results_title",
  eval_failed: "course_interview.results.evaluation_failed",
  abandoned: "course_interview.results.abandoned",
  evaluating: "course_interview.results.evaluating",
  pass: "course_interview.results.passed",
  retry: "course_interview.results.failed",
};

export const RESULT_HERO_SUMMARY_KEY: Record<ResultPhase, string> = {
  practice: "course_interview.mode.results_summary",
  eval_failed: "course_interview.results.evaluation_failed_summary",
  abandoned: "course_interview.results.abandoned_summary",
  evaluating: "course_interview.results.evaluating_summary",
  pass: "course_interview.results.pass_summary",
  retry: "course_interview.results.fail_summary",
};

/**
 * Heading colour, so the title tone matches the badge.
 *
 * The heading used to be hard-coded `text-m3-primary` for every phase, which
 * was fine while every badge was blue-ish. With the fail badge now red, a blue
 * "Not passed" under a red X reads as two different signals — the eye takes the
 * headline colour as the verdict.
 */
export const RESULT_HERO_TITLE_CLASS: Record<ResultPhase, string> = {
  practice: "text-m3-primary",
  pass: "text-emerald-600",
  eval_failed: "text-danger",
  abandoned: "text-m3-on-surface-variant",
  evaluating: "text-m3-primary",
  retry: "text-red-600",
};

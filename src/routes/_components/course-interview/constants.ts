import {
  AlertTriangle,
  CheckCircle2,
  History,
  ListChecks,
  Loader2,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

/**
 * Constant tables for the course-interview results screen. Each table replaces
 * one of the exhaustive ternary chains that used to be inlined in the results
 * branch of course-interview.tsx — same six phases, same values, in the same
 * order the chains tested them.
 */

/**
 * Verdict phase — drives the hero treatment. "retry" (failed verdict) is
 * deliberately encouraging (primary, not red); red is reserved for an
 * evaluation-system failure so a normal fail never feels punitive.
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
  retry: "bg-gradient-to-br from-m3-primary to-m3-secondary text-white",
};

export const RESULT_HERO_ICON: Record<ResultPhase, LucideIcon> = {
  practice: ListChecks,
  pass: CheckCircle2,
  eval_failed: AlertTriangle,
  evaluating: Loader2,
  retry: RotateCcw,
  abandoned: History,
};

export const RESULT_HERO_TITLE_KEY: Record<ResultPhase, string> = {
  practice: "course_interview.mode.results_title",
  eval_failed: "course_interview.results.evaluation_failed",
  abandoned: "course_interview.results.abandoned",
  evaluating: "course_interview.results.evaluating",
  pass: "course_interview.results.passed",
  retry: "course_interview.results.completed",
};

export const RESULT_HERO_SUMMARY_KEY: Record<ResultPhase, string> = {
  practice: "course_interview.mode.results_summary",
  eval_failed: "course_interview.results.evaluation_failed_summary",
  abandoned: "course_interview.results.abandoned_summary",
  evaluating: "course_interview.results.evaluating_summary",
  pass: "course_interview.results.pass_summary",
  retry: "course_interview.results.fail_summary",
};

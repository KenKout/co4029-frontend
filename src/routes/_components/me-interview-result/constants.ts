import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  RotateCcw,
} from "lucide-react";
import type { ResultPhase } from "./types";

/**
 * Verdict presentation, one row per `ResultPhase`.
 *
 * These four tables replace the four parallel four-deep ternary chains the page
 * used to carry inline (the single biggest contributor to its complexity of
 * 45). `ResultPhase` is a closed union of five members, so each table is a
 * total `Record` — a new phase becomes a compile error here rather than
 * silently falling through to the "retry" default the chains used.
 */

export const HERO_TONE_CLASS: Record<ResultPhase, string> = {
  pass: "bg-gradient-to-br from-emerald-400 to-teal-500 text-white",
  eval_failed: "bg-gradient-to-br from-danger to-red-600 text-white",
  abandoned: "bg-m3-surface-container text-m3-on-surface-variant",
  evaluating:
    "bg-gradient-to-br from-m3-surface-container to-m3-surface-container-high text-m3-primary",
  retry: "bg-gradient-to-br from-m3-primary to-m3-secondary text-white",
};

export const HERO_ICON: Record<ResultPhase, typeof CheckCircle2> = {
  pass: CheckCircle2,
  eval_failed: AlertTriangle,
  evaluating: Loader2,
  abandoned: MinusCircle,
  retry: RotateCcw,
};

export const HERO_TITLE_KEY: Record<ResultPhase, string> = {
  eval_failed: "course_interview.results.evaluation_failed",
  abandoned: "course_interview.results.abandoned",
  evaluating: "course_interview.results.evaluating",
  pass: "course_interview.results.passed",
  retry: "course_interview.results.completed",
};

export const HERO_SUMMARY_KEY: Record<ResultPhase, string> = {
  eval_failed: "course_interview.results.evaluation_failed_summary",
  abandoned: "course_interview.results.abandoned_summary",
  evaluating: "course_interview.results.evaluating_summary",
  pass: "course_interview.results.pass_summary",
  retry: "course_interview.results.fail_summary",
};

import type { InterviewSessionPublic } from "@/lib/api/types";
import type { ResultPhase, SessionFacts } from "./types";

export function phaseFor(s: InterviewSessionPublic): ResultPhase {
  if (s.status === "in_progress") return "evaluating";
  if (s.pass_verdict === true) return "pass";
  if (s.pass_verdict === false) return "retry";
  if (s.status === "abandoned") return "abandoned";
  // `status: "failed"` alone is not terminal — the recovery sweep re-drives
  // those rows. Only a spent recovery budget (`exhausted`) means no verdict is
  // coming; while it is `pending` the page stays in "evaluating" and keeps
  // polling. `undefined` = backend predates the field → old status-only rule.
  if (s.evaluation_state === "exhausted") return "eval_failed";
  if (s.evaluation_state === undefined && s.status === "failed") {
    return "eval_failed";
  }
  return "evaluating";
}

export function formatElapsedLabel(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/** Date/time formatting locale, from the active i18next language tag. */
export function resolveLocale(language: string | undefined): string {
  return language?.startsWith("vi") ? "vi-VN" : "en-US";
}

/**
 * Everything the hero renders that is derived from the session's timestamps:
 * how long the assessment took, when it finished, and whether a retake cooldown
 * is still running.
 */
export function deriveSessionFacts(
  data: InterviewSessionPublic,
  locale: string,
): SessionFacts {
  const finishedAtMs = data.ended_at ? new Date(data.ended_at).getTime() : null;
  const startedAtMs = data.assessment_started_at
    ? new Date(data.assessment_started_at).getTime()
    : null;
  const elapsedSeconds =
    finishedAtMs !== null && startedAtMs !== null
      ? Math.max(0, Math.floor((finishedAtMs - startedAtMs) / 1000))
      : null;
  const resultDate = data.ended_at
    ? new Date(data.ended_at).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const cooldownActive =
    data.retake_available_at != null &&
    new Date(data.retake_available_at).getTime() > Date.now();
  const cooldownLabel = data.retake_available_at
    ? new Date(data.retake_available_at).toLocaleString(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return { elapsedSeconds, resultDate, cooldownActive, cooldownLabel };
}

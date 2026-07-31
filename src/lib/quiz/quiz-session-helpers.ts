import { ApiError } from "@/lib/api/client";

/**
 * Shared types + pure helpers for the quiz-taking surface (course-quiz.tsx and
 * its extracted sub-components). Kept framework-free (no React) so they're
 * trivially unit-testable and importable from any layer.
 */

/** Visual state of a question in the summary rail / navigator. */
export type QuestionState = "completed" | "active" | "flagged" | "pending";

/** Per-question local answer state held by the take session. */
export interface QuestionStatus {
  selectedOptionId: string | null;
  answerText: string | null;
  flagged: boolean;
  hintViewed: boolean;
  savedToServer: boolean;
}

/** An empty status — used as the fallback when an index has no entry yet. */
export const EMPTY_STATUS: QuestionStatus = {
  selectedOptionId: null,
  answerText: null,
  flagged: false,
  hintViewed: false,
  savedToServer: false,
};

/** mm:ss — used for the countdown and fixed time-limit labels. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Elapsed time can run for hours on an untimed quiz, so it needs an hour
 * segment that {@link formatTime} (mm:ss only) can't express. Falls back to
 * mm:ss under an hour to stay visually consistent with the countdown.
 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** True when the question has a selected option or non-empty free text. */
export function hasAnswer(status: QuestionStatus): boolean {
  return (
    status.selectedOptionId !== null || (status.answerText ?? "").length > 0
  );
}

/** Derive the summary-rail state for a question given the active index. */
export function questionState(
  idx: number,
  activeIdx: number,
  status: QuestionStatus,
): QuestionState {
  if (status.flagged) return "flagged";
  if (hasAnswer(status)) return "completed";
  if (idx === activeIdx) return "active";
  return "pending";
}

/** Pull a string field out of an ApiError's `{detail: {...}}` body. */
export function extractDetailString(
  err: unknown,
  field: string,
): string | null {
  if (!(err instanceof ApiError)) return null;
  const parsed = err.parsedBody;
  if (!parsed || typeof parsed !== "object") return null;
  const detail = (parsed as { detail?: unknown }).detail;
  if (!detail || typeof detail !== "object") return null;
  const value = (detail as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

/** Convenience: the `retry_available_at` timestamp from a cooldown error. */
export function extractRetryAt(err: unknown): string | null {
  return extractDetailString(err, "retry_available_at");
}

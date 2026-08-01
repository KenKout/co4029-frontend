import type { TFunction } from "i18next";

import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { hasInvalidExpectedTime } from "./helpers";

/**
 * Per-cell status derivation for the question navigator. Extracted from
 * QuestionNavigator verbatim so the six orthogonal layers and their exclusive
 * fill/ring precedence are stated once, in one pure place.
 */

export interface NavCellStatus {
  focused: boolean;
  approved: boolean;
  unsaved: boolean;
  error: boolean;
  selected: boolean;
  pending: boolean;
  /** Exclusive background classes. */
  fill: string;
  /** Exclusive outline classes. */
  ring: string;
}

export function deriveNavCellStatus({
  question,
  activeId,
  dirtyIds,
  selectedIds,
}: {
  question: QuizQuestionAuthoring;
  activeId: string | null;
  dirtyIds?: Set<string>;
  selectedIds?: Set<string>;
}): NavCellStatus {
  // Six orthogonal status layers, each on its own visual channel so
  // they can coexist on one cell (see QuestionNavStatus).
  const focused = question.id === activeId;
  const approved = question.review_status === "approved";
  const unsaved = dirtyIds?.has(question.id) ?? false;
  // A pre-filled-but-unsaved default is NOT an error — the value is
  // right there in the editor, it just hasn't been persisted. The
  // unsaved ring already communicates that, so flag an error only when
  // the row has no time AND there are no pending edits to save.
  const error = hasInvalidExpectedTime(question) && !unsaved;
  const selected = selectedIds?.has(question.id) ?? false;
  const pending = !approved && !error;

  return {
    focused,
    approved,
    unsaved,
    error,
    selected,
    pending,
    // FILL is exclusive (one background per cell): error > approved >
    // pending. Error must never be masked by an approved fill, since
    // it's the state that blocks publishing.
    fill: error
      ? "bg-red-600 text-white hover:bg-red-500"
      : approved
        ? "bg-m3-primary text-white hover:bg-m3-primary/90"
        : "bg-m3-surface-container-high text-m3-outline hover:bg-m3-surface-container-highest",
    // RING is exclusive too (focus outranks unsaved, since focus is
    // transient and needs to be unmistakable).
    ring: focused
      ? "ring-2 ring-offset-1 ring-m3-primary scale-105 z-10"
      : unsaved
        ? "ring-2 ring-amber-500"
        : "",
  };
}

export function buildNavStatusWords(status: NavCellStatus, t: TFunction) {
  return [
    status.error
      ? t("teacher_quiz_manage.question_nav.status_error")
      : status.approved
        ? t("teacher_quiz_manage.question_nav.status_approved")
        : t("teacher_quiz_manage.question_nav.status_pending"),
    status.unsaved
      ? t("teacher_quiz_manage.question_nav.status_unsaved")
      : t("teacher_quiz_manage.question_nav.status_saved"),
    status.selected
      ? t("teacher_quiz_manage.question_nav.status_selected")
      : null,
  ].filter(Boolean);
}

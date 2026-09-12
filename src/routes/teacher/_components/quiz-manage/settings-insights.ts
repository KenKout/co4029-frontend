import { FLAG_KEYS } from "./review-options-model";
import type { SettingsDraft } from "./types";

/** Local scheduling uses the browser timezone, just like localInputToIso. */
export function settingsErrors(draft: SettingsDraft): string[] {
  const errors: string[] = [];
  const from = Date.parse(draft.available_from);
  const until = Date.parse(draft.available_until);
  if ([draft.available_from, draft.available_until, draft.due_at].some((v) => v && !Number.isFinite(Date.parse(v)))) errors.push("invalid_date");
  if (Number.isFinite(from) && Number.isFinite(until) && from >= until) errors.push("close_before_open");
  if (!Number.isFinite(draft.passing_score_percent) || draft.passing_score_percent < 0 || draft.passing_score_percent > 100) errors.push("invalid_score");
  return errors;
}

export function settingsWarnings(draft: SettingsDraft): string[] {
  const warnings: string[] = [];
  if (!draft.available_until && FLAG_KEYS.some((key) =>
    draft.review_options.after_close[key] !== draft.review_options.later_while_open[key],
  )) warnings.push("review_needs_close");
  const due = Date.parse(draft.due_at);
  if ((draft.available_from && due < Date.parse(draft.available_from)) ||
      (draft.available_until && due > Date.parse(draft.available_until))) warnings.push("due_outside_window");
  if (draft.overdue_handling === "graceperiod" && !draft.time_limit_minutes.trim()) warnings.push("grace_without_timer");
  return warnings;
}

export function hasMultipleAttempts(draft: Pick<SettingsDraft, "allow_retakes" | "max_attempts">): boolean {
  return draft.allow_retakes && (!draft.max_attempts.trim() || Number(draft.max_attempts) > 1);
}

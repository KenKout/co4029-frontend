/**
 * Backend-driven onboarding stages (unchanged). The checklist is a purely
 * presentational reframe of these — it drives the SAME `onAction` contract the
 * conversational flow used, so no API/business-logic changes are required.
 */
export type SetupStage =
  | "identity_check"
  | "audio_check"
  | "language_check"
  | "preparation"
  | "readiness";

export type SetupLanguage = "en" | "vi";

export type SetupAction =
  | "confirm_identity"
  | "reject_identity"
  | "set_name"
  | "audio_clear"
  | "needs_adjustment"
  | "confirm_language"
  | "continue_setup"
  | "ready"
  | "not_ready"
  | "skip_setup";

export type ChecklistItemState = "done" | "active" | "upcoming";

export type SetupActionHandler = (
  action: SetupAction,
  payload?: { language?: SetupLanguage; name?: string },
) => void;

const STAGE_ORDER: readonly SetupStage[] = [
  "identity_check",
  "audio_check",
  "language_check",
  "preparation",
  "readiness",
];

/** Which checklist rows are considered satisfied once we reach a given stage. */
export function itemState(
  rowStage: SetupStage,
  current: SetupStage,
): ChecklistItemState {
  const rowIndex = STAGE_ORDER.indexOf(rowStage);
  const currentIndex = STAGE_ORDER.indexOf(current);
  if (rowIndex < currentIndex) return "done";
  if (rowIndex === currentIndex) return "active";
  return "upcoming";
}

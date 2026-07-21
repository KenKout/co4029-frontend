/**
 * Pure helpers for the end-confirmation gate frontend flow (Slice 4).
 *
 * The backend no longer closes on a natural-language "end" request — it returns
 * `pending_confirmation: true` (action `request_end_confirmation`) and keeps the
 * current question live. The candidate then either confirms (end + submit for
 * grading) or cancels (continue). These helpers carry NO React or I/O so the
 * detection + reply rules can be unit-tested with plain assertions, mirroring
 * `transition-sequencing.ts`.
 */

export interface RespondEndConfirmationFields {
  pending_confirmation?: boolean | null;
  interaction_state?: string | null;
  ai_turn_text?: string | null;
  ai_followup_text?: string | null;
}

/** Canonical reply the FE sends when the candidate confirms/cancels ending.
 *
 * The backend's confirmation-scoped classifier recognises these unambiguously
 * (see `intent.classify_confirmation_reply`), so the explicit buttons map to
 * fixed phrases rather than free text. Kept ASCII + lowercase to match the
 * server-side patterns exactly. */
export const CONFIRM_END_REPLY = "yes, end the interview";
export const CANCEL_END_REPLY = "no, continue the interview";

/**
 * Whether this response opened (or kept open) an end-confirmation.
 *
 * The main screen should show the Continue / End-and-submit controls and keep
 * the answer draft + timer intact while this is true.
 */
export function isAwaitingEndConfirmation(
  result: RespondEndConfirmationFields,
): boolean {
  return Boolean(result.pending_confirmation);
}

/** The prompt text to display while confirming (server text, else caller fallback). */
export function endConfirmationPrompt(
  result: RespondEndConfirmationFields,
  fallback: string,
): string {
  return (result.ai_turn_text || result.ai_followup_text || "").trim() || fallback;
}

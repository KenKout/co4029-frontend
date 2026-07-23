/**
 * Pure decision helpers for Natural Interview Transitions frontend sequencing.
 *
 * These functions carry NO React or I/O — they encode the spec's sequencing
 * rules so they can be unit-tested with fake timers and plain assertions, and
 * reused by the interview route. Keeping them pure mirrors the existing
 * `use-answer-state` pattern and keeps the route component thin.
 */

export type TransitionTarget = "next_question" | "closing";

export interface RespondTransitionFields {
  next_question?: unknown | null;
  is_finished?: boolean | null;
  should_finish?: boolean | null;
  transition_text?: string | null;
  ai_followup_text?: string | null;
}

export interface TransitionPlan {
  /** Whether a transition turn should be shown/narrated before the next step. */
  showTransition: boolean;
  /** The transition text to present (server text, else localized fallback). */
  text: string;
  /** What the transition leads into once it finishes presenting. */
  target: TransitionTarget;
}

/**
 * Decide the transition to present after a submitted answer is acknowledged.
 *
 * Rules (spec §Frontend Sequencing + §ending):
 *  - When finishing: present the short final-question transition, then the
 *    existing finish flow runs the separate goodbye.
 *  - When advancing: present the next-question transition, then reveal the
 *    next Question Card only after it completes.
 *  - Mixed-version fallback: if the backend sent no transition text, fall back
 *    to the localized frontend transition so the beat still happens.
 */
export function planTransition(
  result: RespondTransitionFields,
  fallbackNextText: string,
): TransitionPlan | null {
  const finished = Boolean(result.should_finish ?? result.is_finished);
  if (finished) {
    const text = (
      result.transition_text ||
      result.ai_followup_text ||
      ""
    ).trim();
    // No final transition text at all → let the caller close immediately.
    if (!text) return null;
    return { showTransition: true, text, target: "closing" };
  }
  if (result.next_question) {
    const text =
      (result.transition_text || result.ai_followup_text || "").trim() ||
      fallbackNextText;
    return { showTransition: true, text, target: "next_question" };
  }
  return null;
}

// Non-voice reading-hold bounds (spec §Frontend Sequencing).
const MIN_READING_HOLD_MS = 900;
const MAX_READING_HOLD_MS = 2_800;
const PER_WORD_MS = 180;
// Short conversational beat after voice narration completes.
export const VOICE_BEAT_MS = 250;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * How long to hold a completed transition before revealing the next question.
 *
 *  - Voice enabled: a short fixed conversational beat (narration completion is
 *    awaited separately by the presentation component).
 *  - Voice disabled: clamp(900ms, wordCount × 180ms, 2800ms) reading delay.
 *  - Reduced motion: keep the reading delay (only typewriter movement is
 *    skipped elsewhere), so the value is unchanged here.
 */
export function transitionHoldMs(
  text: string,
  { voiceEnabled }: { voiceEnabled: boolean },
): number {
  if (voiceEnabled) return VOICE_BEAT_MS;
  return clamp(
    wordCount(text) * PER_WORD_MS,
    MIN_READING_HOLD_MS,
    MAX_READING_HOLD_MS,
  );
}

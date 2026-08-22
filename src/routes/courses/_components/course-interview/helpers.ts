import type { InterviewPhase } from "@/lib/interview/turn-factory";

/**
 * Pure helpers shared by the course-interview action modules and screens,
 * extracted from the former 2.3k-line course-interview.tsx. No React, no
 * side effects — each one is a branch chain that used to be inlined at two
 * or more call sites.
 *
 * `resolveAssistanceTurnKind` lived here until typed turns moved onto `lk.chat`:
 * it mapped the REST response's `assistance_kind`, which the control contract does
 * not carry. The kind is now decided from the OUTBOUND `turn_action` instead, at
 * the one site that knows it (`handleAssistance`).
 */

/**
 * A live session runs fullscreen with the app sidebar unmounted, and mounts the
 * proctoring deterrent.
 */
export function isInterviewActive(args: {
  sessionId: string | null;
  hasFinishResult: boolean;
  phase: InterviewPhase;
}): boolean {
  const { sessionId, hasFinishResult, phase } = args;
  return Boolean(
    sessionId &&
      !hasFinishResult &&
      (phase === "opening" ||
        phase === "readiness" ||
        phase === "transition" ||
        phase === "questioning" ||
        phase === "closing"),
  );
}

/**
 * Recognise a hint REQUEST typed as free text (en + vi).
 *
 * The hint button sends `turn_action="hint"`, but a candidate who types
 * "Can you give me more hints" into the composer gets `turn_action="answer"`
 * — and on the native agent that answer turn is folded (graded) AND charged a
 * follow-up, so the 2-charge follow-up budget exhausts before the 3-rung hint
 * ladder and the question advances with no transition (session fb204f73). This
 * detection routes such text to the hint turn instead.
 *
 * Deliberately narrow: matches ONLY a bare request (short, imperative or
 * interrogative, hint/clue/gợi ý as the object). An answer that merely
 * MENTIONS a hint ("the hint is…") must not be hijacked.
 */
const HINT_REQUEST_RE =
  /^(can|could|may|might|would|will|please|pls|i'?d like|i need|i want|give me|gimme|can i have|more|another|a|an|some|one|bạn|bạn ơi|anh|chị|em|thầy|cô|cho|cho tôi|cho em|cho mình|hãy|xin|thêm)[\s\S]{0,80}(hints?|clues?|gợi ý|gợi ý nhỏ|gợi ý thêm|thêm gợi ý)[\s\S]{0,10}$/i;

// Bare forms with no verb: "hint please", "gợi ý nhé", "gợi ý thêm".
const HINT_BARE_RE = /^(hints?|gợi ý)(\s*(please|pls|nhé|nha|với|đi|thêm|nhỏ))?$/i;

export function isHintRequestText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 100) return false;
  return HINT_REQUEST_RE.test(trimmed) || HINT_BARE_RE.test(trimmed);
}

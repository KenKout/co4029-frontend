/**
 * Shared types for the interview workspace UI.
 *
 * Extracted from `components/interview/interview-workspace.tsx` to break a real
 * import cycle: `lib/interview/transcript-visibility.ts` needed `ConversationTurn`
 * from the component module, while that module imports
 * `visibleTranscriptTurns`/`visibleTranscriptCount` back from it. That only
 * survived because the inbound edge was `import type` and erased at compile time —
 * the moment anything on that path needed a value import it would have broken.
 * With the types here, `lib/` no longer points back at `components/`.
 */

import type { LucideIcon } from "lucide-react";

import type { InterviewQuestionPublic } from "@/lib/api/types";

/**
 * A question the workspace can render, from either source.
 *
 * REST start/onboarding hands back a full `InterviewQuestionPublic`; the native
 * agent's control snapshot projects runtime state, not the authoring row, so it
 * carries no `question_type`. Nullable rather than defaulted: inventing a type
 * would mislabel the card's badge, while null makes it hide.
 */
export type InterviewQuestionView = Omit<
  InterviewQuestionPublic,
  "question_type"
> & {
  question_type: InterviewQuestionPublic["question_type"] | null;
};

/** Server-authoritative progress from a control snapshot. */
export interface InterviewSessionProgress {
  /** 1-based index of the live question; 0 before the first one is asked. */
  questionNumber: number;
  questionsRemaining: number;
  questionsTotal: number;
  outcomesCovered: number;
  outcomesRequired: number;
}

export type InterviewAgentStatus =
  | "idle"
  | "listening"
  | "paused"
  | "thinking"
  | "speaking"
  | "error"
  | "disconnected";

export interface InterviewStateSignals {
  connected?: boolean;
  hasError?: boolean;
  thinking?: boolean;
  speaking?: boolean;
  listening?: boolean;
  paused?: boolean;
}

export interface ConversationTurn {
  id: string;
  role: "ai" | "user";
  text: string;
  /** Seconds elapsed since assessment start; omitted during onboarding. */
  elapsedSeconds?: number;
  questionType?: string | null;
  isFollowUp?: boolean;
  /**
   * The text is still arriving (a live transcription segment). Its renderer must
   * print `text` directly: the typewriter seeds its state on first render and
   * never re-reads the prop, so a streaming turn freezes at its first word.
   */
  live?: boolean;
  /**
   * Replayed from the server's stored transcript rather than appended during this
   * page session. Load-bearing: the stage drops committed AI turns an in-room
   * agent voices, because transcription carries the same words. That reasoning
   * only holds for turns spoken in the CURRENT room — a restored turn predates
   * the reload and has no transcription, so dropping it erased the entire
   * interviewer side of a resumed interview.
   */
  restored?: boolean;
  kind?:
    | "opening"
    | "briefing"
    | "transition"
    | "question"
    | "followup"
    | "clarification"
    | "hint"
    | "answer"
    | "closing";
}

/**
 * Per-turn-kind visual treatment (B-Tier-1 #12): an icon + accent color so the
 * transcript stream is scannable — a question reads differently from a hint,
 * clarification, follow-up, or wrap-up ceremony. Icon is shown in the AI turn's
 * avatar; `accent`/`badgeClass` tint the kind badge.
 */
export interface TurnKindVisual {
  icon: LucideIcon;
  /** Tailwind classes for the avatar bubble (bg + text). */
  avatarClass: string;
  /** Tailwind classes for the kind badge (bg + text). */
  badgeClass: string;
  /** i18n key for the badge label. */
  labelKey: string;
}

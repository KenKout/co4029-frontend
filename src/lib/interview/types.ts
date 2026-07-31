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

/**
 * Pure formatting and state-derivation helpers for the interview workspace.
 *
 * Split out of `components/interview/interview-workspace.tsx` (Step 2 of that
 * file's decomposition). Nothing here renders, so importing it does not drag in
 * 3000 lines of components — which is the point: sibling modules that only wanted
 * `formatRelativeInterviewTime` were previously importing the whole workspace.
 */

import { Check, CircleHelp, MessageSquareText, Sparkles } from "lucide-react";

import type {
  ConversationTurn,
  InterviewAgentStatus,
  InterviewStateSignals,
  TurnKindVisual,
} from "@/lib/interview/types";

/** Resolves competing runtime signals into one canonical primary UI state. */
export function resolveInterviewState({
  connected = true,
  hasError = false,
  thinking = false,
  speaking = false,
  listening = false,
  paused = false,
}: InterviewStateSignals): InterviewAgentStatus {
  if (!connected) return "disconnected";
  if (hasError) return "error";
  if (thinking) return "thinking";
  if (speaking) return "speaking";
  if (listening) return "listening";
  if (paused) return "paused";
  return "idle";
}

export function formatRelativeInterviewTime(totalSeconds: number | undefined) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Per-turn-kind visual treatment (B-Tier-1 #12): an icon + accent color so the
 * transcript stream is scannable — a question reads differently from a hint,
 * clarification, follow-up, or wrap-up ceremony. Icon is shown in the AI turn's
 * avatar; `badgeClass` tints the kind badge.
 */
const TURN_KIND_VISUALS: Partial<
  Record<NonNullable<ConversationTurn["kind"]>, TurnKindVisual>
> = {
  hint: {
    icon: Sparkles,
    avatarClass: "border-amber-200 bg-amber-50 text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700",
    labelKey: "course_interview.workspace.small_hint",
  },
  clarification: {
    icon: CircleHelp,
    avatarClass: "border-sky-200 bg-sky-50 text-sky-600",
    badgeClass: "bg-sky-100 text-sky-700",
    labelKey: "course_interview.workspace.interviewer_clarification",
  },
  followup: {
    icon: MessageSquareText,
    avatarClass: "border-violet-200 bg-violet-50 text-violet-600",
    badgeClass: "bg-violet-100 text-violet-700",
    labelKey: "course_interview.sections.follow_up",
  },
  closing: {
    icon: Check,
    avatarClass: "border-primary/15 bg-primary-soft text-primary",
    badgeClass: "bg-primary-soft text-primary",
    labelKey: "course_interview.sections.wrap_up",
  },
};

/**
 * Returns null for a plain question/opening — the default Bot avatar and neutral
 * badge already suit those, so only the kinds above get special treatment.
 */
export function turnKindVisual(
  kind: ConversationTurn["kind"] | undefined,
): TurnKindVisual | null {
  if (!kind) return null;
  return TURN_KIND_VISUALS[kind] ?? null;
}

/** i18n keys for the agent status pill, one per resolved state. */
export const STATUS_LABELS: Record<InterviewAgentStatus, string> = {
  idle: "course_interview.workspace.status.idle",
  listening: "course_interview.workspace.status.listening",
  paused: "course_interview.workspace.status.paused",
  thinking: "course_interview.workspace.status.thinking",
  speaking: "course_interview.workspace.status.speaking",
  error: "course_interview.workspace.status.error",
  disconnected: "course_interview.workspace.status.disconnected",
};

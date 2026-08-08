/**
 * Conversation surface for the interview: the AI/candidate message turns, their
 * per-turn action row, the typing indicator, and the agent status pill.
 *
 * Extracted from the former `interview-workspace.tsx` (step 4 of its
 * decomposition; what remained is now `stages.tsx`).
 * Grouped together because they are the transcript stream's building blocks and
 * share the turn-kind visual vocabulary from `lib/interview/format`.
 *
 * The status glyph, the per-turn derived flags and the message bubble's regions
 * live in `./conversation/` — this module keeps the four public components and
 * their composition.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";

import {
  AiMessageBody,
  AiMessageHeader,
  MessageAvatar,
  UserMessageHeader,
} from "@/components/interview/conversation/message-parts";
import {
  isNestedTurn,
  shouldShowTimestamp,
} from "@/components/interview/conversation/turn-meta";
import { VoiceStatusGlyph } from "@/components/interview/conversation/voice-status-glyph";
import { Button } from "@/components/ui/button";
import {
  STATUS_LABELS,
  formatRelativeInterviewTime,
} from "@/lib/interview/format";
import type {
  ConversationTurn,
  InterviewAgentStatus,
} from "@/lib/interview/types";
import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";
import { cn } from "@/lib/utils";

export function VoiceStatusIndicator({
  status,
  className,
  compact = false,
  recordingSeconds,
  message,
  onRetry,
}: {
  status: InterviewAgentStatus;
  className?: string;
  compact?: boolean;
  recordingSeconds?: number;
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const animated = status === "listening" || status === "speaking";
  const isProblem = status === "error" || status === "disconnected";

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 text-sm font-medium",
        isProblem ? "text-danger" : "text-text-muted",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <VoiceStatusGlyph status={status} animated={animated} compact={compact} />
      <span className={cn("truncate", compact && "sr-only")}>
        {message ?? t(STATUS_LABELS[status])}
      </span>
      {status === "listening" && recordingSeconds !== undefined && (
        <time className="shrink-0 font-mono text-xs font-semibold tabular-nums text-primary">
          {formatRelativeInterviewTime(recordingSeconds)}
        </time>
      )}
      {isProblem && onRetry && !compact && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="ml-auto shrink-0 text-danger"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("course_interview.workspace.retry")}
        </Button>
      )}
    </div>
  );
}

export function ConversationMessage({
  turn,
  label,
  isLatest,
  speak,
  onTick,
  onSpeakingChange,
  onPresentationComplete,
  actions,
  actionsVisible = false,
  replayVisible = false,
  replayDisabled = true,
  isReplaying = false,
  onReplay,
  streaming = false,
}: {
  turn: ConversationTurn;
  label?: string | null;
  isLatest: boolean;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onTick: () => void;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete?: () => void;
  actions?: ReactNode;
  actionsVisible?: boolean;
  replayVisible?: boolean;
  replayDisabled?: boolean;
  isReplaying?: boolean;
  onReplay?: () => void;
  streaming?: boolean;
}) {
  const { t } = useTranslation();
  const isAi = turn.role === "ai";
  const [textComplete, setTextComplete] = useState(!isAi || !isLatest);
  const relativeTime = formatRelativeInterviewTime(turn.elapsedSeconds);
  const showTimestamp = shouldShowTimestamp(turn, isAi, textComplete);
  const isNestedKind = isNestedTurn(turn, isAi);

  return (
    <article
      className={cn(
        // In-conversation beat: 200ms / 8px, not the 0.7s / 32px page-card entrance.
        "flex w-full gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out",
        isAi ? "justify-start" : "justify-end",
        isNestedKind && "border-l-2 border-border pl-3 sm:pl-5",
      )}
      aria-label={
        isAi
          ? t("course_interview.workspace.ai_interviewer")
          : t("course_interview.workspace.you")
      }
    >
      {isAi && <MessageAvatar turn={turn} />}

      <div
        className={cn(
          // The interviewer is prose, not a chat bubble: it spans the column so
          // its header controls (replay) sit at the container edge rather than
          // floating in at 78%. The candidate's own turns stay capped and
          // right-aligned, which is what makes the two sides readable as a
          // conversation. Line length is bounded on the text itself, not here.
          isAi
            ? "w-full py-1"
            : "max-w-[85%] rounded-xl border border-border bg-surface-muted px-4 py-3 text-text-body sm:max-w-[78%]",
        )}
      >
        {isAi ? (
          <AiMessageHeader
            turn={turn}
            label={label}
            showTimestamp={showTimestamp}
            relativeTime={relativeTime}
            replayVisible={replayVisible}
            replayDisabled={replayDisabled}
            isReplaying={isReplaying}
            onReplay={onReplay}
          />
        ) : (
          <UserMessageHeader
            showTimestamp={showTimestamp}
            relativeTime={relativeTime}
          />
        )}

        {isAi ? (
          <AgentBody
            turn={turn}
            isLatest={isLatest}
            streaming={streaming}
            speak={speak}
            onTick={onTick}
            onSpeakingChange={onSpeakingChange}
            onTextComplete={() => setTextComplete(true)}
            onPresentationComplete={onPresentationComplete}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 sm:text-base">
            {turn.text}
          </p>
        )}
        {isAi && (
          <MessageTurnActions visible={actionsVisible}>
            {actions}
          </MessageTurnActions>
        )}
      </div>
    </article>
  );
}

/**
 * Picks how an interviewer turn renders.
 *
 * A live agent utterance re-renders with more text on every transcription frame,
 * so it CANNOT go through `AiTypingMessage`: that seeds its `shown` state on the
 * first render and never re-reads `text`, freezing the bubble at whatever arrived
 * first.
 */
function AgentBody({
  turn,
  isLatest,
  streaming,
  speak,
  onTick,
  onSpeakingChange,
  onTextComplete,
  onPresentationComplete,
}: {
  turn: ConversationTurn;
  isLatest: boolean;
  streaming: boolean;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onTick: () => void;
  onSpeakingChange: (speaking: boolean) => void;
  onTextComplete: () => void;
  onPresentationComplete?: () => void;
}) {
  if (streaming) {
    return (
      <p className="min-w-0 whitespace-pre-wrap text-base leading-7 text-text-strong">
        {turn.text}
      </p>
    );
  }
  return (
    <AiMessageBody
      turn={turn}
      isLatest={isLatest}
      speak={speak}
      onTick={onTick}
      onSpeakingChange={onSpeakingChange}
      onTextComplete={onTextComplete}
      onPresentationComplete={onPresentationComplete}
    />
  );
}

export function MessageTurnActions({
  visible,
  children,
}: {
  visible: boolean;
  children?: ReactNode;
}) {
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(false);
  const [content, setContent] = useState<ReactNode>(children);

  useEffect(() => {
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let enterFrame: number | undefined;

    if (children !== undefined && children !== null) setContent(children);
    if (visible && children !== undefined && children !== null) {
      setMounted(true);
      enterFrame = window.requestAnimationFrame(() => setShown(true));
    } else {
      setShown(false);
      exitTimer = setTimeout(() => setMounted(false), 220);
    }

    return () => {
      if (enterFrame !== undefined) window.cancelAnimationFrame(enterFrame);
      if (exitTimer !== undefined) clearTimeout(exitTimer);
    };
  }, [children, visible]);

  if (!mounted || content === undefined || content === null) return null;

  return (
    <div
      className={cn(
        "motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
      aria-hidden={!shown}
    >
      {content}
    </div>
  );
}

export function UserTypingIndicator({ visible = true }: { visible?: boolean }) {
  return (
    <TypingIndicator
      visible={visible}
      side="user"
      labelKey="course_interview.workspace.user_typing"
    />
  );
}

/**
 * The interviewer's counterpart, shown while the agent is composing.
 *
 * The candidate has no other signal on the native path: the agent's reply only
 * becomes visible once transcription starts arriving, and the gap before that is
 * a whole LLM round-trip of blank screen.
 */
export function AgentThinkingIndicator({
  visible = true,
}: {
  visible?: boolean;
}) {
  return (
    <TypingIndicator
      visible={visible}
      side="agent"
      labelKey="course_interview.workspace.agent_thinking"
    />
  );
}

function TypingIndicator({
  visible,
  side,
  labelKey,
}: {
  visible: boolean;
  side: "user" | "agent";
  labelKey: string;
}) {
  const { t } = useTranslation();
  const label = t(labelKey);
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let enterFrame: number | undefined;

    if (visible) {
      setMounted(true);
      enterFrame = window.requestAnimationFrame(() => setShown(true));
    } else {
      setShown(false);
      exitTimer = setTimeout(() => setMounted(false), 220);
    }

    return () => {
      if (enterFrame !== undefined) window.cancelAnimationFrame(enterFrame);
      if (exitTimer !== undefined) clearTimeout(exitTimer);
    };
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "flex w-full motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
        side === "user" ? "justify-end" : "justify-start",
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <div
        className={cn(
          "flex max-w-[85%] items-center gap-2.5 rounded-xl border px-4 py-3 sm:max-w-[78%]",
          side === "user"
            ? "border-border bg-surface-muted"
            : "border-primary/15 bg-primary-soft",
        )}
      >
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce [animation-delay:-300ms]" />
          <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce [animation-delay:-150ms]" />
          <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce" />
        </span>
        <span className="text-sm font-medium text-text-muted">{label}</span>
      </div>
    </div>
  );
}

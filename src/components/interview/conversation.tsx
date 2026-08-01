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
          "max-w-[85%] sm:max-w-[78%]",
          isAi
            ? "w-full py-1"
            : "rounded-xl border border-border bg-surface-muted px-4 py-3 text-text-body",
        )}
      >
        {isAi && (
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
        )}

        {!isAi && (
          <UserMessageHeader
            showTimestamp={showTimestamp}
            relativeTime={relativeTime}
          />
        )}

        {isAi ? (
          <AiMessageBody
            turn={turn}
            isLatest={isLatest}
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
  const { t } = useTranslation();
  const label = t("course_interview.workspace.user_typing");
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
        "flex w-full justify-end motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <div className="flex max-w-[85%] items-center gap-2.5 rounded-xl border border-border bg-surface-muted px-4 py-3 sm:max-w-[78%]">
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

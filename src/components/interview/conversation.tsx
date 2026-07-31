/**
 * Conversation surface for the interview: the AI/candidate message turns, their
 * per-turn action row, the typing indicator, and the agent status pill.
 *
 * Extracted from `interview-workspace.tsx` (step 4 of that file's decomposition).
 * Grouped together because they are the transcript stream's building blocks and
 * share the turn-kind visual vocabulary from `lib/interview/format`.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  CircleAlert,
  Loader2,
  Pause,
  RotateCcw,
  Volume2,
  WifiOff,
} from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
import { Button } from "@/components/ui/button";
import {
  STATUS_LABELS,
  formatRelativeInterviewTime,
  turnKindVisual,
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
      <span
        className={cn(
          "flex h-7 shrink-0 items-center justify-center gap-0.5",
          compact ? "w-5" : "w-9",
        )}
        aria-hidden="true"
      >
        {status === "thinking" ? (
          // B-Tier-1 #14: calm staggered pulse so a silent "thinking" beat reads
          // as the interviewer composing, never as a frozen UI.
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="size-1.5 rounded-full bg-primary/80 motion-safe:animate-pulse"
                style={{
                  animationDelay: `${dot * 200}ms`,
                  animationDuration: "1s",
                }}
              />
            ))}
          </span>
        ) : animated ? (
          // B-Tier-1 #14: a varied waveform reads as live audio (speaking /
          // listening) rather than a flat, uniform bar set.
          [0, 1, 2, 3, 4].map((bar) => (
            <span
              key={bar}
              className={cn(
                "w-0.5 rounded-full bg-primary motion-safe:animate-pulse",
                ["h-2", "h-4", "h-3", "h-5", "h-2.5"][bar],
              )}
              style={{
                animationDelay: `${bar * 110}ms`,
                animationDuration: "0.9s",
              }}
            />
          ))
        ) : status === "error" ? (
          <CircleAlert className="h-4 w-4" />
        ) : status === "disconnected" ? (
          <WifiOff className="h-4 w-4" />
        ) : status === "paused" ? (
          <Pause className="h-4 w-4 text-warning" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-border-strong" />
        )}
      </span>
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
  const showTimestamp =
    turn.elapsedSeconds !== undefined && (!isAi || textComplete);
  // B-Tier-1 #11: nest sub-turns (hint / clarification / follow-up) under their
  // parent question with a left indent + accent rail so the conversation reads
  // as a hierarchy rather than a flat stream.
  const isNestedKind =
    isAi &&
    (turn.kind === "hint" ||
      turn.kind === "clarification" ||
      turn.kind === "followup" ||
      turn.isFollowUp === true);

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
      {isAi &&
        (() => {
          const kindVisual = turnKindVisual(turn.kind);
          const AvatarIcon = kindVisual?.icon ?? Bot;
          return (
            <div
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border",
                kindVisual?.avatarClass ??
                  "border-primary/15 bg-primary-soft text-primary",
              )}
            >
              <AvatarIcon className="h-4 w-4" aria-hidden="true" />
            </div>
          );
        })()}

      <div
        className={cn(
          "max-w-[85%] sm:max-w-[78%]",
          isAi
            ? "w-full py-1"
            : "rounded-xl border border-border bg-surface-muted px-4 py-3 text-text-body",
        )}
      >
        {isAi && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-strong">
              {t("course_interview.workspace.ai_interviewer")}
            </span>
            {(() => {
              // B-Tier-1 #12: colored kind badge (hint/clarification/followup/
              // wrap-up) so the transcript is scannable. Falls back to the
              // question-type label pill for plain question/opening turns.
              const kindVisual = turnKindVisual(turn.kind);
              if (kindVisual) {
                return (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      kindVisual.badgeClass,
                    )}
                  >
                    {t(kindVisual.labelKey)}
                  </span>
                );
              }
              if (turn.isFollowUp) {
                return (
                  <span className="text-[11px] font-medium text-text-subtle">
                    {t("course_interview.sections.follow_up")}
                  </span>
                );
              }
              if (label) {
                return (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {label}
                  </span>
                );
              }
              return null;
            })()}
            {showTimestamp && (
              <time className="ml-auto text-[11px] font-medium tabular-nums text-text-subtle">
                {relativeTime}
              </time>
            )}
            {replayVisible && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={replayDisabled}
                onClick={onReplay}
                aria-label={
                  isReplaying
                    ? t("course_interview.workspace.replaying_message")
                    : t("course_interview.workspace.replay_message")
                }
                title={
                  isReplaying
                    ? t("course_interview.workspace.replaying_message")
                    : t("course_interview.workspace.replay_message")
                }
                className={cn(
                  "size-7 shrink-0 rounded-full text-text-muted hover:bg-primary-soft hover:text-primary disabled:opacity-40",
                  !showTimestamp && "ml-auto",
                )}
              >
                {isReplaying ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </Button>
            )}
          </div>
        )}

        {!isAi && (
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-text-muted">
            <span>{t("course_interview.workspace.you")}</span>
            {showTimestamp && (
              <time className="tabular-nums text-text-subtle">
                {relativeTime}
              </time>
            )}
          </div>
        )}

        {isAi ? (
          <AiTypingMessage
            text={turn.text}
            animate={isLatest}
            speak={speak}
            onTick={onTick}
            onTypingChange={onSpeakingChange}
            onTextComplete={() => setTextComplete(true)}
            onPresentationComplete={onPresentationComplete}
            presentationKind={
              turn.kind === "opening" || turn.kind === "closing"
                ? turn.kind
                : "question"
            }
            className={cn(
              "min-w-0 text-text-strong",
              isLatest ? "text-lg leading-8 sm:text-xl" : "text-base leading-7",
            )}
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

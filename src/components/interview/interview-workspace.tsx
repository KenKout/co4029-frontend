import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  AudioLines,
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Clock3,
  Headphones,
  Loader2,
  MessageSquareText,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  PhoneOff,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";
import type {
  InterviewLanguage,
  InterviewOnboardingAction,
  InterviewOnboardingStage,
} from "@/lib/api/types";

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
 * avatar; `accent`/`badgeClass` tint the kind badge. Returns null for a plain
 * question/opening (the default Bot avatar + neutral badge already suit those).
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

const TURN_KIND_VISUALS: Partial<Record<
  NonNullable<ConversationTurn["kind"]>,
  TurnKindVisual
>> = {
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

export function turnKindVisual(
  kind: ConversationTurn["kind"] | undefined,
): TurnKindVisual | null {
  if (!kind) return null;
  return TURN_KIND_VISUALS[kind] ?? null;
}

const STATUS_LABELS: Record<InterviewAgentStatus, string> = {
  idle: "course_interview.workspace.status.idle",
  listening: "course_interview.workspace.status.listening",
  paused: "course_interview.workspace.status.paused",
  thinking: "course_interview.workspace.status.thinking",
  speaking: "course_interview.workspace.status.speaking",
  error: "course_interview.workspace.status.error",
  disconnected: "course_interview.workspace.status.disconnected",
};

export function useInterviewTimer(
  active: boolean,
  startedAtMs?: number | null,
) {
  const [seconds, setSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (startedAtMs != null) startedAtRef.current = startedAtMs;
    else if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const update = () => {
      if (startedAtRef.current === null) return;
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [active, startedAtMs]);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

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
                style={{ animationDelay: `${dot * 200}ms`, animationDuration: "1s" }}
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
              style={{ animationDelay: `${bar * 110}ms`, animationDuration: "0.9s" }}
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

export function InterviewHeader({
  slug,
  courseName,
  interviewTitle,
  elapsed,
  timerActive = true,
  expectedDurationMinutes,
  currentQuestion,
  totalQuestions,
  connected = true,
  voiceOn,
  onToggleVoice,
  onEndInterview,
  showVoiceControl = true,
  questionElapsed,
  questionLingering = false,
}: {
  slug: string;
  courseName: string;
  interviewTitle: string;
  elapsed: string;
  timerActive?: boolean;
  expectedDurationMinutes?: number | null;
  currentQuestion?: number | null;
  totalQuestions?: number | null;
  connected?: boolean;
  voiceOn: boolean;
  onToggleVoice: () => void;
  onEndInterview?: () => void;
  showVoiceControl?: boolean;
  /** Whole seconds spent on the current question; null hides the per-question cue. */
  questionElapsed?: number | null;
  /** True once past the lingering threshold — switches the cue to a gentle nudge. */
  questionLingering?: boolean;
}) {
  const { t } = useTranslation();
  const safeCurrent = Math.max(1, currentQuestion ?? 1);
  const safeTotal = totalQuestions
    ? Math.max(safeCurrent, totalQuestions)
    : null;
  const progress = safeTotal
    ? Math.min(100, (safeCurrent / safeTotal) * 100)
    : null;
  const expected = expectedDurationMinutes
    ? formatRelativeInterviewTime(expectedDurationMinutes * 60)
    : null;

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto grid min-h-16 max-w-[1120px] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,420px)_minmax(220px,1fr)]">
        <Link
          to="/courses/$slug/learn"
          params={{ slug }}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted outline-none transition-colors hover:bg-surface-muted hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/60 lg:hidden"
          aria-label={t("course_interview.actions.back_to_course")}
          title={t("course_interview.actions.back_to_course")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <Link
            to="/courses/$slug/learn"
            params={{ slug }}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-text-muted outline-none transition-colors hover:bg-surface-muted hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label={t("course_interview.actions.back_to_course")}
            title={t("course_interview.actions.back_to_course")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-strong">
              {interviewTitle}
            </p>
            <p className="truncate text-xs text-text-muted">{courseName}</p>
          </div>
        </div>

        <div className="min-w-0 lg:col-start-2">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="truncate text-text-strong">
              {currentQuestion
                ? safeTotal
                  ? t("course_interview.workspace.question_of", {
                      current: safeCurrent,
                      total: safeTotal,
                    })
                  : t("course_interview.workspace.question_number", {
                      current: safeCurrent,
                    })
                : t("course_interview.workspace.interview_setup")}
            </span>
            {typeof questionElapsed === "number" && currentQuestion ? (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 tabular-nums",
                  questionLingering ? "text-amber-600" : "text-text-muted",
                )}
                title={t("course_interview.workspace.time_on_question")}
                aria-label={t("course_interview.workspace.time_on_question")}
              >
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                {formatRelativeInterviewTime(questionElapsed)}
              </span>
            ) : (
              <span className="hidden shrink-0 text-text-muted sm:inline">
                {t("course_interview.workspace.in_progress")}
              </span>
            )}
          </div>
          {progress !== null ? (
            <Progress
              value={progress}
              aria-label={t("course_interview.workspace.question_progress")}
              className="gap-0 [&_[data-slot=progress-track]]:h-1.5"
            />
          ) : (
            <div
              role="progressbar"
              aria-label={t(
                "course_interview.workspace.question_progress_unknown",
              )}
              className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
            >
              <span className="block h-full w-1/3 rounded-full bg-primary motion-safe:animate-pulse" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 lg:col-start-3">
          <span
            className={cn(
              "hidden items-center gap-1.5 text-xs font-medium sm:inline-flex",
              connected ? "text-text-muted" : "text-danger",
            )}
            title={
              connected
                ? t("course_interview.workspace.connected")
                : t("course_interview.workspace.connection_interrupted")
            }
          >
            {connected ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            <span className="hidden xl:inline">
              {connected
                ? t("course_interview.workspace.connected")
                : t("course_interview.workspace.disconnected")}
            </span>
          </span>
          <time
            className="min-w-[5.5rem] text-center font-mono text-xs font-semibold tabular-nums text-text-muted sm:min-w-[7.5rem]"
            aria-label={t("course_interview.workspace.elapsed_time")}
          >
            {timerActive ? elapsed : "--:--"}
            {expected ? ` / ${expected}` : ""}
          </time>
          {showVoiceControl && (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={onToggleVoice}
              aria-pressed={voiceOn}
              aria-label={
                voiceOn
                  ? t("course_interview.narration.mute")
                  : t("course_interview.narration.unmute")
              }
              title={
                voiceOn
                  ? t("course_interview.narration.mute")
                  : t("course_interview.narration.unmute")
              }
              className={cn(
                "size-11 rounded-lg sm:size-9",
                voiceOn ? "text-primary" : "bg-surface-muted text-text-muted",
              )}
            >
              {voiceOn ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          )}
          {onEndInterview && (
            <Button
              type="button"
              variant="destructive"
              size="icon-lg"
              onClick={onEndInterview}
              className="size-11 rounded-lg text-danger sm:size-9"
              aria-label={t("course_interview.actions.end_interview")}
              title={t("course_interview.actions.end_interview")}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
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
        "flex w-full gap-3 motion-safe:animate-fade-in-up",
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

export function InterviewStage({
  transcript,
  status,
  transcriptOpen,
  isUserTyping,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onTurnPresented,
  activeTurnActions,
  activeTurnActionsVisible = false,
  replayAvailable = true,
}: {
  transcript: ConversationTurn[];
  status: InterviewAgentStatus;
  transcriptOpen: boolean;
  isUserTyping: boolean;
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onTurnPresented?: (turn: ConversationTurn) => void;
  activeTurnActions?: ReactNode;
  activeTurnActionsVisible?: boolean;
  replayAvailable?: boolean;
}) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement | null>(null);
  const [presentedAiTurnIds, setPresentedAiTurnIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [replayingTurnId, setReplayingTurnId] = useState<string | null>(null);
  const replayLockRef = useRef(false);
  const lastAiTurnId = useMemo(() => {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      if (transcript[index].role === "ai") return transcript[index].id;
    }
    return null;
  }, [transcript]);

  const visibleTurns = transcriptOpen
    ? transcript
    : transcript.filter((turn) => turn.id === lastAiTurnId);
  const latestAiPresentationComplete =
    lastAiTurnId === null || presentedAiTurnIds.has(lastAiTurnId);
  const replayBlockedByStatus =
    status === "listening" || status === "thinking" || status === "speaking";

  const replayTurn = useCallback(
    async (turn: ConversationTurn) => {
      if (
        replayLockRef.current ||
        !replayAvailable ||
        !presentedAiTurnIds.has(turn.id) ||
        !latestAiPresentationComplete ||
        replayBlockedByStatus
      ) {
        return;
      }

      replayLockRef.current = true;
      setReplayingTurnId(turn.id);
      onSpeakingChange(true);
      try {
        const presentation = speak(turn.text);
        if (
          presentation &&
          typeof presentation === "object" &&
          "finished" in presentation
        ) {
          await presentation.finished.catch(() => undefined);
        } else {
          await Promise.resolve(presentation).catch(() => undefined);
        }
      } catch {
        // Narration failures are non-fatal; the written message remains available.
      } finally {
        replayLockRef.current = false;
        setReplayingTurnId(null);
        onSpeakingChange(false);
      }
    },
    [
      latestAiPresentationComplete,
      onSpeakingChange,
      presentedAiTurnIds,
      replayAvailable,
      replayBlockedByStatus,
      speak,
    ],
  );

  const scrollToLatest = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [
    transcript,
    transcriptOpen,
    isUserTyping,
    presentedAiTurnIds,
    activeTurnActionsVisible,
    scrollToLatest,
  ]);

  return (
    <main
      id="interview-transcript"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      aria-label={t("course_interview.workspace.transcript")}
    >
      <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col justify-start px-4 pb-12 pt-7 sm:px-8 sm:pb-16 sm:pt-10">
        <div className="space-y-8">
          {visibleTurns.map((turn) => (
            <ConversationMessage
              key={turn.id}
              turn={turn}
              label={questionTypeLabel(turn.questionType)}
              isLatest={turn.id === lastAiTurnId}
              speak={speak}
              onTick={scrollToLatest}
              onSpeakingChange={onSpeakingChange}
              onPresentationComplete={() => {
                setPresentedAiTurnIds((current) => {
                  if (current.has(turn.id)) return current;
                  const next = new Set(current);
                  next.add(turn.id);
                  return next;
                });
                onTurnPresented?.(turn);
              }}
              actions={turn.id === lastAiTurnId ? activeTurnActions : undefined}
              actionsVisible={
                turn.id === lastAiTurnId &&
                presentedAiTurnIds.has(turn.id) &&
                activeTurnActionsVisible
              }
              replayVisible={
                turn.role === "ai" &&
                replayAvailable &&
                presentedAiTurnIds.has(turn.id)
              }
              replayDisabled={
                turn.role !== "ai" ||
                !replayAvailable ||
                !presentedAiTurnIds.has(turn.id) ||
                !latestAiPresentationComplete ||
                replayBlockedByStatus ||
                replayingTurnId !== null
              }
              isReplaying={replayingTurnId === turn.id}
              onReplay={() => void replayTurn(turn)}
            />
          ))}
          <UserTypingIndicator visible={isUserTyping} />
        </div>

        <div className="mt-8 pl-12">
          <VoiceStatusIndicator status={status} />
        </div>
        <div ref={endRef} />
      </div>
    </main>
  );
}

export function QuestionCard({
  turn,
  questionNumber,
  totalQuestions,
  category,
  speak,
  onSpeakingChange,
  onPresentationComplete,
  onReplay,
  onClarify,
  animate = true,
  replayDisabled = false,
  clarificationDisabled = false,
  isReplaying = false,
}: {
  turn: ConversationTurn;
  questionNumber: number;
  totalQuestions?: number | null;
  category?: string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
  onReplay: () => void;
  onClarify?: () => void;
  animate?: boolean;
  replayDisabled?: boolean;
  clarificationDisabled?: boolean;
  isReplaying?: boolean;
}) {
  const { t } = useTranslation();
  const [presentationComplete, setPresentationComplete] = useState(!animate);

  return (
    <article
      className="rounded-2xl border border-border bg-white px-5 py-5 shadow-editorial motion-safe:animate-fade-in-up sm:px-7 sm:py-7"
      aria-labelledby={`question-${turn.id}`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          {totalQuestions
            ? t("course_interview.workspace.question_of", {
                current: questionNumber,
                total: totalQuestions,
              })
            : t("course_interview.workspace.question_number", {
                current: questionNumber,
              })}
        </span>
        {category && (
          <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-text-muted">
            {category}
          </span>
        )}
        {turn.elapsedSeconds !== undefined && (
          <time className="ml-auto text-xs font-medium tabular-nums text-text-subtle">
            {formatRelativeInterviewTime(turn.elapsedSeconds)}
          </time>
        )}
      </div>

      <div className="flex gap-4">
        <div className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-primary sm:flex">
          <Bot className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div
          id={`question-${turn.id}`}
          role="heading"
          aria-level={1}
          className="max-w-[44rem] text-text-strong"
        >
          <AiTypingMessage
            key={turn.id}
            text={turn.text}
            animate={animate}
            speak={speak}
            onTick={() => undefined}
            onTypingChange={onSpeakingChange}
            onTextComplete={() => undefined}
            onPresentationComplete={() => {
              setPresentationComplete(true);
              onPresentationComplete();
            }}
            presentationKind="question"
            className="text-[21px] font-semibold leading-[1.5] tracking-[-0.01em] text-text-strong sm:text-2xl"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4 sm:pl-14">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onReplay}
          disabled={!presentationComplete || replayDisabled}
          className="min-h-11 rounded-lg px-3 text-text-muted hover:text-primary"
          aria-label={t("course_interview.workspace.replay_question")}
          title={t("course_interview.workspace.replay_question")}
        >
          {isReplaying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {t("course_interview.workspace.replay")}
        </Button>
        {onClarify && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClarify}
            disabled={!presentationComplete || clarificationDisabled}
            className="min-h-11 rounded-lg px-3 text-text-muted hover:text-primary"
          >
            <CircleHelp className="h-4 w-4" />
            {t("course_interview.workspace.ask_clarification")}
          </Button>
        )}
      </div>
    </article>
  );
}

/**
 * Scrollable transcript body shared by the mobile Sheet drawer and the desktop
 * docked panel. Owns the "don't auto-scroll when the user has scrolled away
 * from the bottom" behaviour (spec §5) so both surfaces get it for free.
 */
function TranscriptConversation({
  transcript,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onReplay,
  replayDisabled,
  replayingTurnId,
  className,
}: {
  transcript: ConversationTurn[];
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onReplay: (turn: ConversationTurn) => void;
  replayDisabled: boolean;
  replayingTurnId: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  // Only auto-scroll to newest when the user is already pinned to the bottom.
  const pinnedToBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    pinnedToBottomRef.current = distanceFromBottom < 48;
  }, []);

  useEffect(() => {
    if (pinnedToBottomRef.current) {
      // jsdom (test env) doesn't implement scrollIntoView; guard so the
      // auto-scroll effect stays a no-op there instead of throwing.
      endRef.current?.scrollIntoView?.({ block: "nearest" });
    }
  }, [transcript]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-5",
        className,
      )}
    >
      {transcript.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-muted">
          {t("course_interview.workspace.transcript_empty")}
        </p>
      ) : (
        transcript.map((turn) => (
          <ConversationMessage
            key={turn.id}
            turn={turn}
            label={questionTypeLabel(turn.questionType)}
            isLatest={false}
            speak={speak}
            onTick={() => undefined}
            onSpeakingChange={onSpeakingChange}
            replayVisible={turn.role === "ai"}
            replayDisabled={replayDisabled || replayingTurnId !== null}
            isReplaying={replayingTurnId === turn.id}
            onReplay={() => onReplay(turn)}
          />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}

export function TranscriptDrawer({
  open,
  onOpenChange,
  transcript,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onReplay,
  replayDisabled,
  replayingTurnId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: ConversationTurn[];
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onReplay: (turn: ConversationTurn) => void;
  replayDisabled: boolean;
  replayingTurnId: string | null;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 rounded-lg bg-white"
          />
        }
      >
        <MessageSquareText className="h-4 w-4" />
        {t("course_interview.workspace.view_transcript")}
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-text-muted">
          {transcript.length}
        </span>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full max-w-none gap-0 border-border bg-white sm:max-w-lg"
        aria-label={t("course_interview.workspace.transcript")}
      >
        <header className="shrink-0 border-b border-border px-5 py-5 pr-14">
          <h2 className="text-base font-semibold text-text-strong">
            {t("course_interview.workspace.transcript")}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {t("course_interview.workspace.transcript_count", {
              count: transcript.length,
            })}
          </p>
        </header>
        <TranscriptConversation
          transcript={transcript}
          questionTypeLabel={questionTypeLabel}
          speak={speak}
          onSpeakingChange={onSpeakingChange}
          onReplay={onReplay}
          replayDisabled={replayDisabled}
          replayingTurnId={replayingTurnId}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Desktop-only docked transcript panel (spec §10). Instead of overlaying and
 * cutting off the right edge of the Question Card, this renders in-flow so the
 * main workspace reflows into the remaining width. Rendered beside the main
 * column by the page layout; hidden on mobile where the Sheet drawer is used.
 */
export function TranscriptPanel({
  open,
  onClose,
  transcript,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onReplay,
  replayDisabled,
  replayingTurnId,
}: {
  open: boolean;
  onClose: () => void;
  transcript: ConversationTurn[];
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onReplay: (turn: ConversationTurn) => void;
  replayDisabled: boolean;
  replayingTurnId: string | null;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <aside
      className="hidden w-[380px] shrink-0 flex-col border-l border-border bg-white lg:flex xl:w-[420px]"
      aria-label={t("course_interview.workspace.transcript")}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-strong">
            {t("course_interview.workspace.transcript")}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            {t("course_interview.workspace.transcript_count", {
              count: transcript.length,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-9 shrink-0 rounded-lg text-text-muted"
          aria-label={t("course_interview.workspace.hide_transcript")}
          title={t("course_interview.workspace.hide_transcript")}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      <TranscriptConversation
        transcript={transcript}
        questionTypeLabel={questionTypeLabel}
        speak={speak}
        onSpeakingChange={onSpeakingChange}
        onReplay={onReplay}
        replayDisabled={replayDisabled}
        replayingTurnId={replayingTurnId}
      />
    </aside>
  );
}

function InterviewerAssistance({
  turn,
  speak,
  onSpeakingChange,
  onPresentationComplete,
  actionsVisible,
  disabled,
  hintUsed,
  onReplayQuestion,
  onRequestHint,
  onExplainTerm,
}: {
  turn: ConversationTurn;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
  actionsVisible: boolean;
  disabled: boolean;
  hintUsed: boolean;
  onReplayQuestion: () => void;
  onRequestHint?: () => void;
  onExplainTerm?: (term: string) => void;
}) {
  const { t } = useTranslation();
  const [termOpen, setTermOpen] = useState(false);
  const [term, setTerm] = useState("");

  const submitTerm = () => {
    const value = term.trim();
    if (!value || disabled || !onExplainTerm) return;
    onExplainTerm(value);
    setTerm("");
    setTermOpen(false);
  };

  return (
    <section
      className="rounded-2xl border border-primary/15 bg-primary-soft/35 px-5 py-4 motion-safe:animate-fade-in-up sm:ml-14 sm:px-6"
      aria-label={t("course_interview.workspace.interviewer_assistance")}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.1em] text-primary">
            {turn.kind === "hint"
              ? t("course_interview.workspace.small_hint")
              : t("course_interview.workspace.interviewer_clarification")}
          </p>
          <AiTypingMessage
            key={turn.id}
            text={turn.text}
            animate
            speak={speak}
            onTick={() => undefined}
            onTypingChange={onSpeakingChange}
            onTextComplete={() => undefined}
            onPresentationComplete={onPresentationComplete}
            presentationKind="question"
            className="text-[15px] leading-7 text-text-strong sm:text-base"
          />
        </div>
      </div>

      <MessageTurnActions visible={actionsVisible}>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3 sm:pl-11">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onReplayQuestion}
            className="min-h-10 rounded-lg text-text-muted hover:text-primary"
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            {t("course_interview.workspace.replay")}
          </Button>
          {onExplainTerm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setTermOpen((open) => !open)}
              aria-expanded={termOpen}
              className="min-h-10 rounded-lg text-text-muted hover:text-primary"
            >
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              {t("course_interview.workspace.explain_term")}
            </Button>
          )}
          {onRequestHint && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || hintUsed}
              onClick={onRequestHint}
              className="min-h-10 rounded-lg text-text-muted hover:text-primary"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {hintUsed
                ? t("course_interview.workspace.hint_provided")
                : t("course_interview.workspace.give_small_hint")}
            </Button>
          )}
        </div>

        {termOpen && (
          <div className="mt-3 flex flex-col gap-2 sm:ml-11 sm:flex-row">
            <label
              className="sr-only"
              htmlFor={`clarification-term-${turn.id}`}
            >
              {t("course_interview.workspace.term_input_label")}
            </label>
            <input
              id={`clarification-term-${turn.id}`}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitTerm();
                }
                if (event.key === "Escape") setTermOpen(false);
              }}
              autoFocus
              maxLength={100}
              placeholder={t(
                "course_interview.workspace.term_input_placeholder",
              )}
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-text-strong outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <Button
              type="button"
              size="sm"
              disabled={disabled || !term.trim()}
              onClick={submitTerm}
              className="h-10 rounded-lg"
            >
              {t("course_interview.workspace.explain")}
            </Button>
          </div>
        )}
      </MessageTurnActions>
    </section>
  );
}

/** Focus-mode stage: one active prompt, status, and an on-demand transcript. */
export function FocusedInterviewStage({
  transcript,
  status,
  transcriptOpen,
  onTranscriptOpenChange,
  assessmentActive,
  currentQuestionNumber,
  totalQuestions,
  currentQuestionType,
  isUserTyping,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onTurnPresented,
  onClarifyQuestion,
  onRequestHint,
  onExplainTerm,
  onRetry,
  statusMessage,
  activeTurnActions,
  activeTurnActionsVisible = false,
  replayAvailable = true,
  submissionSlot,
  transcriptDocked = false,
}: {
  transcript: ConversationTurn[];
  status: InterviewAgentStatus;
  transcriptOpen: boolean;
  onTranscriptOpenChange: (open: boolean) => void;
  assessmentActive: boolean;
  currentQuestionNumber: number;
  totalQuestions?: number | null;
  currentQuestionType?: string | null;
  isUserTyping: boolean;
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onTurnPresented?: (turn: ConversationTurn) => void;
  onClarifyQuestion?: () => void;
  onRequestHint?: () => void;
  onExplainTerm?: (term: string) => void;
  onRetry?: () => void;
  statusMessage?: string;
  activeTurnActions?: ReactNode;
  activeTurnActionsVisible?: boolean;
  replayAvailable?: boolean;
  /** Secondary confirmation for the most recently submitted answer (spec §8). */
  submissionSlot?: ReactNode;
  /** When the desktop docked transcript panel is open, hide the in-composer
   * transcript trigger so it isn't duplicated. */
  transcriptDocked?: boolean;
}) {
  const { t } = useTranslation();
  const [presentedAiTurnIds, setPresentedAiTurnIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [replayingTurnId, setReplayingTurnId] = useState<string | null>(null);
  const replayLockRef = useRef(false);

  const activeTurnIndex = useMemo(() => {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      const turn = transcript[index];
      if (turn.role !== "ai") continue;
      if (
        !assessmentActive ||
        (turn.kind !== "clarification" && turn.kind !== "hint")
      ) {
        return index;
      }
    }
    return -1;
  }, [assessmentActive, transcript]);
  const activeTurn = activeTurnIndex >= 0 ? transcript[activeTurnIndex] : null;
  const assistanceTurn = useMemo(() => {
    if (!assessmentActive || activeTurnIndex < 0) return null;
    for (
      let index = transcript.length - 1;
      index > activeTurnIndex;
      index -= 1
    ) {
      const turn = transcript[index];
      if (
        turn.role === "ai" &&
        (turn.kind === "clarification" || turn.kind === "hint")
      ) {
        return turn;
      }
    }
    return null;
  }, [activeTurnIndex, assessmentActive, transcript]);
  const hintUsed = useMemo(
    () =>
      assessmentActive &&
      activeTurnIndex >= 0 &&
      transcript
        .slice(activeTurnIndex + 1)
        .some((turn) => turn.role === "ai" && turn.kind === "hint"),
    [activeTurnIndex, assessmentActive, transcript],
  );

  useEffect(() => {
    if (!activeTurn) return;
    setPresentedAiTurnIds((current) => {
      const priorAiIds = transcript
        .slice(0, activeTurnIndex)
        .filter((turn) => turn.role === "ai")
        .map((turn) => turn.id);
      if (assistanceTurn) priorAiIds.push(activeTurn.id);
      if (priorAiIds.every((id) => current.has(id))) return current;
      return new Set([...current, ...priorAiIds]);
    });
  }, [activeTurn, activeTurnIndex, assistanceTurn, transcript]);

  const replayBlocked =
    !replayAvailable ||
    status === "listening" ||
    status === "thinking" ||
    status === "speaking" ||
    status === "disconnected";

  const replayTurn = useCallback(
    async (turn: ConversationTurn) => {
      if (replayLockRef.current || replayBlocked) return;
      replayLockRef.current = true;
      setReplayingTurnId(turn.id);
      onSpeakingChange(true);
      try {
        const presentation = speak(turn.text);
        if (
          presentation &&
          typeof presentation === "object" &&
          "finished" in presentation
        ) {
          await presentation.finished.catch(() => undefined);
        } else {
          await Promise.resolve(presentation).catch(() => undefined);
        }
      } finally {
        replayLockRef.current = false;
        setReplayingTurnId(null);
        onSpeakingChange(false);
      }
    },
    [onSpeakingChange, replayBlocked, speak],
  );

  const markPresented = useCallback(
    (turn: ConversationTurn) => {
      setPresentedAiTurnIds((current) => {
        if (current.has(turn.id)) return current;
        return new Set([...current, turn.id]);
      });
      onTurnPresented?.(turn);
    },
    [onTurnPresented],
  );

  // A11y (#9): announce the newest AI turn to screen readers. The visible
  // transcript re-renders silently on submit, so without a live region a SR
  // user never learns a new question / follow-up / hint arrived. We mirror the
  // latest AI turn's text (prefixed with its kind + question number when known)
  // into a polite, visually-hidden region. Only announce once a turn has been
  // presented so the typing animation and the announcement don't fight.
  const announceTurn = assistanceTurn ?? activeTurn;
  const announcement = useMemo(() => {
    if (!announceTurn || announceTurn.role !== "ai") return "";
    if (!presentedAiTurnIds.has(announceTurn.id)) return "";
    const kindPrefix =
      announceTurn.kind === "hint"
        ? `${t("course_interview.workspace.small_hint")}: `
        : announceTurn.kind === "clarification"
          ? `${t("course_interview.workspace.interviewer_clarification")}: `
          : announceTurn.kind === "followup"
            ? `${t("course_interview.sections.follow_up")}: `
            : assessmentActive && currentQuestionNumber
              ? `${t("course_interview.workspace.question_number", { current: currentQuestionNumber })}: `
              : "";
    return `${kindPrefix}${announceTurn.text}`;
  }, [
    announceTurn,
    presentedAiTurnIds,
    assessmentActive,
    currentQuestionNumber,
    t,
  ]);

  return (
    <main
      className="min-h-0 flex-1 overflow-y-auto bg-surface"
      aria-label={t("course_interview.workspace.interview_room")}
    >
      {/* Polite SR announcement of the newest interviewer turn (#9). */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="mx-auto flex min-h-full w-full max-w-[1000px] flex-col justify-center gap-5 px-4 py-6 sm:px-8 sm:py-8">
        {assessmentActive &&
          transcript.some(
            (turn) => turn.kind === "opening" || turn.kind === "briefing",
          ) && (
            <div className="flex items-center gap-2 text-xs font-semibold text-success">
              <span className="flex size-5 items-center justify-center rounded-full bg-success/10">
                <Check className="h-3.5 w-3.5" />
              </span>
              {t("course_interview.workspace.introduction_completed")}
            </div>
          )}

        {activeTurn ? (
          assessmentActive ? (
            <div className="space-y-3">
              <QuestionCard
                key={activeTurn.id}
                turn={activeTurn}
                questionNumber={currentQuestionNumber}
                totalQuestions={totalQuestions}
                category={
                  questionTypeLabel(activeTurn.questionType) ??
                  questionTypeLabel(currentQuestionType)
                }
                speak={speak}
                onSpeakingChange={onSpeakingChange}
                onPresentationComplete={() => markPresented(activeTurn)}
                onReplay={() => void replayTurn(activeTurn)}
                onClarify={onClarifyQuestion}
                animate={!assistanceTurn}
                replayDisabled={
                  replayBlocked ||
                  !presentedAiTurnIds.has(activeTurn.id) ||
                  replayingTurnId !== null
                }
                clarificationDisabled={
                  status === "thinking" ||
                  status === "speaking" ||
                  status === "listening" ||
                  status === "disconnected"
                }
                isReplaying={replayingTurnId === activeTurn.id}
              />
              {assistanceTurn && (
                <InterviewerAssistance
                  key={assistanceTurn.id}
                  turn={assistanceTurn}
                  speak={speak}
                  onSpeakingChange={onSpeakingChange}
                  onPresentationComplete={() => markPresented(assistanceTurn)}
                  actionsVisible={presentedAiTurnIds.has(assistanceTurn.id)}
                  disabled={replayBlocked || replayingTurnId !== null}
                  hintUsed={hintUsed}
                  onReplayQuestion={() => void replayTurn(activeTurn)}
                  onRequestHint={onRequestHint}
                  onExplainTerm={onExplainTerm}
                />
              )}
            </div>
          ) : (
            <section className="rounded-2xl border border-border bg-white px-5 py-5 shadow-editorial sm:px-7 sm:py-7">
              <ConversationMessage
                key={activeTurn.id}
                turn={activeTurn}
                label={questionTypeLabel(activeTurn.questionType)}
                isLatest
                speak={speak}
                onTick={() => undefined}
                onSpeakingChange={onSpeakingChange}
                onPresentationComplete={() => markPresented(activeTurn)}
                actions={activeTurnActions}
                actionsVisible={
                  presentedAiTurnIds.has(activeTurn.id) &&
                  activeTurnActionsVisible
                }
                replayVisible={
                  replayAvailable && presentedAiTurnIds.has(activeTurn.id)
                }
                replayDisabled={replayBlocked || replayingTurnId !== null}
                isReplaying={replayingTurnId === activeTurn.id}
                onReplay={() => void replayTurn(activeTurn)}
              />
            </section>
          )
        ) : (
          <section
            className="rounded-2xl border border-border bg-white px-6 py-12 text-center shadow-editorial"
            role="status"
          >
            <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-text-muted">
              {t("course_interview.workspace.preparing_question")}
            </p>
          </section>
        )}

        {submissionSlot}

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
          <VoiceStatusIndicator
            status={status}
            message={statusMessage}
            onRetry={onRetry}
            className="min-w-0 flex-1"
          />
          {/* The trigger stays visible at every breakpoint and simply flips
              `transcriptOpen`. Which surface shows is decided by breakpoint: on
              desktop (`transcriptDocked`) the route renders an in-flow docked
              panel and the overlay Sheet is suppressed, so the two can never
              show at once. */}
          <TranscriptDrawer
            open={transcriptOpen && !transcriptDocked}
            onOpenChange={onTranscriptOpenChange}
            transcript={transcript}
            questionTypeLabel={questionTypeLabel}
            speak={speak}
            onSpeakingChange={onSpeakingChange}
            onReplay={(turn) => void replayTurn(turn)}
            replayDisabled={replayBlocked}
            replayingTurnId={replayingTurnId}
          />
        </div>

        <UserTypingIndicator visible={isUserTyping} />
      </div>
    </main>
  );
}

function ComposerControl({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "rounded-lg border",
        active
          ? "border-primary/20 bg-primary-soft text-primary hover:bg-primary-soft-dim"
          : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text-strong",
      )}
    >
      {children}
    </Button>
  );
}

export function InterviewControls({
  micAvailable,
  micActive,
  onMicToggle,
  transcriptOpen,
  onTranscriptToggle,
  elapsed,
  status,
  onEndInterview,
  disabled,
}: {
  micAvailable: boolean;
  micActive: boolean;
  onMicToggle: () => void;
  transcriptOpen: boolean;
  onTranscriptToggle: () => void;
  elapsed: string;
  status: InterviewAgentStatus;
  onEndInterview: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const micLabel = micAvailable
    ? micActive
      ? t("course_interview.workspace.mute_microphone")
      : t("course_interview.workspace.start_speaking")
    : t("course_interview.hybrid.unsupported");

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <ComposerControl
        label={micLabel}
        active={micActive}
        disabled={!micAvailable || disabled}
        onClick={onMicToggle}
      >
        {micActive ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
      </ComposerControl>

      <div className="hidden items-center gap-1.5 sm:flex">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!micAvailable}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("course_interview.workspace.audio_input")}
            title={t("course_interview.workspace.system_microphone")}
          >
            <AudioLines className="h-4 w-4" />
            <span className="hidden max-w-28 truncate lg:inline">
              {t("course_interview.workspace.system_microphone")}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 lg:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={10}
            className="w-52"
          >
            <DropdownMenuItem className="gap-2 px-3 py-2">
              <AudioLines className="h-4 w-4" />
              {t("course_interview.workspace.system_microphone")}
              <Check className="ml-auto h-4 w-4 text-primary" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ComposerControl
          label={
            transcriptOpen
              ? t("course_interview.workspace.hide_transcript")
              : t("course_interview.workspace.show_transcript")
          }
          active={transcriptOpen}
          onClick={onTranscriptToggle}
        >
          <MessageSquareText className="h-4 w-4" />
        </ComposerControl>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-9 items-center justify-center rounded-lg text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/60 sm:hidden"
          aria-label={t("course_interview.workspace.more_controls")}
          title={t("course_interview.workspace.more_controls")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={10}
          className="w-52"
        >
          <DropdownMenuItem
            onClick={onTranscriptToggle}
            className="gap-2 px-3 py-2"
          >
            <MessageSquareText className="h-4 w-4" />
            {transcriptOpen
              ? t("course_interview.workspace.hide_transcript")
              : t("course_interview.workspace.show_transcript")}
            {transcriptOpen && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="gap-2 px-3 py-2">
            <AudioLines className="h-4 w-4" />
            {t("course_interview.workspace.system_microphone")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <VoiceStatusIndicator
        status={status}
        compact
        className="hidden sm:flex"
      />

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span className="inline-flex h-9 items-center gap-1.5 px-1 font-mono text-xs font-semibold tabular-nums text-text-muted sm:px-2">
          <Clock3 className="hidden h-3.5 w-3.5 sm:block" />
          {elapsed}
        </span>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          onClick={onEndInterview}
          disabled={disabled}
          className="h-9 rounded-lg px-2.5 text-danger hover:bg-danger/10 sm:px-3"
          aria-label={t("course_interview.actions.end_interview")}
          title={t("course_interview.actions.end_interview")}
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden md:inline">
            {t("course_interview.actions.end_interview")}
          </span>
        </Button>
      </div>
    </div>
  );
}

export function OnboardingActions({
  stage,
  language,
  disabled,
  onLanguageChange,
  onAction,
}: {
  stage: Exclude<InterviewOnboardingStage, "completed">;
  language: InterviewLanguage;
  disabled?: boolean;
  onLanguageChange: (language: InterviewLanguage) => void;
  onAction: (
    action: InterviewOnboardingAction,
    language?: InterviewLanguage,
  ) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-muted/50 p-3 text-left sm:p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {t("course_interview.onboarding.timer_waiting")}
      </p>
      {stage === "identity_check" && (
        <div className="flex flex-wrap items-center justify-start gap-2">
          <Link
            to="/profile"
            className="text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t("course_interview.onboarding.wrong_name")}
          </Link>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("confirm_identity")}
            className="h-8 rounded-lg"
          >
            <Check className="h-4 w-4" />
            {t("course_interview.onboarding.confirm_identity")}
          </Button>
        </div>
      )}

      {stage === "audio_check" && (
        <div className="flex flex-wrap justify-start gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("needs_adjustment")}
            className="h-8 rounded-lg"
          >
            {t("course_interview.onboarding.need_moment")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("audio_clear")}
            className="h-8 rounded-lg"
          >
            <Check className="h-4 w-4" />
            {t("course_interview.onboarding.audio_clear")}
          </Button>
        </div>
      )}

      {stage === "language_check" && (
        <div className="flex flex-wrap items-center justify-start gap-2">
          <span className="text-xs font-semibold text-text-muted">
            {t("course_interview.onboarding.language_label")}
          </span>
          {(["en", "vi"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              variant={language === item ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => {
                onLanguageChange(item);
                onAction("confirm_language", item);
              }}
              aria-pressed={language === item}
              className="h-8 rounded-lg px-3"
            >
              {t(`course_interview.onboarding.languages.${item}`)}
            </Button>
          ))}
        </div>
      )}

      {stage === "preparation" && (
        <div className="flex flex-wrap justify-start gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            size="sm"
            onClick={() => onAction("needs_adjustment")}
            className="h-8 rounded-lg"
          >
            {t("course_interview.onboarding.need_moment")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("continue_setup")}
            className="h-8 rounded-lg"
          >
            {t("course_interview.onboarding.continue")}
          </Button>
        </div>
      )}

      {stage === "readiness" && (
        <div className="flex flex-wrap justify-start gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("not_ready")}
            className="h-8 rounded-lg"
          >
            {t("course_interview.onboarding.not_ready")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("ready")}
            className="h-8 rounded-lg"
          >
            <Sparkles className="h-4 w-4" />
            {t("course_interview.onboarding.ready")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AnswerComposer({
  value,
  draftLength,
  onChange,
  onSubmit,
  sending,
  micAvailable,
  micActive,
  onMicToggle,
  transcriptOpen,
  onTranscriptToggle,
  elapsed,
  status,
  onEndInterview,
  placeholder,
  children,
}: {
  value: string;
  draftLength: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  sending: boolean;
  micAvailable: boolean;
  micActive: boolean;
  onMicToggle: () => void;
  transcriptOpen: boolean;
  onTranscriptToggle: () => void;
  elapsed: string;
  status: InterviewAgentStatus;
  onEndInterview: () => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSubmit = value.trim().length > 0 && !sending;

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 72), 176)}px`;
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) =>
    onChange(event.target.value);

  return (
    <div className="shrink-0 bg-white/95 px-2 pb-2 pt-1 backdrop-blur-md sm:px-4 sm:pb-4">
      <section
        className="mx-auto w-full max-w-[920px] overflow-hidden rounded-xl border border-border bg-white shadow-editorial transition-shadow focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10"
        aria-label={t("course_interview.workspace.answer_composer")}
      >
        <div className="relative px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
          <label htmlFor="answer" className="sr-only">
            {t("course_interview.labels.answer")}
          </label>
          <textarea
            ref={textareaRef}
            id="answer"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={2}
            placeholder={
              placeholder ?? t("course_interview.workspace.answer_placeholder")
            }
            className="block min-h-[72px] w-full resize-none overflow-y-auto bg-transparent pb-8 pr-12 text-[15px] leading-6 text-text-strong outline-none placeholder:text-text-subtle disabled:cursor-wait"
          />

          <span className="absolute bottom-3 left-4 text-[10px] text-text-subtle">
            {t("course_interview.workspace.send_hint")}
          </span>
          <span className="sr-only" aria-live="polite">
            {t("course_interview.labels.character_count", {
              count: draftLength,
            })}
          </span>

          <Button
            type="button"
            size="icon-lg"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label={
              sending
                ? t("course_interview.actions.sending")
                : t("course_interview.actions.send_answer")
            }
            title={t("course_interview.actions.send_answer")}
            className="absolute bottom-3 right-3 size-9 rounded-lg bg-primary text-white shadow-sm hover:bg-primary-hover"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {children}

        <div className="border-t border-border px-2 py-2 sm:px-3">
          <InterviewControls
            micAvailable={micAvailable}
            micActive={micActive}
            onMicToggle={onMicToggle}
            transcriptOpen={transcriptOpen}
            onTranscriptToggle={onTranscriptToggle}
            elapsed={elapsed}
            status={status}
            onEndInterview={onEndInterview}
            disabled={sending}
          />
        </div>
      </section>
    </div>
  );
}

function useRecordingTimer(active: boolean, paused: boolean) {
  const [seconds, setSeconds] = useState(0);
  const accumulatedRef = useRef(0);
  const segmentStartedRef = useRef<number | null>(null);
  const wasRecordingRef = useRef(false);

  useEffect(() => {
    const recording = active || paused;
    if (!recording && wasRecordingRef.current) {
      accumulatedRef.current = 0;
      segmentStartedRef.current = null;
      setSeconds(0);
    }
    wasRecordingRef.current = recording;

    if (!active) return;
    if (segmentStartedRef.current === null)
      segmentStartedRef.current = Date.now();
    const update = () => {
      const segmentStarted = segmentStartedRef.current;
      if (segmentStarted === null) return;
      setSeconds(
        accumulatedRef.current +
          Math.floor((Date.now() - segmentStarted) / 1000),
      );
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(timer);
      const segmentStarted = segmentStartedRef.current;
      if (segmentStarted !== null) {
        accumulatedRef.current += Math.floor(
          (Date.now() - segmentStarted) / 1000,
        );
        segmentStartedRef.current = null;
      }
    };
  }, [active, paused]);

  return seconds;
}

export function AnswerControls({
  mode,
  onModeChange,
  micAvailable,
  micActive,
  micPaused,
  micError,
  disabled,
  canFinish,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancel,
  onRetry,
  speechDetected,
}: {
  mode: "voice" | "type";
  onModeChange: (mode: "voice" | "type") => void;
  micAvailable: boolean;
  micActive: boolean;
  micPaused: boolean;
  micError?: string | null;
  disabled?: boolean;
  canFinish: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  /** True once any speech/interim has been captured this session (drives the
   *  "listening but silent" nudge — #10). */
  speechDetected?: boolean;
}) {
  const { t } = useTranslation();
  const recordingSeconds = useRecordingTimer(micActive, micPaused);
  const errorKey = micError
    ? `course_interview.workspace.microphone_errors.${micError}`
    : null;
  // A11y (#10): after a few seconds of active listening with nothing captured,
  // surface a "we can't hear you" nudge so a voice user isn't left wondering
  // whether the mic is working.
  const listeningSilent =
    micActive && !speechDetected && recordingSeconds >= 4;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div
          className="relative inline-flex rounded-lg border border-border bg-surface-muted p-0.5"
          role="group"
          aria-label={t("course_interview.workspace.answer_mode")}
        >
          {/* Sliding indicator: animates left↔right as the mode changes. */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-md bg-white shadow-sm transition-transform duration-300 ease-out",
              mode === "type" && "translate-x-full",
            )}
          />
          <button
            type="button"
            onClick={() => onModeChange("voice")}
            disabled={!micAvailable || disabled}
            aria-pressed={mode === "voice"}
            className={cn(
              "relative z-10 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
              mode === "voice"
                ? "text-primary"
                : "text-text-muted hover:bg-white/50 hover:text-text-strong",
            )}
          >
            <Mic className="h-3.5 w-3.5" />
            {t("course_interview.workspace.voice_mode")}
          </button>
          <button
            type="button"
            onClick={() => onModeChange("type")}
            disabled={disabled}
            aria-pressed={mode === "type"}
            className={cn(
              "relative z-10 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
              mode === "type"
                ? "text-primary"
                : "text-text-muted hover:bg-white/50 hover:text-text-strong",
            )}
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            {t("course_interview.workspace.type_mode")}
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!micAvailable}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("course_interview.workspace.audio_input")}
          >
            <Headphones className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("course_interview.workspace.system_microphone")}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="gap-2 px-3 py-2">
              <AudioLines className="h-4 w-4" />
              {t("course_interview.workspace.system_microphone")}
              <Check className="ml-auto h-4 w-4 text-primary" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {mode === "voice" && (
        <div
          className={cn(
            "rounded-xl border px-4 py-4",
            micError
              ? "border-danger/30 bg-danger/5"
              : micActive
                ? "border-primary/25 bg-primary-soft/40"
                : "border-border bg-surface-muted/60",
          )}
        >
          {micError ? (
            <div className="flex flex-wrap items-center gap-3" role="alert">
              <CircleAlert className="h-5 w-5 shrink-0 text-danger" />
              <p className="min-w-0 flex-1 text-sm text-danger">
                {t(
                  errorKey ??
                    "course_interview.workspace.microphone_errors.interrupted",
                )}
              </p>
              {onRetry && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onRetry}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("course_interview.workspace.retry_microphone")}
                </Button>
              )}
            </div>
          ) : micActive || micPaused ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full",
                    micActive
                      ? "bg-primary text-white"
                      : "bg-warning/10 text-warning",
                  )}
                  aria-hidden="true"
                >
                  {micActive ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <Pause className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-strong">
                    {micActive
                      ? t("course_interview.workspace.listening_short")
                      : t("course_interview.workspace.recording_paused")}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      listeningSilent
                        ? "font-medium text-warning"
                        : "text-text-muted",
                    )}
                  >
                    {listeningSilent
                      ? t("course_interview.workspace.listening_silent_hint")
                      : t("course_interview.workspace.live_transcript_hint")}
                  </p>
                </div>
                <time className="font-mono text-sm font-semibold tabular-nums text-primary">
                  {formatRelativeInterviewTime(recordingSeconds)}
                </time>
              </div>

              <div
                className="flex h-8 items-center justify-center gap-1"
                aria-hidden="true"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((bar) => (
                  <span
                    key={bar}
                    className={cn(
                      "w-1 rounded-full bg-primary/70",
                      micActive && "motion-safe:animate-pulse",
                      bar % 3 === 0 ? "h-7" : bar % 2 === 0 ? "h-4" : "h-5",
                    )}
                    style={{ animationDelay: `${bar * 70}ms` }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {micActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onPause}
                    className="min-h-11"
                  >
                    <Pause className="h-4 w-4" />
                    {t("course_interview.workspace.pause_recording")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onResume}
                    className="min-h-11"
                  >
                    <Play className="h-4 w-4" />
                    {t("course_interview.workspace.resume_recording")}
                  </Button>
                )}
                <Button
                  type="button"
                  size="lg"
                  onClick={onFinish}
                  disabled={!canFinish || disabled}
                  className="min-h-11 px-4"
                >
                  <Check className="h-4 w-4" />
                  {t("course_interview.workspace.finish_answer")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={onCancel}
                  className="size-11 text-text-muted hover:text-danger"
                  aria-label={t("course_interview.workspace.cancel_recording")}
                  title={t("course_interview.workspace.cancel_recording")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 text-center">
              <Button
                type="button"
                size="lg"
                onClick={onStart}
                disabled={!micAvailable || disabled}
                className="min-h-12 rounded-full px-5"
              >
                <Mic className="h-5 w-5" />
                {t("course_interview.workspace.start_answering")}
              </Button>
              <p className="mt-2 text-xs text-text-muted">
                {t("course_interview.workspace.microphone_idle_hint")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FocusedAnswerComposer({
  value,
  draftLength,
  onChange,
  onSubmit,
  onFinishRecording,
  sending,
  micAvailable,
  micActive,
  micPaused = false,
  micError,
  onMicStart,
  onMicPause,
  onMicResume,
  onMicCancel,
  onMicRetry,
  transcriptOpen,
  onTranscriptToggle,
  elapsed,
  status,
  onEndInterview,
  placeholder,
}: {
  value: string;
  draftLength: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFinishRecording: () => void;
  sending: boolean;
  micAvailable: boolean;
  micActive: boolean;
  micPaused?: boolean;
  micError?: string | null;
  onMicStart: () => void;
  onMicPause: () => void;
  onMicResume: () => void;
  onMicCancel: () => void;
  onMicRetry?: () => void;
  transcriptOpen: boolean;
  onTranscriptToggle: () => void;
  elapsed: string;
  status: InterviewAgentStatus;
  onEndInterview: () => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recordingStartValueRef = useRef(value);
  const [mode, setMode] = useState<"voice" | "type">(
    micActive || micPaused ? "voice" : "type",
  );
  const canSubmit =
    value.trim().length > 0 &&
    !sending &&
    status !== "thinking" &&
    status !== "speaking" &&
    status !== "disconnected";
  const voiceDisabled =
    sending ||
    status === "thinking" ||
    status === "speaking" ||
    status === "disconnected";
  // While the AI is thinking or speaking (or the turn is submitting), lock the
  // text field so the candidate can't type over the interviewer's message.
  const inputDisabled =
    sending ||
    status === "thinking" ||
    status === "speaking" ||
    status === "disconnected";

  useEffect(() => {
    if (!micAvailable && mode === "voice") setMode("type");
  }, [micAvailable, mode]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 80), 176)}px`;
  }, [value]);

  const changeMode = (nextMode: "voice" | "type") => {
    if (nextMode === mode) return;
    if (nextMode === "type" && micActive) onMicPause();
    setMode(nextMode);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:px-4 sm:pb-4 sm:pt-3">
      <section
        className="mx-auto w-full max-w-[960px] rounded-2xl border border-border bg-white p-3 shadow-editorial sm:p-4"
        aria-label={t("course_interview.workspace.answer_composer")}
      >
        <AnswerControls
          mode={mode}
          onModeChange={changeMode}
          speechDetected={value.trim().length > 0}
          micAvailable={micAvailable}
          micActive={micActive}
          micPaused={micPaused}
          micError={micError}
          disabled={voiceDisabled}
          canFinish={canSubmit}
          onStart={() => {
            recordingStartValueRef.current = value;
            onMicStart();
          }}
          onPause={onMicPause}
          onResume={onMicResume}
          onFinish={onFinishRecording}
          onCancel={() => {
            onMicCancel();
            onChange(recordingStartValueRef.current);
          }}
          onRetry={onMicRetry}
        />

        <div className="relative mt-3 border-t border-border pt-3">
          <label
            htmlFor="focused-answer"
            className="mb-1.5 block text-xs font-semibold text-text-muted"
          >
            {mode === "voice"
              ? t("course_interview.workspace.live_transcript")
              : t("course_interview.labels.answer")}
          </label>
          <textarea
            ref={textareaRef}
            id="focused-answer"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={inputDisabled}
            rows={3}
            placeholder={
              status === "thinking" || status === "speaking"
                ? t("course_interview.workspace.answer_locked")
                : (placeholder ??
                  t("course_interview.workspace.answer_placeholder"))
            }
            className="block min-h-20 w-full resize-none overflow-y-auto rounded-xl border border-border bg-surface px-3.5 py-3 pr-14 text-[15px] leading-6 text-text-strong outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:cursor-wait disabled:opacity-70"
          />
          <span className="sr-only" aria-live="polite">
            {t("course_interview.labels.character_count", {
              count: draftLength,
            })}
          </span>
          <Button
            type="button"
            size="icon-lg"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="absolute bottom-3 right-3 size-11 rounded-lg"
            aria-label={
              sending
                ? t("course_interview.actions.sending")
                : t("course_interview.actions.send_answer")
            }
            title={t("course_interview.actions.send_answer")}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-text-subtle">
          {/* A11y (#8): keyboard-shortcut hint is discoverable at every
              breakpoint (was hidden on mobile). Kbd styling makes the keys read
              as keys, not prose. */}
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
              Enter
            </kbd>
            <span className="hidden sm:inline">
              {t("course_interview.workspace.send_hint")}
            </span>
          </span>
          <span className="ml-auto font-mono font-semibold tabular-nums sm:hidden">
            {elapsed}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={onTranscriptToggle}
            aria-pressed={transcriptOpen}
            className="size-11 sm:hidden"
            aria-label={t("course_interview.workspace.view_transcript")}
          >
            <MessageSquareText className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-lg"
            onClick={onEndInterview}
            className="size-11 text-danger sm:hidden"
            aria-label={t("course_interview.actions.end_interview")}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

export function EndInterviewDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("course_interview.end_dialog.title")}
      description={t("course_interview.end_dialog.description")}
      confirmLabel={
        isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("course_interview.end_dialog.ending")}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <PhoneOff className="h-4 w-4" />
            {t("course_interview.actions.end_interview")}
          </span>
        )
      }
      cancelLabel={t("course_interview.end_dialog.cancel")}
      onConfirm={onConfirm}
      isPending={isPending}
      confirmVariant="destructive"
    />
  );
}

/**
 * End-confirmation gate (Slice 4). Rendered on the main screen (in place of the
 * submitted-answer confirmation) after the interviewer asks the candidate to
 * confirm ending. Visually secondary to the Question Card; the current question
 * + timer stay live behind it. Accessible: aria-live announces the prompt,
 * both actions are ≥44px, focusable, and keyboard-operable.
 */
export function EndConfirmationPanel({
  prompt,
  onContinue,
  onEndAndSubmit,
  isPending,
}: {
  prompt: string;
  onContinue: () => void;
  onEndAndSubmit: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50/70 p-4"
      role="group"
      aria-label={t("course_interview.end_confirm.title")}
    >
      <p
        className="flex items-start gap-2 text-sm text-amber-900"
        aria-live="polite"
      >
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{prompt || t("course_interview.end_confirm.prompt")}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          onClick={onContinue}
          disabled={isPending}
        >
          {t("course_interview.end_confirm.continue")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="min-h-[44px]"
          onClick={onEndAndSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("course_interview.end_dialog.ending")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <PhoneOff className="h-4 w-4" aria-hidden="true" />
              {t("course_interview.end_confirm.end_and_submit")}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export function LeaveInterviewDialog({
  open,
  onStay,
  onLeave,
  assessmentStarted,
  hasTimeLimit,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  assessmentStarted: boolean;
  hasTimeLimit: boolean;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onStay();
      }}
      title={t("course_interview.leave_dialog.title")}
      description={t(
        !assessmentStarted
          ? "course_interview.leave_dialog.onboarding_description"
          : hasTimeLimit
            ? "course_interview.leave_dialog.assessment_description"
            : "course_interview.leave_dialog.untimed_description",
      )}
      confirmLabel={t("course_interview.leave_dialog.leave")}
      cancelLabel={t("course_interview.leave_dialog.stay")}
      onConfirm={onLeave}
      confirmVariant="default"
    />
  );
}

export function StartInterviewDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  isResume = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  isResume?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isVietnamese = activeLanguage?.startsWith("vi") ?? false;
  const fallbackCopy = isVietnamese
    ? {
        title: "Bạn đã sẵn sàng bắt đầu?",
        description:
          "Trợ lý phỏng vấn ảo sẽ xác nhận âm thanh, ngôn ngữ và mức độ sẵn sàng trước. Đồng hồ chỉ bắt đầu sau khi bạn xác nhận sẵn sàng.",
        cancel: "Chưa sẵn sàng",
      }
    : {
        title: "Ready to begin?",
        description:
          "The virtual interviewer will confirm audio, language, and readiness first. The assessed timer starts only after you confirm that you are ready.",
        cancel: "Not yet",
      };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isResume
          ? t("course_interview.resume_dialog.title")
          : t("course_interview.start_dialog.title", {
              defaultValue: fallbackCopy.title,
            })
      }
      description={
        isResume
          ? t("course_interview.resume_dialog.description")
          : t("course_interview.start_dialog.description", {
              defaultValue: fallbackCopy.description,
            })
      }
      confirmLabel={
        isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("course_interview.actions.starting")}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {isResume
              ? t("course_interview.resume_dialog.continue")
              : t("course_interview.actions.start")}
          </span>
        )
      }
      cancelLabel={
        isResume
          ? t("course_interview.resume_dialog.cancel")
          : t("course_interview.start_dialog.cancel", {
              defaultValue: fallbackCopy.cancel,
            })
      }
      onConfirm={onConfirm}
      isPending={isPending}
      confirmVariant="default"
    />
  );
}

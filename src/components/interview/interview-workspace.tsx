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
} from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
// Dialogs live in ./dialogs. Re-exported so consumers of this module keep working
// until the barrel is retired.
export {
  EndConfirmationPanel,
  EndInterviewDialog,
  FullscreenExitWarningDialog,
  FullscreenPromptDialog,
  LeaveInterviewDialog,
  StartInterviewDialog,
} from "@/components/interview/dialogs";
// Conversation surface lives in ./conversation. Imported for local use (the
// stages compose these) and re-exported for the same barrel reason.
import {
  ConversationMessage,
  MessageTurnActions,
  UserTypingIndicator,
  VoiceStatusIndicator,
} from "@/components/interview/conversation";

export {
  ConversationMessage,
  MessageTurnActions,
  UserTypingIndicator,
  VoiceStatusIndicator,
};
// Transcript surfaces live in ./transcript. Imported for local use (the focused
// stage renders the drawer) and re-exported for the barrel.
import {
  TranscriptDrawer,
  TranscriptPanel,
} from "@/components/interview/transcript";

export { TranscriptDrawer, TranscriptPanel };
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

import type {
  ConversationTurn,
  InterviewAgentStatus,
  InterviewStateSignals,
  TurnKindVisual,
} from "@/lib/interview/types";

// Types live in lib/interview/types.ts so lib/ does not import back from
// components/ (see that file's header for the cycle this broke). Re-exported here
// because ~8 consumers import them from this path; the barrel goes away once the
// extraction is finished.
export type {
  ConversationTurn,
  InterviewAgentStatus,
  InterviewStateSignals,
  TurnKindVisual,
};

// Pure helpers now live in lib/interview/. Imported for local use AND re-exported
// so consumers of this module keep working until the barrel is retired;
// STATUS_LABELS and TURN_KIND_VISUALS moved with them, which is what lets sibling
// modules import a formatter without pulling in every component in this file.
import {
  STATUS_LABELS,
  formatRelativeInterviewTime,
  resolveInterviewState,
  turnKindVisual,
} from "@/lib/interview/format";
import { useInterviewTimer } from "@/lib/interview/use-interview-timer";

export {
  formatRelativeInterviewTime,
  resolveInterviewState,
  turnKindVisual,
  useInterviewTimer,
};

export function InterviewHeader({
  slug,
  courseName,
  interviewTitle,
  elapsed,
  timerActive = true,
  assessmentStartedAtMs,
  expectedDurationMinutes,
  currentQuestion,
  totalQuestions,
  connected = true,
  voiceOn,
  onToggleVoice,
  onEndInterview,
  endInterviewDisabled = false,
  showVoiceControl = true,
  questionElapsed,
  questionLingering = false,
}: {
  slug: string;
  courseName: string;
  interviewTitle: string;
  elapsed: string;
  timerActive?: boolean;
  /** Epoch ms when the assessed timer started; drives the time-based progress
   * fallback used when the question total is unknown (always, on the learner
   * API). Null before the assessment begins. */
  assessmentStartedAtMs?: number | null;
  expectedDurationMinutes?: number | null;
  currentQuestion?: number | null;
  totalQuestions?: number | null;
  connected?: boolean;
  voiceOn: boolean;
  onToggleVoice: () => void;
  onEndInterview?: () => void;
  /** Disable the end button (e.g. while the closing is already underway). */
  endInterviewDisabled?: boolean;
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
  // The learner API intentionally reveals questions one at a time and never
  // exposes a question total, so `safeTotal` is effectively always null and the
  // question-count progress below never applies. Without a fallback the bar sat
  // frozen on the indeterminate 1/3 pulse for the WHOLE session. When the
  // interview has a time limit and the assessed timer is running, drive the bar
  // off elapsed/limit instead so it actually advances. Derived at render time;
  // the header already re-renders every second via the `elapsed` string.
  const timeProgress =
    timerActive &&
    assessmentStartedAtMs != null &&
    expectedDurationMinutes != null &&
    expectedDurationMinutes > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((Date.now() - assessmentStartedAtMs) /
              (expectedDurationMinutes * 60_000)) *
              100,
          ),
        )
      : null;
  const progress = safeTotal
    ? Math.min(100, (safeCurrent / safeTotal) * 100)
    : timeProgress;
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
              {/* Indeterminate: a band that actually travels. The previous
                  version was a stationary one-third bar that merely pulsed in
                  place, which reads as a stalled or broken progress bar rather
                  than as "total unknown". Reuses the existing `shimmer`
                  keyframe (background-position, no layout) at a progress-bar
                  tempo instead of its 8s decorative default. */}
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,transparent_0%,var(--color-primary)_50%,transparent_100%)] bg-[length:200%_100%] motion-safe:animate-shimmer"
                style={{ animationDuration: "1.6s" }}
              />
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
              disabled={endInterviewDisabled}
              className="size-11 rounded-lg text-danger disabled:cursor-not-allowed disabled:opacity-50 sm:size-9"
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
      // 200ms / 8px, matching MessageTurnActions and UserTypingIndicator — the
      // idiom this screen already uses for in-conversation beats. The shared
      // `fade-in-up` utility is 0.7s and lifts 32px, which is right for a page
      // card but reads as sluggish for a chat turn arriving mid-exchange.
      className="rounded-2xl border border-border bg-white px-5 py-5 shadow-editorial motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out sm:px-7 sm:py-7"
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
      className="rounded-2xl border border-primary/15 bg-primary-soft/35 px-5 py-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out sm:ml-14 sm:px-6"
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
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
      {/* Top-aligned, NOT vertically centred. This column's height changes on
          almost every beat — the question card grows as the typewriter wraps to
          a new line, the submission rail mounts, the assistance card appears —
          and under `justify-center` every one of those re-centred the whole
          column, so the text drifted upward character by character while the
          candidate was reading it. Anchoring to the top costs a little empty
          space below on short turns and buys a stage that never moves. */}
      <div className="mx-auto flex min-h-full w-full max-w-[1000px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
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
          // Placeholder for the QuestionCard that is about to replace it. The
          // min-height approximates a loaded card (eyebrow + two lines + action
          // row) so the swap does not jump; without it this card was roughly
          // half the height of its replacement and the whole stage lurched.
          <section
            className="flex min-h-[188px] flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-12 text-center shadow-editorial sm:min-h-[212px]"
            role="status"
          >
            <Loader2 className="mb-4 h-6 w-6 animate-spin text-primary" />
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
            presentedAiTurnIds={presentedAiTurnIds}
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

/**
 * Keyboard hint under the answer box, rendered as keycaps rather than prose.
 *
 * Was a single sentence ("Enter to send · Shift + Enter for a new line") with one
 * decorative `<kbd>Enter</kbd>` beside it in the focused composer, which put the
 * same key in two visual languages at once. Now every key is a keycap and only
 * the verbs are words, so the shortcut is scannable without reading a sentence.
 *
 * `aria-label` carries the original prose: a screen reader announcing
 * "Enter send Shift plus Enter new line" as loose fragments is worse than the
 * sentence it replaced, so the visual keycaps are hidden from the a11y tree and
 * the sentence is what gets announced.
 */
function SendHint({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={t("course_interview.workspace.send_hint")}
    >
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        <Kbd>Enter</Kbd>
        <span>{t("course_interview.workspace.send_hint_send")}</span>
      </span>
      {/* The Shift half drops on narrow screens: two keycap groups plus a timer
          do not fit, and "Enter send" is the half a student needs first. Hiding
          the whole hint instead would regress what mobile used to show. */}
      <span
        className="hidden items-center gap-1 sm:inline-flex"
        aria-hidden="true"
      >
        <span className="text-border">·</span>
        <Kbd>Shift</Kbd>
        <span className="text-text-subtle">+</span>
        <Kbd>Enter</Kbd>
        <span>{t("course_interview.workspace.send_hint_newline")}</span>
      </span>
    </span>
  );
}

/** One keycap. Shared so both composers render identical keys. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-[10px] font-semibold leading-none text-text-muted">
      {children}
    </kbd>
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

          <SendHint className="absolute bottom-3 left-4 text-[10px] text-text-subtle" />
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
  const listeningSilent = micActive && !speechDetected && recordingSeconds >= 4;

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
              "relative z-10 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
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
              "relative z-10 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
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
              breakpoint (was hidden on mobile). Keys read as keys, not prose —
              and the standalone <kbd>Enter</kbd> that used to sit beside the
              sentence is gone, since SendHint now renders every key itself. */}
          <SendHint />
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

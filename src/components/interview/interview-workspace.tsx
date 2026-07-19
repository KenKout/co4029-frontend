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
  Clock3,
  Loader2,
  MessageSquareText,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type InterviewAgentStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "ready";

export interface ConversationTurn {
  id: string;
  role: "ai" | "user";
  text: string;
  /** Seconds elapsed since this interview session started. */
  elapsedSeconds?: number;
  questionType?: string | null;
  isFollowUp?: boolean;
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

const STATUS_LABELS: Record<InterviewAgentStatus, string> = {
  idle: "course_interview.workspace.status.idle",
  listening: "course_interview.workspace.status.listening",
  processing: "course_interview.workspace.status.processing",
  speaking: "course_interview.workspace.status.speaking",
  ready: "course_interview.workspace.status.ready",
};

export function useInterviewTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startedAtRef.current = null;
      setSeconds(0);
      return;
    }

    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const update = () => {
      if (startedAtRef.current === null) return;
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

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
}: {
  status: InterviewAgentStatus;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const animated = status === "listening" || status === "speaking";

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-medium text-text-muted",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "flex h-6 items-center justify-center gap-0.5",
          compact ? "w-5" : "w-8",
        )}
        aria-hidden="true"
      >
        {status === "processing" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : animated ? (
          [0, 1, 2, 3].map((bar) => (
            <span
              key={bar}
              className={cn(
                "w-0.5 rounded-full bg-primary motion-safe:animate-pulse",
                bar % 2 === 0 ? "h-2" : "h-4",
              )}
              style={{ animationDelay: `${bar * 120}ms` }}
            />
          ))
        ) : (
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "ready" ? "bg-success" : "bg-border-strong",
            )}
          />
        )}
      </span>
      <span className={cn(compact && "sr-only")}>{t(STATUS_LABELS[status])}</span>
    </div>
  );
}

export function InterviewHeader({
  slug,
  courseName,
  interviewTitle,
  elapsed,
  voiceOn,
  onToggleVoice,
  showVoiceControl = true,
}: {
  slug: string;
  courseName: string;
  interviewTitle: string;
  elapsed: string;
  voiceOn: boolean;
  onToggleVoice: () => void;
  showVoiceControl?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1000px] items-center gap-3 px-3 sm:px-6">
        <Link
          to="/courses/$slug/learn"
          params={{ slug }}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-muted outline-none transition-colors hover:bg-surface-muted hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={t("course_interview.actions.back_to_course")}
          title={t("course_interview.actions.back_to_course")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-strong">{courseName}</p>
          <p className="hidden truncate text-xs text-text-muted sm:block">{interviewTitle}</p>
        </div>

        <div className="hidden items-center gap-2 text-xs font-medium text-text-muted md:flex">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          {t("course_interview.workspace.in_progress")}
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-primary/15 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary sm:flex">
          <Sparkles className="h-3.5 w-3.5" />
          {t("course_interview.labels.ai_interview")}
        </div>

        <time
          className="min-w-[3rem] text-center font-mono text-xs font-semibold tabular-nums text-text-muted"
          aria-label={t("course_interview.workspace.elapsed_time")}
        >
          {elapsed}
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
              "rounded-lg",
              voiceOn ? "text-primary" : "bg-surface-muted text-text-muted",
            )}
          >
            {voiceOn ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        )}
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
}: {
  turn: ConversationTurn;
  label?: string | null;
  isLatest: boolean;
  speak: (text: string) => void;
  onTick: () => void;
  onSpeakingChange: (speaking: boolean) => void;
}) {
  const { t } = useTranslation();
  const isAi = turn.role === "ai";
  const relativeTime = formatRelativeInterviewTime(turn.elapsedSeconds);

  return (
    <article
      className={cn(
        "flex w-full gap-3 motion-safe:animate-fade-in-up",
        isAi ? "justify-start" : "justify-end",
      )}
      aria-label={
        isAi
          ? t("course_interview.workspace.ai_interviewer")
          : t("course_interview.workspace.you")
      }
    >
      {isAi && (
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-primary">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] sm:max-w-[78%]",
          isAi
            ? "py-1"
            : "rounded-xl border border-border bg-surface-muted px-4 py-3 text-text-body",
        )}
      >
        {isAi && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-strong">
              {t("course_interview.workspace.ai_interviewer")}
            </span>
            {turn.isFollowUp ? (
              <span className="text-[11px] font-medium text-text-subtle">
                {t("course_interview.sections.follow_up")}
              </span>
            ) : label ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {label}
              </span>
            ) : null}
            <time className="ml-auto text-[11px] font-medium tabular-nums text-text-subtle">
              {relativeTime}
            </time>
          </div>
        )}

        {!isAi && (
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-text-muted">
            <span>{t("course_interview.workspace.you")}</span>
            <time className="tabular-nums text-text-subtle">{relativeTime}</time>
          </div>
        )}

        {isAi ? (
          <AiTypingMessage
            text={turn.text}
            animate={isLatest}
            speak={speak}
            onTick={onTick}
            onTypingChange={onSpeakingChange}
            className={cn(
              "text-text-strong",
              isLatest ? "text-lg leading-8 sm:text-xl" : "text-base leading-7",
            )}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 sm:text-base">{turn.text}</p>
        )}
      </div>
    </article>
  );
}

export function InterviewStage({
  transcript,
  status,
  transcriptOpen,
  questionTypeLabel,
  speak,
  onSpeakingChange,
}: {
  transcript: ConversationTurn[];
  status: InterviewAgentStatus;
  transcriptOpen: boolean;
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void;
  onSpeakingChange: (speaking: boolean) => void;
}) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastAiTurnId = useMemo(() => {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      if (transcript[index].role === "ai") return transcript[index].id;
    }
    return null;
  }, [transcript]);

  const visibleTurns = transcriptOpen
    ? transcript
    : transcript.filter((turn) => turn.id === lastAiTurnId);

  const scrollToLatest = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [transcript, transcriptOpen, scrollToLatest]);

  return (
    <main
      id="interview-transcript"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      aria-label={t("course_interview.workspace.transcript")}
    >
      <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col justify-center px-4 py-10 sm:px-8 sm:py-14">
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
            />
          ))}
        </div>

        <div className="mt-8 pl-12">
          <VoiceStatusIndicator status={status} />
        </div>
        <div ref={endRef} />
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
        {micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
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
          <DropdownMenuContent align="start" side="top" sideOffset={10} className="w-52">
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
        <DropdownMenuContent align="start" side="top" sideOffset={10} className="w-52">
          <DropdownMenuItem onClick={onTranscriptToggle} className="gap-2 px-3 py-2">
            <MessageSquareText className="h-4 w-4" />
            {transcriptOpen
              ? t("course_interview.workspace.hide_transcript")
              : t("course_interview.workspace.show_transcript")}
            {transcriptOpen && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="gap-2 px-3 py-2">
            <AudioLines className="h-4 w-4" />
            {t("course_interview.workspace.system_microphone")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <VoiceStatusIndicator status={status} compact className="hidden sm:flex" />

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
          <span className="hidden md:inline">{t("course_interview.actions.end_interview")}</span>
        </Button>
      </div>
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
            placeholder={t("course_interview.workspace.answer_placeholder")}
            className="block min-h-[72px] w-full resize-none overflow-y-auto bg-transparent pb-8 pr-12 text-[15px] leading-6 text-text-strong outline-none placeholder:text-text-subtle disabled:cursor-wait"
          />

          <span className="absolute bottom-3 left-4 text-[10px] text-text-subtle">
            {t("course_interview.workspace.send_hint")}
          </span>
          <span className="sr-only" aria-live="polite">
            {t("course_interview.labels.character_count", { count: draftLength })}
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

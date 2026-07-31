/**
 * Answer input surfaces: the two composers (inline + focused room), the
 * voice/type mode controls, the onboarding action row, and their shared keycap
 * hint and recording timer.
 *
 * Extracted from the former `interview-workspace.tsx` (step 6 of its
 * decomposition; what remained is now `stages.tsx`).
 * Moved last and as one unit because this is the most internally-coupled cluster:
 * `SendHint`/`Kbd` are shared by both composers, and `ComposerControl` /
 * `useRecordingTimer` are private helpers with no consumer outside this file.
 */

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AudioLines,
  Check,
  ChevronDown,
  CircleAlert,
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
  Trash2,
} from "lucide-react";

import { VoiceStatusIndicator } from "@/components/interview/conversation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeInterviewTime } from "@/lib/interview/format";
import type { InterviewAgentStatus } from "@/lib/interview/types";
import { cn } from "@/lib/utils";

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

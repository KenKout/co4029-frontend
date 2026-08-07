import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import type { InterviewAgentStatus } from "@/lib/interview/types";
import { AnswerControls } from "./AnswerControls";
import { FocusedComposerFooter } from "./FocusedComposerFooter";
import { FocusedComposerTextarea } from "./FocusedComposerTextarea";
import type { AnswerMode } from "./types";

export function FocusedAnswerComposer({
  value,
  draftLength,
  onChange,
  onSubmit,
  onFinishRecording,
  sending,
  submitLocked,
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
  /**
   * Wider than `sending`: also true while the answer is accepted but the AI has
   * not replied yet. Omit to keep the previous `sending`-derived behaviour.
   */
  submitLocked?: boolean;
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
  const [mode, setMode] = useState<AnswerMode>(
    micActive || micPaused ? "voice" : "type",
  );
  // `locked` (can't submit) is deliberately wider than `sending` (a request is
  // in flight). `sending` drives the spinner and the "sending…" label, so it must
  // stay true only while something is actually being sent; `locked` also covers
  // the beat AFTER the turn is accepted but BEFORE the AI's reply mounts, which
  // is when a second answer used to get through to a handler that silently
  // dropped it. Defaults to `sending` so a caller that does not pass it behaves
  // exactly as before.
  const locked =
    submitLocked ??
    (sending ||
      status === "thinking" ||
      status === "speaking" ||
      status === "disconnected");
  const canSubmit = value.trim().length > 0 && !locked;
  const voiceDisabled = locked;
  // While the AI is thinking or speaking (or the turn is submitting), lock the
  // text field so the candidate can't type over the interviewer's message.
  const inputDisabled = locked;

  useEffect(() => {
    if (!micAvailable && mode === "voice") setMode("type");
  }, [micAvailable, mode]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 80), 176)}px`;
  }, [value]);

  const changeMode = (nextMode: AnswerMode) => {
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

        <FocusedComposerTextarea
          mode={mode}
          value={value}
          draftLength={draftLength}
          sending={sending}
          status={status}
          placeholder={placeholder}
          inputDisabled={inputDisabled}
          canSubmit={canSubmit}
          textareaRef={textareaRef}
          onChange={onChange}
          onSubmit={onSubmit}
          onKeyDown={handleKeyDown}
        />

        <FocusedComposerFooter
          elapsed={elapsed}
          transcriptOpen={transcriptOpen}
          onTranscriptToggle={onTranscriptToggle}
          onEndInterview={onEndInterview}
        />
      </section>
    </div>
  );
}

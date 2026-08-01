import { useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { InterviewAgentStatus } from "@/lib/interview/types";
import { InterviewControls } from "./InterviewControls";
import { SendHint } from "./SendHint";

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

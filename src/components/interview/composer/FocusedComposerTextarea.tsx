import type { KeyboardEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { InterviewAgentStatus } from "@/lib/interview/types";

/**
 * The focused composer's text field: label, textarea and send button. The
 * textarea ref is owned by `FocusedAnswerComposer` (auto-resize, focus on mode
 * change) and passed straight through so the element identity is unchanged.
 */
export function FocusedComposerTextarea({
  value,
  draftLength,
  sending,
  status,
  placeholder,
  inputDisabled,
  canSubmit,
  textareaRef,
  onChange,
  onSubmit,
  onKeyDown,
}: {
  value: string;
  draftLength: number;
  sending: boolean;
  status: InterviewAgentStatus;
  placeholder?: string;
  inputDisabled: boolean;
  canSubmit: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative mt-3 border-t border-border pt-3">
      <label
        htmlFor="focused-answer"
        className="mb-1.5 block text-xs font-semibold text-text-muted"
      >
        {t("course_interview.labels.answer")}
      </label>
      <textarea
        ref={textareaRef}
        id="focused-answer"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
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
  );
}

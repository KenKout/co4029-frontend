import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

/** The explain-a-term field revealed by the assistance rail. Enter submits,
 * Escape closes — the input autofocuses on mount, as before. */
export function InterviewerAssistanceTermInput({
  turnId,
  term,
  disabled,
  onTermChange,
  onSubmit,
  onClose,
}: {
  turnId: string;
  term: string;
  disabled: boolean;
  onTermChange: (term: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-3 flex flex-col gap-2 sm:ml-11 sm:flex-row">
      <label className="sr-only" htmlFor={`clarification-term-${turnId}`}>
        {t("course_interview.workspace.term_input_label")}
      </label>
      <input
        id={`clarification-term-${turnId}`}
        value={term}
        onChange={(event) => onTermChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === "Escape") onClose();
        }}
        autoFocus
        maxLength={100}
        placeholder={t("course_interview.workspace.term_input_placeholder")}
        className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-text-strong outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      />
      <Button
        type="button"
        size="sm"
        disabled={disabled || !term.trim()}
        onClick={onSubmit}
        className="h-10 rounded-lg"
      >
        {t("course_interview.workspace.explain")}
      </Button>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { MessageSquareText, Mic } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AnswerMode } from "./types";

/** Voice / Type segmented control with the sliding indicator. */
export function AnswerModeToggle({
  mode,
  onModeChange,
  micAvailable,
  disabled,
}: {
  mode: AnswerMode;
  onModeChange: (mode: AnswerMode) => void;
  micAvailable: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  return (
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
  );
}

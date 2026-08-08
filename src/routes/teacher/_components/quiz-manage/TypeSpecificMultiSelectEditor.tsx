import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TypeSpecificEditorProps } from "./type-specific-value";

/**
 * ``multiple_choice`` → single-answer toggle (radio vs checkbox). Option editing
 * stays in the parent (it owns the option rows). Extracted from
 * TypeSpecificAnswerEditor verbatim.
 */
export function TypeSpecificMultiSelectEditor({
  value,
  disabled,
  onChange,
}: TypeSpecificEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost"
        type="button"
        disabled={disabled}
        onClick={() => onChange({ single_answer: !value.single_answer })}
        aria-pressed={!value.single_answer}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-40",
          !value.single_answer
            ? "bg-m3-primary"
            : "bg-m3-surface-container-high",
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full transition-all",
            !value.single_answer ? "left-6 bg-white" : "left-1 bg-slate-400",
          )}
        />
      </Button>
      <div>
        <p className="text-sm font-bold text-m3-on-surface">
          {t("teacher_quiz_manage.type_editor.multi_select_label")}
        </p>
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_quiz_manage.type_editor.multi_select_desc")}
        </p>
      </div>
    </div>
  );
}

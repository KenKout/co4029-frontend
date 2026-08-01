import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";

import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { QuestionDraft } from "./types";

/**
 * The editable option list for multiple-choice / true-false questions.
 * Extracted from QuestionCard verbatim; the card still owns the `hasOptions`
 * gate so this renders exactly when the inline block used to.
 */
export function QuestionCardOptionsEditor({
  question,
  draft,
  setDraft,
  allowMultiCorrect,
}: {
  question: QuizQuestionAuthoring;
  draft: QuestionDraft;
  setDraft: Dispatch<SetStateAction<QuestionDraft>>;
  allowMultiCorrect: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_quiz_manage.editor.options_label")}
      </label>
      {draft.options.map((option, idx) => (
        <div
          key={option.id}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2",
            option.is_correct
              ? "border-2 border-emerald-300 bg-emerald-50/60"
              : "border border-m3-outline-variant/20 bg-m3-surface-container-lowest",
          )}
        >
          {/* Phase 7: honour the multi-select toggle. When multiple correct
              answers are allowed the teacher needs checkboxes that toggle
              independently; a radio group would silently clear the others
              (and true_false is always single-answer). */}
          <input
            type={allowMultiCorrect ? "checkbox" : "radio"}
            name={allowMultiCorrect ? undefined : `correct-${question.id}`}
            checked={option.is_correct}
            aria-label={t("teacher_quiz_manage.editor.mark_correct", {
              key: option.option_key,
            })}
            onChange={() =>
              setDraft((current) => ({
                ...current,
                options: current.options.map((o, j) =>
                  allowMultiCorrect
                    ? j === idx
                      ? { ...o, is_correct: !o.is_correct }
                      : o
                    : { ...o, is_correct: j === idx },
                ),
              }))
            }
            className="h-4 w-4"
          />
          <span className="font-bold text-m3-on-surface-variant text-sm">
            {option.option_key}.
          </span>
          <input
            type="text"
            value={option.option_text}
            onChange={(e) =>
              setDraft((current) => ({
                ...current,
                options: current.options.map((o, j) =>
                  j === idx ? { ...o, option_text: e.target.value } : o,
                ),
              }))
            }
            disabled={question.question_type === "true_false"}
            className="flex-1 bg-transparent text-sm text-m3-on-surface focus:outline-none disabled:text-m3-on-surface-variant disabled:cursor-not-allowed"
          />
        </div>
      ))}
    </div>
  );
}

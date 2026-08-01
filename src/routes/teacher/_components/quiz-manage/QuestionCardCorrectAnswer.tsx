import { useTranslation } from "react-i18next";

import type { QuizQuestionAuthoring } from "@/lib/api/types";

/**
 * Read-only answer-key display for the two types whose key isn't editable in
 * the card: short_answer (a single string) and fill_blank (one entry per blank,
 * in stem order). Extracted from QuestionCard verbatim; both blocks stay
 * sibling children of the card so the `space-y-3` rhythm is unchanged.
 */
export function QuestionCardCorrectAnswer({
  question,
  correctAnswer,
  blankCount,
}: {
  question: QuizQuestionAuthoring;
  correctAnswer: string | string[] | null;
  blankCount: number;
}) {
  const { t } = useTranslation();

  return (
    <>
      {question.question_type === "short_answer" && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.correct_answer_label",
              "Correct answer",
            )}
          </label>
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface">
            {typeof correctAnswer === "string" && correctAnswer.length > 0 ? (
              correctAnswer
            ) : (
              <span className="text-m3-on-surface-variant italic">
                {t(
                  "teacher_quiz_manage.editor.correct_answer_missing",
                  "(missing — regenerate to refresh)",
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.correct_answer_short_hint",
              "Grader is case-insensitive and treats hyphenated and unhyphenated forms as equivalent.",
            )}
          </p>
        </div>
      )}

      {question.question_type === "fill_blank" && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.fill_blank_label",
              "Blanks (in stem order)",
            )}
          </label>
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface space-y-1">
            {Array.isArray(correctAnswer) && correctAnswer.length > 0 ? (
              correctAnswer.map((blank, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-bold text-m3-on-surface-variant text-xs w-6">
                    {i + 1}.
                  </span>
                  <span>{blank}</span>
                </div>
              ))
            ) : (
              <span className="text-m3-on-surface-variant italic">
                {t(
                  "teacher_quiz_manage.editor.correct_answer_missing",
                  "(missing — regenerate to refresh)",
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.fill_blank_hint",
              "Stem must contain {{count}} blank(s) marked with three or more underscores ({{marker}}).",
              {
                count: Array.isArray(correctAnswer)
                  ? correctAnswer.length
                  : blankCount,
                marker: "___",
              },
            )}
          </p>
        </div>
      )}
    </>
  );
}

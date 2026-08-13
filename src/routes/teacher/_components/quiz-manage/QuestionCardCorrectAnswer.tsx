import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import type { QuizQuestionAuthoring } from "@/lib/api/types";

/**
 * Editable correct answer for the text-answer types:
 * - short_answer → a single input (case-insensitive, hyphen-equivalent match).
 * - fill_blank   → one input per blank in the stem (positional grading), the
 *   blank count comes from the stem's `___` markers.
 *
 * The value lives in the card draft and persists into
 * `original_generated_payload.correct_answer` — the same slot the AI
 * generator writes — so manual and generated questions grade identically.
 */
export function QuestionCardCorrectAnswer({
  question,
  value,
  blankCount,
  onChange,
}: {
  question: QuizQuestionAuthoring;
  value: string | string[] | null;
  blankCount: number;
  onChange: (next: string | string[] | null) => void;
}) {
  const { t } = useTranslation();

  if (question.question_type === "short_answer") {
    const current = typeof value === "string" ? value : "";
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.correct_answer_label",
            "Correct answer",
          )}
        </label>
        <Input
          value={current}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={t(
            "teacher_quiz_manage.editor.correct_answer_placeholder",
            "Type the exact answer…",
          )}
          className="border-2 px-3 py-2 text-sm"
        />
        <p className="text-[11px] text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.correct_answer_short_hint",
            "Grader is case-insensitive and treats hyphenated and unhyphenated forms as equivalent.",
          )}
        </p>
      </div>
    );
  }

  if (question.question_type === "fill_blank") {
    const list = Array.isArray(value) ? value : [];
    if (blankCount <= 0) {
      return (
        <p className="text-[11px] text-amber-700">
          {t(
            "teacher_quiz_manage.editor.fill_blank_no_blanks",
            "Add ___ markers in the question text to define the blanks.",
          )}
        </p>
      );
    }
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.fill_blank_label",
            "Blanks (in stem order)",
          )}
        </label>
        <div className="space-y-1.5">
          {Array.from({ length: blankCount }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-bold text-m3-on-surface-variant text-xs w-6 shrink-0">
                {i + 1}.
              </span>
              <Input
                value={list[i] ?? ""}
                onChange={(e) => {
                  const next = Array.from({ length: blankCount }, (_, j) =>
                    j === i ? e.target.value : (list[j] ?? ""),
                  );
                  onChange(next.some((v) => v.trim()) ? next : null);
                }}
                placeholder={t(
                  "teacher_quiz_manage.editor.fill_blank_placeholder",
                  "Blank answer…",
                )}
                className="border-2 px-3 py-1.5 text-sm"
                aria-label={`${t(
                  "teacher_quiz_manage.editor.fill_blank_label",
                  "Blanks (in stem order)",
                )} ${i + 1}`}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.fill_blank_hint",
            "Each blank is graded positionally — all must match, case-insensitive.",
          )}
        </p>
      </div>
    );
  }

  return null;
}

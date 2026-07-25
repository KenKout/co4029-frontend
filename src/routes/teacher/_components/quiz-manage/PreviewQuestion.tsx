import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { readCorrectAnswer } from "./helpers";
import { Button } from "@/components/ui/button";
import type { PendingQuestionDelete } from "@/lib/api/hooks/quizzes";
import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * A single read-only question in the Preview tab.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 */
export function PreviewQuestion({
  index,
  question,
  onEditQuestion,
  onQueueDelete,
}: {
  index: number;
  question: QuizQuestionAuthoring;
  onEditQuestion: (questionId: string) => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
}) {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasOptions =
    (question.question_type === "multiple_choice" ||
      question.question_type === "true_false") &&
    question.options.length > 0;
  const correctAnswer = readCorrectAnswer(question);

  function handleDelete() {
    const prompt = (question.prompt_text ?? "").trim();
    onQueueDelete({
      id: question.id,
      label: prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt,
    });
  }

  return (
    <div className="rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/15 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-7 w-7 rounded-full gradient-primary text-white flex items-center justify-center text-xs font-extrabold">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-semibold text-m3-on-surface leading-relaxed">
          {(question.outcome_code ?? question.outcome_position) != null && (
            <span className="mr-1.5 inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-bold text-violet-600 align-middle">
              (L.O.{question.outcome_code ?? question.outcome_position})
            </span>
          )}
          {question.prompt_text || (
            <span className="italic text-m3-on-surface-variant">
              {t("teacher_quiz_manage.preview.no_content")}
            </span>
          )}
        </p>
        {/* Teacher-only preview actions: jump to this question in the editor,
            or delete it (deferred + undo, gated by a confirm dialog). */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEditQuestion(question.id)}
            className="gap-1.5 h-8 px-2.5"
            title={t("teacher_quiz_manage.preview.edit_question", "Edit")}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="text-xs">
              {t("teacher_quiz_manage.preview.edit_question", "Edit")}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="gap-1.5 h-8 px-2.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            title={t("common.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-xs">{t("common.delete")}</span>
          </Button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-headline font-bold text-base text-m3-on-surface">
                  {t(
                    "teacher_quiz_manage.confirm_delete_question.title",
                    "Delete this question?",
                  )}
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  {t(
                    "teacher_quiz_manage.confirm_delete_question.body",
                    "The question will be removed. You'll have a few seconds to undo before it's permanently deleted.",
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  handleDelete();
                }}
                className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasOptions && (
        <div className="space-y-2 pl-10">
          {question.options.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm",
                opt.is_correct
                  ? "border-2 border-emerald-300 bg-emerald-50/60 text-m3-on-surface font-medium"
                  : "border border-m3-outline-variant/20 bg-m3-surface text-m3-on-surface",
              )}
            >
              <span className="font-bold text-m3-on-surface-variant">
                {opt.option_key}.
              </span>
              <span className="flex-1">
                {opt.option_text || (
                  <span className="italic text-m3-on-surface-variant">
                    {t("teacher_quiz_manage.preview.no_content")}
                  </span>
                )}
              </span>
              {opt.is_correct && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {t("teacher_quiz_manage.preview.correct")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {question.question_type === "short_answer" && (
        <div className="pl-10">
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface">
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mr-2">
              {t("teacher_quiz_manage.preview.correct")}
            </span>
            {typeof correctAnswer === "string" && correctAnswer.length > 0 ? (
              correctAnswer
            ) : (
              <span className="italic text-m3-on-surface-variant">
                {t("teacher_quiz_manage.preview.no_content")}
              </span>
            )}
          </div>
        </div>
      )}

      {question.question_type === "fill_blank" && (
        <div className="pl-10">
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
              {t("teacher_quiz_manage.preview.correct")}
            </div>
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
              <span className="italic text-m3-on-surface-variant">
                {t("teacher_quiz_manage.preview.no_content")}
              </span>
            )}
          </div>
        </div>
      )}

      {question.explanation && (
        <div className="pl-10">
          <p className="text-xs text-m3-on-surface-variant bg-m3-surface-container rounded-xl px-3 py-2 italic">
            <span className="font-bold not-italic">
              {t("teacher_quiz_manage.editor.explanation_inline")}{" "}
            </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

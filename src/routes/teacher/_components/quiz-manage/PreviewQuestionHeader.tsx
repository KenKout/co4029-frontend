import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { QuizQuestionAuthoring } from "@/lib/api/types";

/**
 * Header row of a preview question: position bubble, outcome badge, prompt, and
 * the teacher-only actions. Extracted from PreviewQuestion verbatim.
 */
export function PreviewQuestionHeader({
  index,
  question,
  onEditQuestion,
  onRequestDelete,
}: {
  index: number;
  question: QuizQuestionAuthoring;
  onEditQuestion: (questionId: string) => void;
  onRequestDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
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
          onClick={onRequestDelete}
          className="gap-1.5 h-8 px-2.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
          title={t("common.delete")}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="text-xs">{t("common.delete")}</span>
        </Button>
      </div>
    </div>
  );
}

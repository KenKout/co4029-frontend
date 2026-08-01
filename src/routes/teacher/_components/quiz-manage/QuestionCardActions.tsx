import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { QuizQuestionAuthoring } from "@/lib/api/types";

/**
 * The mutating action row of a QuestionCard (Save / Approve / Regenerate /
 * Duplicate / Delete). Extracted from QuestionCard verbatim; the card still
 * owns the `!published` gate, because a published quiz hides the whole row
 * rather than disabling it.
 */
export function QuestionCardActions({
  question,
  savePending,
  regeneratePending,
  duplicatePending,
  onSave,
  onRegenerate,
  onDuplicate,
  onRequestDelete,
}: {
  question: QuizQuestionAuthoring;
  savePending: boolean;
  regeneratePending: boolean;
  duplicatePending: boolean;
  onSave: (reviewStatus?: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onRequestDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Button
        type="button"
        size="sm"
        onClick={() => onSave()}
        disabled={savePending}
        className="gap-2"
      >
        {savePending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        {t("common.save")}
      </Button>
      {question.review_status !== "approved" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onSave("approved")}
          disabled={savePending}
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("teacher_quiz_manage.editor.approve")}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRegenerate}
        disabled={regeneratePending}
        className="gap-2"
      >
        {regeneratePending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {t("teacher_quiz_manage.editor.regenerate")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onDuplicate}
        disabled={duplicatePending}
        className="gap-2"
        title={t("teacher_quiz_manage.editor.duplicate", "Duplicate")}
      >
        {duplicatePending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {t("teacher_quiz_manage.editor.duplicate", "Duplicate")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRequestDelete}
        className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 ml-auto"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("common.delete")}
      </Button>
    </div>
  );
}

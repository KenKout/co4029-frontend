import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { QuestionBankDeletionController } from "./use-question-bank-deletion";
import type { QuestionBankEditorController } from "./use-question-bank-editor";

/**
 * A row's edit / delete column, extracted verbatim from the former 843-line
 * course-question-bank.tsx.
 */
export function QuestionRowActions({
  item,
  editor,
  deletion,
}: {
  item: InterviewQuestionBankItemRead;
  editor: QuestionBankEditorController;
  deletion: QuestionBankDeletionController;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 transition-opacity duration-200",
        "opacity-100 sm:opacity-60",
        "group-hover:opacity-100 group-focus-within:opacity-100",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.beginEdit(item)}
        className="gap-1.5 transition-transform duration-150 hover:-translate-y-px active:scale-95"
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("common.edit")}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("common.delete")}
        onClick={() => deletion.setConfirmDelete(item)}
        className="text-red-700 transition-transform duration-150 hover:-translate-y-px hover:bg-red-50 hover:text-red-700 active:scale-95"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

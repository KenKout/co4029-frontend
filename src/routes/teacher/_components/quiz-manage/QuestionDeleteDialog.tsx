import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Delete confirmation for a QuestionCard. On confirm we still route through the
 * deferred queue + undo banner (the real DELETE fires when the 5s combo
 * commits), but the teacher now has an explicit confirm step before the
 * question disappears. Extracted from QuestionCard verbatim.
 */
export function QuestionDeleteDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
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
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}

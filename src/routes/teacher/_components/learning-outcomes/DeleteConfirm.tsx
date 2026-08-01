import { useTranslation } from "react-i18next";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { InterviewOutcomeAuthoring } from "@/lib/api/types";

/** Delete confirmation dialog — surfaces the real assigned-question count. */
export function DeleteConfirm({
  assignedCount,
  pending,
  onCancel,
  onConfirm,
}: {
  outcome: InterviewOutcomeAuthoring;
  assignedCount: number;
  pending: boolean;
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
              {t("teacher_interview_config.outcomes.delete_title")}
            </h2>
            <p className="text-sm text-m3-on-surface-variant">
              {assignedCount > 0
                ? t("teacher_interview_config.outcomes.delete_used_body", {
                    count: assignedCount,
                  })
                : t("teacher_interview_config.outcomes.delete_unused_body")}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t("teacher_interview_config.outcomes.delete_confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

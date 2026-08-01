import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { InterviewQuestionDuplicateCheck } from "@/lib/api/types";

/**
 * Advisory duplicate warning. Confirm is the non-destructive path here — the
 * teacher is proceeding with their own question — so the save stays the
 * default-styled action and Cancel merely returns to the editor with the draft
 * intact.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx.
 */
export function DuplicateWarningDialog({
  warning,
  onDismiss,
  onConfirm,
}: {
  warning: { check: InterviewQuestionDuplicateCheck } | null;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={warning !== null}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
      title={t("teacher_interview_config.qbank.duplicate_title")}
      description={t("teacher_interview_config.qbank.duplicate_description")}
      confirmLabel={t("teacher_interview_config.qbank.duplicate_save_anyway")}
      cancelLabel={t("teacher_interview_config.qbank.duplicate_go_back")}
      confirmVariant="default"
      onConfirm={onConfirm}
      extraContent={
        warning ? (
          <div className="space-y-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {t("teacher_interview_config.qbank.duplicate_existing")}
            </p>
            <p className="text-sm text-m3-on-surface">
              {warning.check.duplicate_of_text}
            </p>
            {warning.check.rationale && (
              <p className="text-xs text-m3-on-surface-variant">
                {warning.check.rationale}
              </p>
            )}
          </div>
        ) : null
      }
    />
  );
}

import { useTranslation } from "react-i18next";
import { Eye, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TabKey } from "@/routes/teacher/_components/quiz-manage/types";

/**
 * Publish confirmation. Kept as the page's own overlay (not the shared
 * ConfirmDialog) because it carries a third action — jump to the Preview tab —
 * and context-aware copy.
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function ConfirmPublishQuizDialog({
  tab,
  approvedCount,
  pending,
  onCancel,
  onPreview,
  onConfirm,
}: {
  tab: TabKey;
  approvedCount: number;
  pending: boolean;
  onCancel: () => void;
  onPreview: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-m3-primary/10 text-m3-primary flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="font-headline font-bold text-base text-m3-on-surface">
              {t("teacher_quiz_manage.confirm_publish.title")}
            </h2>
            {/* Context-aware copy: from Settings/Questions the teacher
                hasn't necessarily seen the student view, so nudge them to
                preview first. From the Preview tab they're already looking
                at it, so just ask for final confirmation. */}
            <p className="text-sm text-m3-on-surface-variant">
              {tab === "preview"
                ? t("teacher_quiz_manage.confirm_publish.body_confirm", {
                    count: approvedCount,
                  })
                : t("teacher_quiz_manage.confirm_publish.body_preview", {
                    count: approvedCount,
                  })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          {/* Preview button only when NOT already on the Preview tab.
              Opens the in-app WYSIWYG tab rather than the live student
              route (which 404s on a not-yet-published quiz). */}
          {tab !== "preview" && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={pending}
              onClick={onPreview}
            >
              <Eye className="h-4 w-4" />
              {t("teacher_quiz_manage.actions.preview")}
            </Button>
          )}
          <Button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="gradient-primary text-white border-0 gap-2 hover:shadow-ai-glow"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {t("teacher_quiz_manage.actions.publish")}
          </Button>
        </div>
      </div>
    </div>
  );
}

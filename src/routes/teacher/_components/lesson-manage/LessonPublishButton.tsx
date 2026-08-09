import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

/**
 * Publish / Unpublish for a lesson — a single direct action.
 *
 * Unlike the old toggle (which only flipped local state and waited for the
 * Save bar), this calls the lesson PATCH with `{ status }` immediately:
 * dialog confirmation first, toast on success, and the editor state is
 * synced to the server's answer so Save can never silently revert it.
 */
export function LessonPublishButton({
  status,
  onPublish,
}: {
  status: "draft" | "published";
  onPublish: (next: "draft" | "published") => Promise<void>;
}) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isPublished = status === "published";

  async function confirm() {
    setPending(true);
    try {
      await onPublish(isPublished ? "draft" : "published");
      setConfirmOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className={cn(
          "gap-2 cursor-pointer",
          isPublished
            ? "text-emerald-600 hover:text-emerald-700"
            : "text-m3-on-surface-variant hover:text-m3-primary",
        )}
        title={
          isPublished
            ? t("teacher_lesson_manage.actions.unpublish_title")
            : t("teacher_lesson_manage.actions.publish_title")
        }
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPublished ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isPublished
            ? t("teacher_lesson_manage.actions.unpublish")
            : t("teacher_lesson_manage.actions.publish")}
        </span>
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          isPublished
            ? t("teacher_lesson_manage.publish_dialog.unpublish_title")
            : t("teacher_lesson_manage.publish_dialog.publish_title")
        }
        description={
          isPublished
            ? t("teacher_lesson_manage.publish_dialog.unpublish_body")
            : t("teacher_lesson_manage.publish_dialog.publish_body")
        }
        confirmLabel={
          isPublished
            ? t("teacher_lesson_manage.actions.unpublish")
            : t("teacher_lesson_manage.actions.publish")
        }
        cancelLabel={t("common.cancel", "Cancel")}
        onConfirm={confirm}
        isPending={pending}
      />
    </>
  );
}

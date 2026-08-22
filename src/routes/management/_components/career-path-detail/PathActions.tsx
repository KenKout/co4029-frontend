import { useTranslation } from "react-i18next";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PublishDraftCoursesDialog } from "./PublishDraftCoursesDialog";
import { usePathActions } from "./use-path-actions";

/**
 * Publish / archive buttons in the detail header. While a confirmation is
 * pending the whole cluster is replaced by the inline confirm bar — the same
 * three-branch render it had before the split.
 */
export function PathActions({
  id,
  status,
  organizationId: _organizationId,
  canManage,
  hasDraft = false,
}: {
  id: string;
  status: string;
  organizationId: string;
  canManage: boolean;
  hasDraft?: boolean;
}) {
  const { t } = useTranslation();
  const actions = usePathActions(id, t);

  const dialog = actions.publishDecision.draftCourses && (
    <PublishDraftCoursesDialog
      draftCourses={actions.publishDecision.draftCourses}
      action={actions.publishDecision.dialogAction}
      onPublishCourses={actions.publishDecision.onPublishCourses}
      onRemoveCourses={actions.publishDecision.onRemoveCourses}
      onClose={actions.publishDecision.onClose}
    />
  );

  if (!canManage) return <>{dialog}</>;

  return (
    <>
      {dialog}
      <ConfirmDialog
        open={actions.confirming !== null}
        onOpenChange={(open) => { if (!open) actions.setConfirming(null); }}
        title={actions.confirming === "archive" ? "Archive this Career Path?" : "Publish this Career Path version?"}
        description={actions.confirming === "archive" ? "Existing learners keep access, but this path is blocked for new selections." : "Publishing freezes the current version."}
        confirmLabel={actions.confirming === "archive" ? t("management_career_path_detail.dialogs.confirm_archive") : t("management_career_path_detail.dialogs.confirm_publish")}
        cancelLabel={t("common.cancel")}
        confirmVariant={actions.confirming === "archive" ? "destructive" : "default"}
        onConfirm={actions.confirming === "archive" ? actions.handleArchive : actions.handlePublish}
        isPending={actions.publish.isPending || actions.archive.isPending}
      />
      <div className="flex items-center gap-1.5 shrink-0">
      {hasDraft && status !== "archived" && (
        <Button size="sm" onClick={() => actions.setConfirming("publish")}>
          {t("management_career_path_detail.actions.publish")}
        </Button>
      )}
      {status !== "archived" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => actions.setConfirming("archive")}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          {t("management_career_path_detail.actions.archive")}
        </Button>
      )}
      </div>
    </>
  );
}

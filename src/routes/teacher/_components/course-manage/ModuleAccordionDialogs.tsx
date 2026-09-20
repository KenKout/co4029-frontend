import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ModuleAccordionController } from "./use-module-accordion";
import type { TranslateFn } from "./types";

export function ModuleAccordionDialogs({
  ctl,
  t,
}: {
  ctl: ModuleAccordionController;
  t: TranslateFn;
}) {
  return (
    <>
      <ConfirmDialog
        open={ctl.publishAllConfirm}
        onOpenChange={ctl.setPublishAllConfirm}
        title={t("teacher_common.publish_all_title", "Publish all draft items?")}
        description={t(
          "teacher_common.publish_all_body",
          "Every draft item in this module will be sent for publishing. Continue?",
        )}
        confirmLabel={t("teacher_common.publish_all_confirm", "Publish all")}
        cancelLabel={t("common.cancel")}
        confirmVariant="default"
        onConfirm={ctl.confirmPublishAll}
        isPending={ctl.publishingAll}
      />
      <ConfirmDialog
        open={ctl.statusConfirm !== null}
        onOpenChange={(open) => {
          if (!open) ctl.setStatusConfirm(null);
        }}
        title={
          ctl.statusConfirm === "published"
            ? t("teacher_common.publish_module_title", "Publish this module?")
            : t("teacher_common.archive_module_title", "Archive this module?")
        }
        description={t(
          ctl.statusConfirm === "published"
            ? "teacher_common.publish_module_body"
            : "teacher_common.archive_module_body",
          ctl.statusConfirm === "published"
            ? "This will make the module visible to students. Continue?"
            : "The module will be hidden from students and no new attempts can start. In-progress attempts can still be completed, and historical progress is preserved. This cannot be undone.",
        )}
        confirmLabel={
          ctl.statusConfirm === "published"
            ? t("teacher_common.publish", "Publish")
            : t("teacher_common.archive", "Archive")
        }
        cancelLabel={t("common.cancel")}
        confirmVariant={ctl.statusConfirm === "archived" ? "destructive" : "default"}
        isPending={ctl.updateModule.isPending}
        onConfirm={ctl.confirmStatusChange}
      />
      <ConfirmDialog
        open={ctl.duplicateConfirm}
        onOpenChange={ctl.setDuplicateConfirm}
        title={t("teacher_common.duplicate_module_title", "Duplicate this module?")}
        description={t(
          "teacher_common.duplicate_module_body",
          "A new draft module and draft copies of its content will be created. Continue?",
        )}
        confirmLabel={t("teacher_common.duplicate", "Duplicate")}
        cancelLabel={t("common.cancel")}
        confirmVariant="default"
        onConfirm={ctl.confirmDuplicateModule}
        isPending={ctl.duplicateModule.isPending}
      />
      <ConfirmDialog
        open={ctl.deleteConfirm}
        onOpenChange={ctl.setDeleteConfirm}
        title={t("teacher_common.delete_module_title", "Delete this draft module?")}
        description={t(
          "teacher_common.delete_module_body",
          "The draft module will be removed from this curriculum. Its lesson, quiz, and interview content will be kept but no longer pinned to this module.",
        )}
        confirmLabel={t("teacher_common.delete_module_confirm", "Delete module")}
        cancelLabel={t("common.cancel")}
        confirmVariant="destructive"
        onConfirm={ctl.confirmDeleteModule}
        isPending={ctl.deleteModule.isPending}
      />
    </>
  );
}

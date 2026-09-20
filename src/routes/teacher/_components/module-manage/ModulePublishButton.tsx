import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, CheckCircle, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import type { UpdateModuleMutation } from "./types";

/**
 * Publish / unpublish toggle in the module header. Moved verbatim out of the
 * former 293-line `ModuleManagePage` together with its `toggleStatus` handler.
 */
export function ModulePublishButton({
  module,
  courseStatus,
  updateModule,
}: {
  module: CourseContentModule;
  courseStatus: string;
  updateModule: UpdateModuleMutation;
}) {
  const { t } = useTranslation();
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);

  function toggleStatus() {
    if (module.status === "archived") return;
    if (module.status === "published" && courseStatus === "published") {
      setArchiveConfirm(true);
      return;
    }
    const next = module.status === "published" ? "draft" : "published";
    if (module.status !== "published") {
      setPublishConfirm(true);
      return;
    }
    updateModule.mutate(
      { status: next },
      {
        onSuccess: () =>
          toast.success(
            next === "published"
              ? t("teacher_common.module_published")
              : t("teacher_common.module_unpublished"),
          ),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  function archiveModule() {
    updateModule.mutate(
      { status: "archived" },
      {
        onSuccess: () => {
          setArchiveConfirm(false);
          toast.success(t("teacher_common.module_archived"));
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  function publishModule() {
    updateModule.mutate(
      { status: "published" },
      {
        onSuccess: () => {
          setPublishConfirm(false);
          toast.success(t("teacher_common.module_published"));
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  return (
    <>
      <Button
        type="button"
        onClick={toggleStatus}
        disabled={updateModule.isPending || module.status === "archived"}
        variant={module.status === "published" ? "outline" : "default"}
        className={cn(
          "shrink-0 gap-2",
          module.status === "draft" &&
            "bg-emerald-600 text-white hover:bg-emerald-700 border-0",
        )}
        title={
          module.status === "published"
            ? t("teacher_common.hide_module_hint")
            : module.status === "archived"
              ? t("teacher_common.archived_module_hint")
              : t("teacher_common.publish_module_hint")
        }
      >
        {updateModule.isPending &&
        updateModule.variables &&
        "status" in updateModule.variables ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : module.status === "published" ? (
          <EyeOff className="h-4 w-4" />
        ) : module.status === "archived" ? (
          <Archive className="h-4 w-4" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        {module.status === "published"
          ? courseStatus === "published"
            ? t("teacher_common.archive")
            : t("teacher_common.unpublish")
          : module.status === "archived"
            ? t("teacher_common.archived")
            : t("teacher_common.publish_item")}
      </Button>
      <ConfirmDialog
        open={publishConfirm}
        onOpenChange={setPublishConfirm}
        title={t("teacher_common.publish_module_title")}
        description={t("teacher_common.publish_module_body")}
        confirmLabel={t("teacher_common.publish_item")}
        cancelLabel={t("common.cancel")}
        confirmVariant="default"
        isPending={updateModule.isPending}
        onConfirm={publishModule}
      />
      <ConfirmDialog
        open={archiveConfirm}
        onOpenChange={setArchiveConfirm}
        title={t("teacher_common.archive_module_title")}
        description={t("teacher_common.archive_module_body")}
        confirmLabel={t("teacher_common.archive")}
        cancelLabel={t("common.cancel")}
        confirmVariant="destructive"
        isPending={updateModule.isPending}
        onConfirm={archiveModule}
      />
    </>
  );
}

import { useState } from "react";
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
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  function toggleStatus() {
    if (module.status === "archived") return;
    if (module.status === "published" && courseStatus === "published") {
      setArchiveConfirm(true);
      return;
    }
    const next = module.status === "published" ? "draft" : "published";
    updateModule.mutate(
      { status: next },
      {
        onSuccess: () =>
          toast.success(
            next === "published" ? "Module published" : "Module unpublished",
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
          toast.success("Module archived");
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
            ? "Hide this module from students"
            : module.status === "archived"
              ? "This module is archived and cannot be republished"
              : "Make this module visible to enrolled students"
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
            ? "Archive"
            : "Unpublish"
          : module.status === "archived"
            ? "Archived"
            : "Publish"}
      </Button>
      <ConfirmDialog
        open={archiveConfirm}
        onOpenChange={setArchiveConfirm}
        title="Archive this module?"
        description="The module will be hidden from students and no new attempts can start. In-progress attempts can still be completed, and historical progress is preserved. This cannot be undone."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isPending={updateModule.isPending}
        onConfirm={archiveModule}
      />
    </>
  );
}

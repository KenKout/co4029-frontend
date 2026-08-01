import { CheckCircle, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import type { UpdateModuleMutation } from "./types";

/**
 * Publish / unpublish toggle in the module header. Moved verbatim out of the
 * former 293-line `ModuleManagePage` together with its `toggleStatus` handler.
 */
export function ModulePublishButton({
  module,
  updateModule,
}: {
  module: CourseContentModule;
  updateModule: UpdateModuleMutation;
}) {
  function toggleStatus() {
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

  return (
    <Button
      type="button"
      onClick={toggleStatus}
      disabled={updateModule.isPending}
      variant={module.status === "published" ? "outline" : "default"}
      className={cn(
        "shrink-0 gap-2",
        module.status === "published"
          ? ""
          : "bg-emerald-600 text-white hover:bg-emerald-700 border-0",
      )}
      title={
        module.status === "published"
          ? "Hide this module from students"
          : "Make this module visible to enrolled students"
      }
    >
      {updateModule.isPending &&
      updateModule.variables &&
      "status" in updateModule.variables ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : module.status === "published" ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      {module.status === "published" ? "Unpublish" : "Publish"}
    </Button>
  );
}

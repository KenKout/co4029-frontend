import type { CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import type { UpdateModuleMutation } from "./types";

/**
 * Status pill + item/duration summary under the module title. Shows "…" while a
 * status PATCH is in flight. Moved verbatim out of `ModuleManagePage`.
 */
export function ModuleMetaRow({
  module,
  updateModule,
  itemCount,
}: {
  module: CourseContentModule;
  updateModule: UpdateModuleMutation;
  itemCount: number;
}) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span
        className={cn(
          "text-[10px] font-bold px-2.5 py-1 rounded-full border-0",
          module.status === "published"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-50 text-amber-700",
        )}
      >
        {updateModule.isPending &&
        updateModule.variables &&
        "status" in updateModule.variables
          ? "…"
          : module.status}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {itemCount} item{itemCount !== 1 ? "s" : ""}
        {module.estimated_minutes && ` · ~${module.estimated_minutes}m`}
      </span>
    </div>
  );
}

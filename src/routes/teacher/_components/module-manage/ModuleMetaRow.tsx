import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
          : t(`teacher_common.status_${module.status}`)}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {t("teacher_common.item_count", { count: itemCount })}
        {module.estimated_minutes &&
          t("teacher_common.duration_suffix", {
            minutes: module.estimated_minutes,
          })}
      </span>
    </div>
  );
}

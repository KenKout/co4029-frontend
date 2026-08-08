import type { CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ModuleAccordionController } from "./use-module-accordion";
import type { TranslateFn } from "./types";

/**
 * Status badge in the module header — click to toggle between draft and
 * published. Moved verbatim out of `ModuleAccordion`.
 */
export function ModuleStatusToggle({
  module,
  updateModule,
  onToggleStatus,
  t,
}: {
  module: CourseContentModule;
  updateModule: ModuleAccordionController["updateModule"];
  onToggleStatus: (e: React.MouseEvent) => void;
  t: TranslateFn;
}) {
  return (
    <Button variant="ghost"
      type="button"
      title={t("teacher_common.mark_module_as", {
        status: t(
          `teacher_dashboard.status.${module.status === "published" ? "draft" : "published"}`,
        ),
      })}
      onClick={onToggleStatus}
      disabled={updateModule.isPending}
      className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full border-0 transition-colors cursor-pointer h-auto whitespace-normal",
        module.status === "published"
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-amber-50 text-amber-700 hover:bg-amber-100",
      )}
    >
      {updateModule.isPending
        ? "…"
        : module.status
          ? t(`teacher_dashboard.status.${module.status}`)
          : module.status}
    </Button>
  );
}

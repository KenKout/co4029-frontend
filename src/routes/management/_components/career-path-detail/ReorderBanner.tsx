import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoursesTabController } from "./use-courses-tab";

/**
 * Sticky-free warning strip shown while the local course order differs from
 * the persisted one, offering discard / save.
 */
export function ReorderBanner({
  controller,
}: {
  controller: CoursesTabController;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
      <p className="text-xs font-semibold text-amber-900">
        {t("management_career_path_detail.hints.reorder_dirty")}
      </p>
      <div className="flex gap-1.5">
        <Button
          size="xs"
          variant="ghost"
          onClick={() => controller.setOrder(null)}
          disabled={controller.reorder.isPending}
        >
          {t("common.cancel")}
        </Button>
        <Button
          size="xs"
          onClick={controller.handleSubmitReorder}
          disabled={controller.reorder.isPending}
          className="gap-1.5"
        >
          {controller.reorder.isPending && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {t("management_career_path_detail.actions.save_order")}
        </Button>
      </div>
    </div>
  );
}

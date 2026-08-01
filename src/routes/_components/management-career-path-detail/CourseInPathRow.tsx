import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useRemoveCareerPathCourse } from "@/lib/api/hooks/career-paths";
import type { CareerPathCourseAuthoring } from "@/lib/api/types";
import { RemoveRowButtons } from "./RemoveRowButtons";
import type { CoursesTabController } from "./use-courses-tab";

/**
 * One attached course: reorder arrows, position chip, title/slug, the
 * required-or-optional marker and the remove control.
 */
export function CourseInPathRow({
  row,
  index,
  pathId,
  controller,
}: {
  row: CareerPathCourseAuthoring;
  index: number;
  pathId: string;
  controller: CoursesTabController;
}) {
  const { t } = useTranslation();
  const remove = useRemoveCareerPathCourse(pathId, row.course_id);
  const [confirming, setConfirming] = useState(false);
  const total = controller.rows.length;

  function handleRemove() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("management_career_path_detail.toasts.course_removed"));
        setConfirming(false);
        controller.removeLocally(row.course_id);
      },
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("management_career_path_detail.errors.remove_course_failed"),
        ),
    });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card ghost-border">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => controller.move(index, -1)}
          disabled={index === 0}
          className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title={t("management_career_path_detail.actions.move_up")}
        >
          <ArrowUp className="h-3 w-3 text-m3-on-surface-variant" />
        </button>
        <button
          type="button"
          onClick={() => controller.move(index, 1)}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title={t("management_career_path_detail.actions.move_down")}
        >
          <ArrowDown className="h-3 w-3 text-m3-on-surface-variant" />
        </button>
      </div>
      <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-m3-primary-fixed text-m3-primary shrink-0 font-headline font-bold text-xs">
        {row.position}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {row.course_title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] font-mono text-m3-on-surface-variant truncate">
            {row.course_slug}
          </span>
          <span
            className={
              row.is_required
                ? "text-[10px] font-bold uppercase text-m3-primary"
                : "text-[10px] font-bold uppercase text-m3-on-surface-variant"
            }
          >
            {t(
              "management_career_path_detail.labels.required_or_optional",
            ).split(" / ")[row.is_required ? 0 : 1] ??
              t("management_career_path_detail.labels.required_or_optional")}
          </span>
        </div>
      </div>
      <RemoveRowButtons
        confirming={confirming}
        isPending={remove.isPending}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onStartConfirm={() => setConfirming(true)}
        onCancel={() => setConfirming(false)}
        onRemove={handleRemove}
        wrapperClassName="flex gap-1"
        triggerClassName="text-red-600 hover:text-red-700"
      />
    </div>
  );
}

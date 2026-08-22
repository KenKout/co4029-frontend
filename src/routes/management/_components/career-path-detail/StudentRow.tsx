import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRemoveCareerPathStudent } from "@/lib/api/hooks/career-paths";
import type { StudentPathProgressAuthoring } from "@/lib/api/types";
import { RemoveRowButtons } from "./RemoveRowButtons";

/** One enrolled student: identity, completion counter, progress bar, remove. */
export function StudentRow({
  pathId,
  row,
  canUnenroll,
}: {
  pathId: string;
  row: StudentPathProgressAuthoring;
  canUnenroll: boolean;
}) {
  const { t } = useTranslation();
  const remove = useRemoveCareerPathStudent(pathId, row.student_id);
  const [confirming, setConfirming] = useState(false);

  function handleRemove() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(
          t("management_career_path_detail.toasts.student_unregistered"),
        );
        setConfirming(false);
      },
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("management_career_path_detail.errors.unregister_student_failed"),
        ),
    });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card ghost-border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {row.student_email}
        </p>
        <p className="text-[11px] font-mono text-m3-on-surface-variant truncate mt-0.5">
          {row.student_id}
        </p>
      </div>
      <div className="text-right shrink-0 min-w-[120px]">
        <p className="text-xs text-m3-on-surface font-semibold">
          {t("management_career_path_detail.labels.student_completion", {
            completed: row.completed_courses,
            total: row.course_count,
          })}
        </p>
        <div className="mt-1 h-1.5 w-full bg-m3-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-m3-primary transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, row.overall_percent))}%`,
            }}
          />
        </div>
      </div>
      {canUnenroll && (
        <RemoveRowButtons
          confirming={confirming}
          isPending={remove.isPending}
          confirmLabel={t("common.confirm")}
          cancelLabel={t("common.cancel")}
          onStartConfirm={() => setConfirming(true)}
          onCancel={() => setConfirming(false)}
          onRemove={handleRemove}
          wrapperClassName="flex gap-1 shrink-0"
          triggerClassName="text-red-600 hover:text-red-700 shrink-0"
        />
      )}
    </div>
  );
}

import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useRestoreCourse } from "@/lib/api/hooks/admin";
import type { CourseAuthoring } from "@/lib/api/types";

export function RestoreButton({ course }: { course: CourseAuthoring }) {
  const { t } = useTranslation();
  const restore = useRestoreCourse();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        restore.mutate(course.id, {
          onSuccess: () =>
            toast.success(t("admin.course_detail.toasts.restored")),
          onError: (err) =>
            toast.error(
              (err as Error).message ||
                t("admin.course_detail.toasts.restore_failed"),
            ),
        });
      }}
      disabled={restore.isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {restore.isPending
        ? t("admin.course_detail.restoring")
        : t("admin.course_detail.restore")}
    </button>
  );
}

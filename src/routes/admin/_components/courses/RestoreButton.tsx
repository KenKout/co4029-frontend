import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useRestoreCourse } from "@/lib/api/hooks/admin";
import type { CourseAuthoring } from "@/lib/api/types";

export function RestoreButton({ course }: { course: CourseAuthoring }) {
  const { t } = useTranslation();
  const restore = useRestoreCourse();
  return (
    <Tooltip content={t("admin.course_detail.restore")}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("admin.course_detail.restore")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          restore.mutate(course.id, {
            onSuccess: () =>
              toast.success(t("admin.course_detail.toasts.restored")),
            onError: (err) =>
              toast.error(
                err.message || t("admin.course_detail.toasts.restore_failed"),
              ),
          });
        }}
        disabled={restore.isPending}
        className="text-m3-primary hover:bg-m3-primary/10 hover:text-m3-primary disabled:opacity-50"
      >
        <RotateCcw />
      </Button>
    </Tooltip>
  );
}

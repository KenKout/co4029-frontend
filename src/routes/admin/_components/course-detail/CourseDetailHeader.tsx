import { RotateCcw } from "lucide-react";

import type { CourseDetailController } from "./use-admin-course-detail";
import { Button } from "@/components/ui/button";

/** Title, course id and the restore action. */
export function CourseDetailHeader({ c }: { c: CourseDetailController }) {
  const { t, courseId, restore, handleRestore } = c;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.course_detail.title")}
        </h1>
        <p className="text-sm text-text-muted mt-1 font-mono break-all">
          {courseId}
        </p>
      </div>
      <Button variant="ghost"
        type="button"
        onClick={handleRestore}
        disabled={restore.isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity h-auto whitespace-normal"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {restore.isPending
          ? t("admin.course_detail.restoring")
          : t("admin.course_detail.restore")}
      </Button>
    </div>
  );
}

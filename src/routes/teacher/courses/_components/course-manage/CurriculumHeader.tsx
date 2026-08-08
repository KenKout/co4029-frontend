import { useTranslation } from "react-i18next";
import { GripVertical } from "lucide-react";

import type { CourseManageController } from "./use-course-manage-controller";
import { Button } from "@/components/ui/button";

/**
 * Curriculum section heading plus the expand/collapse-all pair (T#1/#3): fast
 * way to open or compact every module at once. Extracted verbatim from the
 * former 255-line course-manage.tsx.
 */
export function CurriculumHeader({
  controller,
}: {
  controller: CourseManageController;
}) {
  const { t } = useTranslation();
  const { modules, setAllModules } = controller;
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-m3-primary" />
        <h2 className="text-base font-headline font-bold text-m3-primary">
          {t("teacher_common.section_curriculum")}
        </h2>
      </div>
      {modules.length > 1 && (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost"
            type="button"
            onClick={() => setAllModules(true)}
            className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors cursor-pointer px-2 py-1"
          >
            {t("teacher_common.expand_all")}
          </Button>
          <span className="text-m3-outline-variant">·</span>
          <Button variant="ghost"
            type="button"
            onClick={() => setAllModules(false)}
            className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors cursor-pointer px-2 py-1"
          >
            {t("teacher_common.collapse_all")}
          </Button>
        </div>
      )}
    </div>
  );
}

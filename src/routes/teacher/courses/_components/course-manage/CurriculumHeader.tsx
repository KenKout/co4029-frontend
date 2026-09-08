import { useTranslation } from "react-i18next";
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
  if (modules.length <= 1) return null;
  return (
    <div className="flex min-h-8 items-center justify-end gap-2">
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          type="button"
          onClick={() => setAllModules(true)}
          className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors cursor-pointer px-2 py-1 h-auto whitespace-normal"
        >
          {t("teacher_common.expand_all")}
        </Button>
        <span className="text-m3-outline-variant">·</span>
        <Button
          variant="ghost"
          type="button"
          onClick={() => setAllModules(false)}
          className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors cursor-pointer px-2 py-1 h-auto whitespace-normal"
        >
          {t("teacher_common.collapse_all")}
        </Button>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";

import { STAT_TILES } from "./constants";
import type { TeacherCoursesController } from "./use-courses-controller";

/**
 * Stat strip — the per-status breakdown promoted out of the subtitle
 * into scannable tiles (same visual family as the dashboard).
 *
 * Extracted verbatim from the former 234-line courses.tsx.
 */
export function CoursesStatStrip({
  controller,
}: {
  controller: TeacherCoursesController;
}) {
  const { t } = useTranslation();
  const { counts } = controller;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {STAT_TILES.map(({ key, countKey, icon: Icon }) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-xl bg-card ghost-border shadow-editorial p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed">
            <Icon className="h-4 w-4 text-m3-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-headline font-bold text-m3-on-surface leading-none">
              {counts[countKey]}
            </p>
            <p className="text-[11px] text-m3-on-surface-variant mt-0.5 truncate">
              {t(`teacher_courses_list.stat_${key}`)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

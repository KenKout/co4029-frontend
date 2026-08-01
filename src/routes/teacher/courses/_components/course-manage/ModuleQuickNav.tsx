import { useTranslation } from "react-i18next";
import { CheckCheck, CircleDot } from "lucide-react";

import { modulePublishProgress } from "./helpers";
import type { CourseManageController } from "./use-course-manage-controller";

/**
 * Horizontal quick-nav bar (T#3/#4): jump to any module + see its
 * publish progress at a glance. Was a 220px left rail that squeezed
 * the module cards; now a full-width horizontal chip row that
 * scrolls on overflow, so modules get the full width.
 *
 * Extracted verbatim from the former 255-line course-manage.tsx; the caller
 * still guards on `modules.length > 1`.
 */
export function ModuleQuickNav({
  controller,
}: {
  controller: CourseManageController;
}) {
  const { t } = useTranslation();
  const { modules, scrollToModule } = controller;
  return (
    <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-m3-outline-variant/40 pb-2">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant/70">
        {t("teacher_common.jump_to")}
      </span>
      {modules.map((module) => {
        const { items, pub, done } = modulePublishProgress(module);
        return (
          <button
            key={module.id}
            type="button"
            onClick={() => scrollToModule(module.id)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-m3-outline-variant/60 px-3 py-1 text-left text-xs text-m3-on-surface hover:border-m3-primary hover:bg-m3-surface-container transition-colors cursor-pointer group"
          >
            {done ? (
              <CheckCheck className="h-3 w-3 shrink-0 text-emerald-600" />
            ) : (
              <CircleDot className="h-3 w-3 shrink-0 text-m3-outline-variant group-hover:text-m3-primary" />
            )}
            <span className="max-w-[12rem] truncate group-hover:text-m3-primary transition-colors">
              {module.title}
            </span>
            {items.length > 0 && (
              <span className="text-[10px] text-m3-on-surface-variant shrink-0">
                {pub}/{items.length}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

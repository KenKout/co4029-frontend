import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { ModuleSection } from "./ModuleSection";
import type { CurriculumProps } from "./types";

/**
 * Lesson-mode curriculum sidebar. Only rendered in lesson mode: in home mode
 * the main-column CourseHome renders the full curriculum, so showing the
 * sidebar too would duplicate it.
 */
export function CurriculumSidebar({
  sortedModules,
  flatItems,
  lessonItems,
  itemState,
  onSelect,
  slug,
  activeModuleId,
  inProgressByConfigId,
  interviewProgressMap,
  nextItemId,
}: CurriculumProps) {
  const { t } = useTranslation();

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-4">
      <GlassCard className="flex flex-col overflow-hidden">
        {/* Header matches the course-home curriculum header: icon + title, no
            background band, compact. */}
        <div className="flex items-center gap-2 px-4 py-3">
          <BookOpen className="h-4 w-4 text-m3-secondary" />
          <h3 className="font-headline font-bold text-m3-on-surface text-sm">
            {t("course_learn.home.curriculum", "Curriculum")}
          </h3>
        </div>
        <div className="overflow-y-auto max-h-[520px] p-3 space-y-4">
          {sortedModules.map((mod) => (
            <ModuleSection
              key={mod.id}
              mod={mod}
              flatItems={flatItems}
              lessonItems={lessonItems}
              itemState={itemState}
              onSelect={onSelect}
              slug={slug}
              isActiveModule={activeModuleId === mod.id}
              inProgressByConfigId={inProgressByConfigId}
              interviewProgressMap={interviewProgressMap}
              nextItemId={nextItemId}
              variant="home"
            />
          ))}
        </div>
      </GlassCard>
    </aside>
  );
}

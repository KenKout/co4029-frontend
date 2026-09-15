import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown } from "lucide-react";
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

  const curriculumContent = (
    <div className="space-y-4 p-3">
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
  );

  return (
    <aside className="order-first flex w-full flex-shrink-0 flex-col gap-4 self-start lg:order-none lg:sticky lg:top-24 lg:w-72 xl:w-80">
      <details className="group overflow-hidden rounded-xl border border-m3-outline-variant/20 bg-card shadow-sm lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <BookOpen className="h-4 w-4 text-m3-secondary" />
          <span className="flex-1 font-headline text-sm font-bold text-m3-on-surface">
            {t("course_learn.home.curriculum", "Curriculum")}
          </span>
          <ChevronDown className="h-4 w-4 text-m3-on-surface-variant transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="max-h-[55vh] overflow-y-auto border-t border-m3-outline-variant/20">
          {curriculumContent}
        </div>
      </details>

      <GlassCard className="hidden flex-col overflow-hidden lg:flex">
        {/* Header matches the course-home curriculum header: icon + title, no
            background band, compact. */}
        <div className="flex items-center gap-2 px-4 py-3">
          <BookOpen className="h-4 w-4 text-m3-secondary" />
          <h3 className="font-headline font-bold text-m3-on-surface text-sm">
            {t("course_learn.home.curriculum", "Curriculum")}
          </h3>
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">
          {curriculumContent}
        </div>
      </GlassCard>
    </aside>
  );
}

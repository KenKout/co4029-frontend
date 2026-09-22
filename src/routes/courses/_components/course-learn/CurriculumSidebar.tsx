import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { ModuleSection } from "./ModuleSection";
import { InstructorBlock } from "./InstructorBlock";
import type { CurriculumProps } from "./types";
import type { InstructorRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";

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
  instructors = [],
}: CurriculumProps & { instructors?: InstructorRead[] }) {
  const { t } = useTranslation();

  const curriculumContent = (
    <div className="min-w-0 space-y-4 p-3">
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
    <aside className="flex w-full min-w-0 flex-shrink-0 flex-col gap-4 self-start lg:sticky lg:top-24 lg:w-72 xl:w-80">
      <details className="group w-full min-w-0 overflow-hidden rounded-xl border border-m3-outline-variant/20 bg-card shadow-sm lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <BookOpen className="h-4 w-4 text-m3-secondary" />
          <span className="flex-1 font-headline text-sm font-bold text-m3-on-surface">
            {t("course_learn.home.curriculum", "Curriculum")}
          </span>
          <ChevronDown className="h-4 w-4 text-m3-on-surface-variant transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="max-h-[55vh] overflow-y-auto overscroll-contain border-t border-m3-outline-variant/20">
          {curriculumContent}
        </div>
      </details>

      <GlassCard className="hidden min-w-0 flex-col lg:flex">
        {/* Header matches the course-home curriculum header: icon + title, no
            background band, compact. */}
        <div className="flex items-center gap-2 px-4 py-3">
          <BookOpen className="h-4 w-4 text-m3-secondary" />
          <h3 className="font-headline font-bold text-m3-on-surface text-sm">
            {t("course_learn.home.curriculum", "Curriculum")}
          </h3>
        </div>
        <div
          className={cn(
            "min-w-0 overflow-y-auto overscroll-contain border-t border-m3-outline-variant/20",
            instructors.length > 0
              ? "max-h-[calc(100dvh-27rem)]"
              : "max-h-[calc(100dvh-10rem)]",
          )}
        >
          {curriculumContent}
        </div>
      </GlassCard>
      {instructors.length > 0 && <InstructorBlock instructors={instructors} />}
    </aside>
  );
}

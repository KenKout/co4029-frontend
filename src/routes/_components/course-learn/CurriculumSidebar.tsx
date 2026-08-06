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
  return (
    <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-4">
      <GlassCard className="flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-m3-outline-variant/20 bg-m3-primary/5">
          <h3 className="font-headline font-bold text-m3-primary text-sm">
            Curriculum
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
            />
          ))}
        </div>
      </GlassCard>
    </aside>
  );
}

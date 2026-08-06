import { useTranslation } from "react-i18next";
import { Play, CheckCircle2, PlayCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { useCourseBySlug } from "@/lib/api/hooks/courses";
import { ModuleSection } from "./ModuleSection";
import type { CurriculumProps } from "./types";

export interface CourseHomeProps extends CurriculumProps {
  course: NonNullable<ReturnType<typeof useCourseBySlug>["data"]>;
  completedCount: number;
  totalLessons: number;
  resumeIdx: number;
  resumeLabel?: string;
  resumeStarted: boolean;
}

/**
 * Course-home landing shown when the student arrives without a content
 * deep-link: progress, a resume/start CTA, and the full curriculum the cramped
 * sidebar cannot surface.
 */
export function CourseHome({
  course,
  sortedModules,
  flatItems,
  lessonItems,
  itemState,
  onSelect,
  slug,
  activeModuleId,
  completedCount,
  totalLessons,
  resumeIdx,
  resumeLabel,
  resumeStarted,
  inProgressByConfigId,
  interviewProgressMap,
  nextItemId,
}: CourseHomeProps) {
  const { t } = useTranslation();
  const pct =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const allDone = totalLessons > 0 && completedCount >= totalLessons;

  return (
    <div className="space-y-6" data-testid="course-learn-home">
      {/* Hero: title + resume/start CTA + progress */}
      <GlassCard className="p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <span className="text-xs font-headline font-semibold uppercase tracking-wider text-m3-secondary">
            {t("course_learn.home.eyebrow")}
          </span>
          <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-none">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-sm text-m3-on-surface-variant leading-relaxed max-w-2xl">
              {course.description}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-m3-on-surface-variant">
              {t("course_learn.home.progress_label", {
                completed: completedCount,
                total: totalLessons,
              })}
            </span>
            <span className="text-m3-primary">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-m3-surface-variant rounded-full overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Continue / Start CTA. pt-1 + border-t separates it from the
            progress bar above — otherwise at 100% the fully-filled bar and
            this button share the same gradient-primary fill and visually merge. */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-m3-outline-variant/15">
          <Button
            className="rounded-xl gradient-primary text-white font-bold gap-2"
            onClick={() => onSelect(resumeIdx)}
            data-testid="course-learn-home-resume"
          >
            {allDone ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t("course_learn.home.review")}
              </>
            ) : resumeStarted ? (
              <>
                <PlayCircle className="h-4 w-4" />
                {t("course_learn.home.continue")}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                {t("course_learn.home.start")}
              </>
            )}
          </Button>
          {resumeLabel && !allDone && (
            <span className="text-xs text-m3-on-surface-variant truncate max-w-[240px]">
              {t("course_learn.home.next_up")}: {resumeLabel}
            </span>
          )}
        </div>
      </GlassCard>

      {/* Full curriculum — the "display them all" surface, on the main column */}
      <GlassCard className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-m3-secondary" />
          <h2 className="font-headline font-bold text-m3-on-surface text-sm">
            {t("course_learn.home.curriculum")}
          </h2>
        </div>
        <div className="space-y-4">
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
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown, GraduationCap } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type {
  useCourseContent,
  useCourseOutcomes,
} from "@/lib/api/hooks/courses";
import type { MyCourseProgressSummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { SkeletonBlock } from "./CourseDetailAtoms";
import { ModuleAccordion } from "./ModuleAccordion";

type CourseContentData = ReturnType<typeof useCourseContent>["data"];
type CourseOutcomesData = ReturnType<typeof useCourseOutcomes>["data"];

/** How many outcomes are shown before the "Show all" toggle kicks in. */
const OUTCOMES_PREVIEW_COUNT = 6;

/**
 * "What you'll learn" — hidden entirely when the course has no outcomes.
 *
 * Shows the first six as tight one-liners (the landing page reads better
 * with a short parallel list); a "Show all" toggle reveals the rest when a
 * course carries more.
 */
export function CourseOutcomesSection({
  outcomes,
  isLoading,
}: {
  outcomes: CourseOutcomesData;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <SkeletonBlock className="h-48" />;
  if (!outcomes || outcomes.length === 0) return null;

  const hasMore = outcomes.length > OUTCOMES_PREVIEW_COUNT;
  const visible = showAll ? outcomes : outcomes.slice(0, OUTCOMES_PREVIEW_COUNT);

  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <GraduationCap className="h-5 w-5 text-m3-secondary" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface">
          {t("course_detail.what_youll_learn")}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((outcome) => (
          <div key={outcome.id} className="flex items-start gap-3 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-m3-secondary shrink-0 mt-0.5 fill-m3-secondary/10" />
            <p
              title={outcome.outcome_text}
              className="text-sm text-m3-on-surface-variant leading-snug truncate"
            >
              {outcome.outcome_text}
            </p>
          </div>
        ))}
      </div>
      {hasMore && (
        <Button variant="ghost"
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 flex items-center gap-1 text-xs font-bold text-m3-primary hover:text-m3-primary-dark transition-colors cursor-pointer"
        >
          {showAll ? t("course_detail.show_less") : t("course_detail.show_all")}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${showAll ? "rotate-180" : ""}`}
          />
        </Button>
      )}
    </GlassCard>
  );
}

/** The module list, its skeleton, and the no-modules notice. */
function CourseContentBody({
  content,
  moduleCount,
  isLoading,
  progress,
}: {
  content: CourseContentData;
  moduleCount: number;
  isLoading: boolean;
  progress?: MyCourseProgressSummary;
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (content && moduleCount > 0) {
    return <ModuleAccordion modules={content.modules} progress={progress} />;
  }

  return (
    <div className="rounded-xl border border-dashed border-m3-outline-variant p-10 text-center">
      <p className="text-sm text-m3-on-surface-variant">
        {t("course_detail.no_modules")}
      </p>
    </div>
  );
}

/** "Course content" heading + module count + the body above. */
export function CourseContentSection({
  content,
  moduleCount,
  isLoading,
  progress,
}: {
  content: CourseContentData;
  moduleCount: number;
  isLoading: boolean;
  progress?: MyCourseProgressSummary;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-headline font-bold text-xl text-m3-on-surface">
          {t("course_detail.course_content")}
        </h2>
        {!isLoading && content && (
          <span className="text-xs text-m3-on-surface-variant">
            {t("course_detail.modules_count", { count: moduleCount })}
          </span>
        )}
      </div>

      <CourseContentBody
        content={content}
        moduleCount={moduleCount}
        isLoading={isLoading}
        progress={progress}
      />
    </div>
  );
}

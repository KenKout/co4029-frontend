import { useTranslation } from "react-i18next";
import { Bot, CheckCircle2, GraduationCap } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type {
  useCourseContent,
  useCourseOutcomes,
} from "@/lib/api/hooks/courses";
import { SkeletonBlock } from "./CourseDetailAtoms";
import { ModuleAccordion } from "./ModuleAccordion";

type CourseContentData = ReturnType<typeof useCourseContent>["data"];
type CourseOutcomesData = ReturnType<typeof useCourseOutcomes>["data"];

/** "What you'll learn" — hidden entirely when the course has no outcomes. */
export function CourseOutcomesSection({
  outcomes,
  isLoading,
}: {
  outcomes: CourseOutcomesData;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  if (isLoading) return <SkeletonBlock className="h-48" />;
  if (!outcomes || outcomes.length === 0) return null;

  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <GraduationCap className="h-5 w-5 text-m3-secondary" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface">
          {t("course_detail.what_youll_learn")}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {outcomes.map((outcome) => (
          <div key={outcome.id} className="flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-m3-secondary shrink-0 mt-0.5 fill-m3-secondary/10" />
            <p className="text-sm text-m3-on-surface-variant leading-snug">
              {outcome.outcome_text}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/** The module list, its skeleton, and the no-modules notice. */
function CourseContentBody({
  content,
  moduleCount,
  isLoading,
}: {
  content: CourseContentData;
  moduleCount: number;
  isLoading: boolean;
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
    return <ModuleAccordion modules={content.modules} />;
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
}: {
  content: CourseContentData;
  moduleCount: number;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
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
      />
    </div>
  );
}

/** The AI mock-interview teaser card. */
export function AiMockInterviewCard() {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-6 sm:p-8 bg-gradient-to-br from-m3-secondary/5 to-m3-primary/5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl gradient-secondary flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-headline font-bold text-m3-primary text-base">
            {t("course_detail.ai_mock_title")}
          </h3>
          <p className="text-sm text-m3-on-surface-variant leading-relaxed">
            {t("course_detail.ai_mock_body")}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

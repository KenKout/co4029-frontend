import { useTranslation } from "react-i18next";
import { Bot, ListChecks } from "lucide-react";

import type {
  CourseInterviewController,
  InterviewConfig,
  InterviewCourse,
} from "./use-course-interview";

/**
 * The lobby card's opening block — context eyebrow, interview title, blurb and
 * the criteria-count chip. Moved verbatim out of course-interview.tsx.
 */
export function LobbyHeader({
  course,
  config,
  takingPayload,
}: {
  course: InterviewCourse;
  config: InterviewConfig;
  takingPayload: CourseInterviewController["takingPayload"];
}) {
  const { t } = useTranslation();
  const outcomeCount = takingPayload?.outcome_count ?? 0;

  return (
    <>
      {/* Module-context eyebrow — gives the bare title a frame of
          reference (which course / that this is an AI module interview). */}
      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-secondary">
        <Bot className="h-3.5 w-3.5" />
        <span>{t("course_interview.labels.ai_interview")}</span>
        {course?.title && (
          <>
            <span className="text-m3-outline">·</span>
            <span className="normal-case font-semibold text-m3-on-surface-variant truncate max-w-[220px]">
              {course.title}
            </span>
          </>
        )}
      </div>
      <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-3">
        {config.title}
      </h1>
      <p className="text-m3-on-surface-variant mb-6">
        {t("course_interview.intro.description")}
      </p>

      {/* Criteria count — a safe expectation-setting signal (count only,
          no rubric text / weights / threshold, per the learner contract). */}
      {outcomeCount > 0 && (
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-m3-primary-fixed px-3 py-1 text-xs font-semibold text-m3-primary">
          <ListChecks className="h-3.5 w-3.5" />
          {t("course_interview.criteria.assessed_on", {
            count: outcomeCount,
          })}
        </div>
      )}
    </>
  );
}

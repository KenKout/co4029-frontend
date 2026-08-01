import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { StudyPlanItem } from "@/lib/api/types";
import { humanResources } from "./helpers";

/**
 * Study plan — merged into the Notes card as its own section. Each suggestion
 * links to its lesson's materials page when a lesson is known, so the teacher
 * can jump straight to the remediation content.
 */
export function StudyPlanSection({
  studyPlan,
  courseId,
}: {
  studyPlan: StudyPlanItem[];
  courseId: string | null | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 space-y-2.5">
      <p className="text-[11px] uppercase font-bold tracking-widest text-m3-on-surface-variant">
        {t("teacher_interview_gap_report.sections.study_plan")}
      </p>
      {studyPlan.length === 0 ? (
        <p className="text-sm italic text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.empty_states.no_study_plan")}
        </p>
      ) : (
        <ol className="space-y-2.5">
          {studyPlan.map((item, idx) => {
            const resources = humanResources(item.suggested_resources);
            const canLink = Boolean(courseId && item.lesson_id);
            const body = (
              <div className="flex items-start gap-2">
                <span className="shrink-0 h-6 w-6 rounded-full bg-m3-primary text-white flex items-center justify-center text-xs font-extrabold">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-m3-on-surface inline-flex items-center gap-1">
                    {item.topic}
                    {canLink && (
                      <ChevronRight className="h-3.5 w-3.5 text-m3-primary shrink-0" />
                    )}
                  </p>
                  {resources.length > 0 && (
                    <p className="text-xs text-m3-on-surface-variant mt-1">
                      {resources.join(" • ")}
                    </p>
                  )}
                </div>
              </div>
            );
            return (
              <li
                key={`${item.topic}-${idx}`}
                className="rounded-xl bg-m3-surface-container-low p-3"
              >
                {canLink ? (
                  <Link
                    to="/teacher/courses/$courseId/lessons/$lessonId"
                    params={{
                      courseId: courseId as string,
                      lessonId: item.lesson_id as string,
                    }}
                    className="block transition-colors hover:bg-m3-surface-container rounded-lg -m-1 p-1"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

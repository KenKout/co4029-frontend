import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Loader2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { rowStaggerStyle } from "@/lib/interview/stagger";
import type { ResultPhase } from "./constants";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * Study plan / gap report as the path forward (#6), plus its pending skeleton.
 * Moved verbatim out of course-interview.tsx.
 */

export function StudyPlanPendingCard() {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-m3-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("course_interview.sections.gap_report_pending")}
      </div>
      <div className="mt-4 space-y-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-14 rounded-xl bg-m3-surface-container-low motion-safe:animate-pulse"
          />
        ))}
      </div>
    </GlassCard>
  );
}

export function StudyPlanCard({
  gapReport,
  resultPhase,
  slug,
}: {
  gapReport: NonNullable<CourseInterviewController["gapReport"]>;
  resultPhase: ResultPhase;
  slug: string;
}) {
  const { t } = useTranslation();
  const studyPlan = gapReport.study_plan ?? [];

  return (
    <GlassCard className="p-6 motion-safe:animate-fade-in-up">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-m3-primary-fixed text-m3-primary">
          <BookOpen className="h-4 w-4" />
        </span>
        <h3 className="font-headline font-bold text-m3-primary">
          {resultPhase === "pass"
            ? t("course_interview.sections.keep_growing")
            : t("course_interview.sections.your_path_forward")}
        </h3>
      </div>
      {gapReport.discrepancy_summary && (
        <p className="text-sm text-m3-on-surface-variant mb-4 leading-relaxed">
          {gapReport.discrepancy_summary}
        </p>
      )}
      {studyPlan.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-m3-outline uppercase tracking-widest">
            {t("course_interview.sections.study_plan")}
          </h4>
          <ul className="space-y-2">
            {studyPlan.map((item, idx) => {
              const lessonId = item.lesson_id ?? null;
              const body = (
                <>
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-m3-primary shadow-sm">
                    <BookOpen className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold text-m3-on-surface">
                      {item.topic}
                      {lessonId && (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-m3-primary" />
                      )}
                    </span>
                    {item.suggested_resources.length > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.suggested_resources.map((res, ri) => (
                          <span
                            key={ri}
                            className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-m3-on-surface-variant"
                          >
                            {res}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </>
              );
              return (
                // Staggered like the teacher-side outcome rows, which
                // got this treatment in 16f31ae while the student's
                // study plan — the list they actually act on — kept
                // snapping in whole.
                <li
                  key={idx}
                  className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both"
                  style={rowStaggerStyle(idx)}
                >
                  {lessonId ? (
                    <Link
                      to="/courses/$slug/learn"
                      params={{ slug }}
                      className="flex items-start gap-2.5 rounded-xl bg-m3-surface-container-low p-3 text-sm outline-none transition-colors hover:bg-m3-surface-container focus-visible:ring-2 focus-visible:ring-m3-primary/40"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2.5 rounded-xl bg-m3-surface-container-low p-3 text-sm">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}

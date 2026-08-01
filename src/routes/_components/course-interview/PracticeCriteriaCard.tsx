import { type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleDashed, ListChecks, Loader2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * Criteria you demonstrated (practice only) —
 * Closes the loop with the panel shown before the run: same
 * criteria, now with what the rehearsal actually covered. No
 * verdict, no score, and no judge prose — see InterviewPracticeFeedback.
 * Moved verbatim out of course-interview.tsx.
 */
export function PracticeCriteriaCard({
  practiceFeedback,
}: {
  practiceFeedback: CourseInterviewController["practiceFeedback"];
}) {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-6 motion-safe:animate-fade-in-up">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <ListChecks className="h-4 w-4" />
        </span>
        <h3 className="font-headline font-bold text-m3-primary">
          {t("course_interview.mode.results_criteria_title")}
        </h3>
      </div>
      {practiceFeedback?.ready ? (
        <ul className="space-y-2">
          {practiceFeedback.criteria.map((c, i) => (
            <li
              key={c.outcome_id}
              className="flex items-start gap-2.5 rounded-xl border border-m3-outline-variant/30 p-3 text-sm motion-safe:animate-fade-in-up"
              style={
                {
                  animationDelay: `${Math.min(i, 5) * 60}ms`,
                } as CSSProperties
              }
            >
              {c.met ? (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
              ) : (
                <CircleDashed
                  className="mt-0.5 h-4 w-4 shrink-0 text-m3-on-surface-variant"
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0">
                <span className="block text-m3-on-surface">
                  {c.outcome_text}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-m3-on-surface-variant">
                  {t(
                    c.met
                      ? "course_interview.mode.criterion_met"
                      : "course_interview.mode.criterion_not_met",
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : practiceFeedback?.failed ? (
        <p className="text-sm text-m3-on-surface-variant">
          {t("course_interview.mode.results_unavailable")}
        </p>
      ) : (
        <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("course_interview.mode.results_pending")}
        </div>
      )}
    </GlassCard>
  );
}

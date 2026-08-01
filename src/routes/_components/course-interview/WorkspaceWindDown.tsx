import { useTranslation } from "react-i18next";

import type { CourseInterviewController } from "./use-course-interview";

/**
 * Closing / transition wind-down that stands in for the composer.
 *
 * Same min-height as the composer this replaces, so the stage above
 * does not lurch upward when the input surface swaps out for the
 * wind-down message and back again.
 *
 * Moved verbatim out of course-interview.tsx.
 */
export function WorkspaceWindDown({ iv }: { iv: CourseInterviewController }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[180px] shrink-0 flex-col items-center justify-center border-t border-border bg-white px-4 py-6 text-center motion-safe:animate-fade-in-up">
      {/* Calm pacing on the closing wind-down (#15): a gentle pulsing
          dot trio so the goodbye/results transition reads as a graceful
          wind-down rather than an abrupt cut. */}
      <span
        className="mb-3 inline-flex items-center justify-center gap-1.5"
        aria-hidden="true"
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 rounded-full bg-m3-primary/70 motion-safe:animate-pulse"
            style={{
              animationDelay: `${dot * 200}ms`,
              animationDuration: "1s",
            }}
          />
        ))}
      </span>
      <p className="text-sm text-text-muted" role="status" aria-live="polite">
        {iv.phase === "transition"
          ? iv.pendingNextQuestion || iv.pendingFinalTransition
            ? t("course_interview.transitions.status")
            : t("course_interview.onboarding.starting_assessment")
          : iv.phase === "closing"
            ? t("course_interview.workspace.preparing_goodbye")
            : t("course_interview.status.compiling_results")}
      </p>
    </div>
  );
}

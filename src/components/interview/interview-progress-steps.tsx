import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * The three coarse phases of an interview session, surfaced in the header so a
 * candidate always knows where they are: Setup → Interview → Completed.
 *
 * This is a presentational projection of the route's finer-grained
 * `InterviewPhase`; the mapping lives at the call site so this component stays
 * decoupled from backend/session state.
 */
export type InterviewStep = "setup" | "interview" | "completed";

const STEP_ORDER: readonly InterviewStep[] = [
  "setup",
  "interview",
  "completed",
];

/**
 * Compact, accessible step indicator for the interview header.
 *
 * Renders as an ordered list so assistive tech announces "step N of 3"; the
 * current step is marked with `aria-current="step"`, completed steps get a
 * check icon (state is never communicated by color alone, per WCAG), and the
 * whole strip collapses to dots + the active label on narrow viewports.
 */
export function InterviewProgressSteps({
  current,
  className,
}: {
  current: InterviewStep;
  className?: string;
}) {
  const { t } = useTranslation();
  const currentIndex = STEP_ORDER.indexOf(current);

  const label = (step: InterviewStep) => t(`course_interview.steps.${step}`);

  return (
    <ol
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold",
        className,
      )}
      aria-label={t("course_interview.steps.aria_label")}
    >
      {STEP_ORDER.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-1.5">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors",
                isCurrent && "bg-primary-soft text-primary",
                isComplete && "text-success",
                !isCurrent && !isComplete && "text-text-subtle",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums",
                  isCurrent &&
                    "border-primary bg-primary text-primary-foreground",
                  isComplete && "border-success bg-success text-white",
                  !isCurrent &&
                    !isComplete &&
                    "border-border-strong text-text-subtle",
                )}
              >
                {isComplete ? <Check className="h-2.5 w-2.5" /> : index + 1}
              </span>
              {/* Label is hidden on narrow screens for all but the active step
                  so the strip never overflows the header. */}
              <span className={cn(!isCurrent && "hidden sm:inline")}>
                {label(step)}
              </span>
            </span>
            {index < STEP_ORDER.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-3 shrink-0 sm:w-5",
                  isComplete ? "bg-success/50" : "bg-border-strong",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

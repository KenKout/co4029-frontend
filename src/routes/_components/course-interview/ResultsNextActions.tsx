import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Clock, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ResultPhase } from "./constants";
import type { ResultFacts } from "./results-helpers";

/**
 * "What happens next" (#7) — the action column inside the results hero. Moved
 * verbatim out of course-interview.tsx.
 */
export function ResultsNextActions({
  slug,
  resultPhase,
  facts,
  startPending,
  onRetry,
}: {
  slug: string;
  resultPhase: ResultPhase;
  facts: ResultFacts;
  startPending: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const { canRetry, cooldownActive, cooldownLabel, outOfAttempts } = facts;
  const remainingAttempts = facts.remainingAttempts;

  return (
    <div className="flex flex-col items-center gap-3">
      {resultPhase === "pass" ? (
        <Link to="/courses/$slug/learn" params={{ slug }}>
          <Button className="gradient-primary text-white rounded-xl font-bold text-sm gap-2 px-6">
            {t("course_interview.results.next.back_to_lesson")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      ) : canRetry ? (
        <>
          <Button
            onClick={onRetry}
            disabled={startPending}
            className="gradient-primary text-white rounded-xl font-bold text-sm gap-2 px-6"
          >
            <RotateCcw className="h-4 w-4" />
            {startPending
              ? t("course_interview.actions.starting")
              : t("course_interview.results.next.retry")}
          </Button>
          {remainingAttempts !== null && (
            <p className="text-xs font-medium text-m3-on-surface-variant">
              {t("course_interview.results.next.attempts_left", {
                count: remainingAttempts,
              })}
            </p>
          )}
        </>
      ) : resultPhase === "retry" && cooldownActive ? (
        <>
          <div className="inline-flex items-center gap-2 rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-low px-4 py-2.5 text-sm font-semibold text-m3-on-surface-variant">
            <Clock className="h-4 w-4" />
            {t("course_interview.results.next.cooldown", {
              when: cooldownLabel,
            })}
          </div>
          {remainingAttempts !== null && (
            <p className="text-xs font-medium text-m3-on-surface-variant">
              {t("course_interview.results.next.attempts_left", {
                count: remainingAttempts,
              })}
            </p>
          )}
        </>
      ) : resultPhase === "retry" && outOfAttempts ? (
        <p className="text-sm font-medium text-m3-on-surface-variant">
          {t("course_interview.results.next.no_attempts")}
        </p>
      ) : null}

      <Link to="/courses/$slug/learn" params={{ slug }}>
        <Button
          variant="ghost"
          className="rounded-xl font-semibold text-sm gap-2 text-m3-on-surface-variant"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("course_interview.actions.back_to_course")}
        </Button>
      </Link>
    </div>
  );
}

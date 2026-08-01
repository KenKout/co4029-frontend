import { PracticeCriteriaCard } from "./PracticeCriteriaCard";
import { ResultsVerdictHero } from "./ResultsVerdictHero";
import { resolveResultFacts, resolveResultPhase } from "./results-helpers";
import { StudyPlanCard, StudyPlanPendingCard } from "./StudyPlanCard";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * Results screen (text-mode finish OR voice-mode completion), moved verbatim out
 * of course-interview.tsx. The derived verdict/session/retake state now lives in
 * results-helpers.ts and the four tone chains in constants.ts.
 */
export function InterviewResultsScreen({
  iv,
  finishResult,
}: {
  iv: CourseInterviewController;
  finishResult: NonNullable<CourseInterviewController["finishResult"]>;
}) {
  const resultPhase = resolveResultPhase({
    sessionMode: iv.sessionMode,
    evaluationFailed: iv.evaluationFailed,
    evaluationUnavailable: iv.evaluationUnavailable,
    verdictPending: iv.verdictPending,
    liveVerdict: iv.liveVerdict,
  });
  const resultLocale = iv.i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const facts = resolveResultFacts({
    endedAt: finishResult.ended_at,
    assessmentStartedAtMs: iv.assessmentStartedAtMs,
    // Retake context (#7) — prefer the freshest source (verdict poll survives
    // reload) then the finish response.
    retakeSource: iv.verdictPoll ?? finishResult,
    polledAttemptNumber: iv.verdictPoll?.attempt_number,
    fallbackAttemptNumber: iv.lastAttempt?.attempt_number,
    resultLocale,
    resultPhase,
  });

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="max-w-3xl w-full space-y-6">
        {/* ── Verdict hero (#16) ── */}
        <ResultsVerdictHero
          configTitle={iv.config?.title}
          slug={iv.slug}
          resultPhase={resultPhase}
          facts={facts}
          startPending={iv.startSession.isPending}
          onRetry={() => void iv.handleRetry()}
        />

        {resultPhase === "practice" && (
          <PracticeCriteriaCard practiceFeedback={iv.practiceFeedback} />
        )}

        {/* ── Study plan pending skeleton (#6) ── */}
        {!iv.gapReport &&
          iv.gapReportPending &&
          resultPhase !== "practice" &&
          resultPhase !== "eval_failed" &&
          resultPhase !== "abandoned" && <StudyPlanPendingCard />}

        {iv.gapReport && (
          <StudyPlanCard
            gapReport={iv.gapReport}
            resultPhase={resultPhase}
            slug={iv.slug}
          />
        )}
      </div>
    </div>
  );
}

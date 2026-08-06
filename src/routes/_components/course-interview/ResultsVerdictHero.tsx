import { useTranslation } from "react-i18next";
import { Bot, History, Timer } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { formatElapsedLabel } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import {
  RESULT_HERO_ICON,
  RESULT_HERO_SUMMARY_KEY,
  RESULT_HERO_TITLE_CLASS,
  RESULT_HERO_TITLE_KEY,
  RESULT_HERO_TONE_CLASS,
  type ResultPhase,
} from "./constants";
import { ResultsNextActions } from "./ResultsNextActions";
import type { ResultFacts } from "./results-helpers";

/**
 * Verdict hero (#16) — eyebrow, tone-coded icon, headline, summary, the session
 * facts row and the next-step actions. Moved verbatim out of
 * course-interview.tsx; the four ternary chains that chose the tone / icon /
 * title / summary are now the exhaustive lookup tables in constants.ts.
 */
export function ResultsVerdictHero({
  configTitle,
  slug,
  resultPhase,
  facts,
  startPending,
  onRetry,
}: {
  configTitle: string | null | undefined;
  slug: string;
  resultPhase: ResultPhase;
  facts: ResultFacts;
  startPending: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const heroToneClass = RESULT_HERO_TONE_CLASS[resultPhase];
  const HeroIcon = RESULT_HERO_ICON[resultPhase];
  const heroTitleKey = RESULT_HERO_TITLE_KEY[resultPhase];
  const heroTitleClass = RESULT_HERO_TITLE_CLASS[resultPhase];
  const heroSummaryKey = RESULT_HERO_SUMMARY_KEY[resultPhase];
  const { elapsedResultSeconds, resultAttemptNumber, resultDate } = facts;

  return (
    <GlassCard className="p-8 sm:p-10 text-center motion-safe:animate-fade-in-up">
      {/* Module-context eyebrow — consistency with lobby / quiz screens. */}
      <div className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-secondary">
        <Bot className="h-3.5 w-3.5" />
        <span>{t("course_interview.labels.ai_interview")}</span>
        {configTitle && (
          <>
            <span className="text-m3-outline">·</span>
            <span className="normal-case font-semibold text-m3-on-surface-variant truncate max-w-[220px]">
              {configTitle}
            </span>
          </>
        )}
      </div>

      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg",
          heroToneClass,
        )}
      >
        <HeroIcon
          className={cn(
            "h-9 w-9",
            resultPhase === "evaluating" && "animate-spin",
          )}
          aria-hidden="true"
        />
      </div>
      <h2
        className={cn(
          "font-headline font-extrabold text-2xl mb-1.5",
          heroTitleClass,
        )}
      >
        {t(heroTitleKey)}
      </h2>
      <p className="text-m3-on-surface-variant text-sm mb-6 mx-auto max-w-md leading-relaxed">
        {t(heroSummaryKey)}
      </p>

      {/* ── Session facts row (#16) ── */}
      {(elapsedResultSeconds !== null || resultDate) && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          {elapsedResultSeconds !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
              <Timer className="h-3.5 w-3.5" />
              {formatElapsedLabel(elapsedResultSeconds)}
            </span>
          )}
          {resultAttemptNumber !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
              <History className="h-3.5 w-3.5" />
              {t("course_interview.attempts.attempt_n", {
                n: resultAttemptNumber,
              })}
            </span>
          )}
          {resultDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
              {resultDate}
            </span>
          )}
        </div>
      )}

      {/* ── What happens next (#7) ── */}
      <ResultsNextActions
        slug={slug}
        resultPhase={resultPhase}
        facts={facts}
        startPending={startPending}
        onRetry={onRetry}
      />
    </GlassCard>
  );
}

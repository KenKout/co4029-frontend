import { useTranslation } from "react-i18next";
import { Bot, Clock, History } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import {
  HERO_ICON,
  HERO_SUMMARY_KEY,
  HERO_TITLE_CLASS,
  HERO_TITLE_KEY,
  HERO_TONE_CLASS,
} from "./constants";
import { formatElapsedLabel } from "./helpers";
import type { VerdictHeroProps } from "./types";

/** Verdict hero (mirrors the live results screen). */
export default function VerdictHero({ hero }: { hero: VerdictHeroProps }) {
  const { t } = useTranslation();
  const {
    phase,
    title,
    attemptNumber,
    elapsedSeconds,
    resultDate,
    cooldownActive,
    cooldownLabel,
  } = hero;

  const heroToneClass = HERO_TONE_CLASS[phase];
  const HeroIcon = HERO_ICON[phase];
  const heroTitleKey = HERO_TITLE_KEY[phase];
  const heroTitleClass = HERO_TITLE_CLASS[phase];
  const heroSummaryKey = HERO_SUMMARY_KEY[phase];

  return (
    <GlassCard className="p-8 text-center motion-safe:animate-fade-in-up sm:p-10">
      <div className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-secondary">
        <Bot className="h-3.5 w-3.5" />
        <span>{t("course_interview.labels.ai_interview")}</span>
        <span className="text-m3-outline">·</span>
        <span className="max-w-[220px] truncate font-semibold normal-case text-m3-on-surface-variant">
          {title}
        </span>
      </div>

      <div
        className={cn(
          "mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full shadow-lg",
          heroToneClass,
        )}
      >
        <HeroIcon
          className={cn("h-9 w-9", phase === "evaluating" && "animate-spin")}
          aria-hidden="true"
        />
      </div>
      <h1
        className={cn(
          "mb-1.5 font-headline text-2xl font-extrabold",
          heroTitleClass,
        )}
      >
        {t(heroTitleKey)}
      </h1>
      <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-m3-on-surface-variant">
        {t(heroSummaryKey)}
      </p>

      {/* ── Session facts ── */}
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs">
        {elapsedSeconds !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
            <Clock className="h-3.5 w-3.5" />
            {formatElapsedLabel(elapsedSeconds)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
          <History className="h-3.5 w-3.5" />
          {t("course_interview.attempts.attempt_n", {
            n: attemptNumber,
          })}
        </span>
        {resultDate && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
            {resultDate}
          </span>
        )}
      </div>

      {/* Retry is intentionally NOT offered here — this is a read-only
          historical view. To retry, the student returns to the interview
          lobby (which owns the live retake-policy gating). */}
      {phase === "retry" && cooldownActive && cooldownLabel && (
        <p className="mt-3 text-xs font-medium text-m3-on-surface-variant">
          {t("course_interview.results.next.cooldown", {
            when: cooldownLabel,
          })}
        </p>
      )}
    </GlassCard>
  );
}

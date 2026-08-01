import { useTranslation } from "react-i18next";
import {
  AudioLines,
  Clock,
  History,
  Infinity as InfinityIcon,
  User,
} from "lucide-react";

import { cardStaggerStyle } from "@/lib/interview/stagger";
import type { InterviewConfig } from "./use-course-interview";

/**
 * Stat tiles — icon chip + label + value. Values share one
 * consistent color/weight (the earlier design had one stat
 * arbitrarily blue); a hairline border lifts them off the card.
 *
 * Moved verbatim out of course-interview.tsx.
 */
export function LobbyStatTiles({ config }: { config: InterviewConfig }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      <div
        className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3 text-left motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both"
        style={{ ...cardStaggerStyle(0) }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">
            {t("course_interview.labels.persona")}
          </span>
          <span className="text-sm font-bold text-m3-on-surface">
            {config.persona === "strict"
              ? t("course_interview.values.persona.strict")
              : config.persona === "supportive"
                ? t("course_interview.values.persona.supportive")
                : t("course_interview.values.persona.neutral")}
          </span>
        </div>
      </div>
      <div
        className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3 text-left motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both"
        style={{ ...cardStaggerStyle(1) }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
          <Clock className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">
            {t("course_interview.labels.time")}
          </span>
          <span className="text-sm font-bold text-m3-on-surface">
            {config.time_limit_minutes
              ? t("course_interview.values.time_limit_minutes", {
                  minutes: config.time_limit_minutes,
                })
              : t("course_interview.values.no_limit")}
          </span>
        </div>
      </div>
      <div
        className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3 text-left motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both"
        style={{ ...cardStaggerStyle(2) }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
          {config.max_attempts ? (
            <History className="h-4 w-4" />
          ) : (
            <InfinityIcon className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">
            {t("course_interview.labels.max_attempts")}
          </span>
          <span className="text-sm font-bold text-m3-on-surface">
            {config.max_attempts ?? t("course_interview.values.no_limit")}
          </span>
        </div>
      </div>
      {/* AI voice tile. tts_voice is a Deepgram Aura model id
          (e.g. 'aura-2-ophelia-en'); we surface just the human name
          ('Ophelia'). NULL = the deployment default voice. Only
          meaningful for English sessions (Vietnamese uses the browser
          voice), noted via the value label. */}
      <div
        className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3 text-left motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both"
        style={{ ...cardStaggerStyle(3) }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
          <AudioLines className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">
            {t("course_interview.labels.ai_voice")}
          </span>
          <span className="block text-sm font-bold text-m3-on-surface truncate">
            {config.tts_voice
              ? config.tts_voice
                  .replace(/^aura-2-/, "")
                  .replace(/-en$/, "")
                  .replace(/^\w/, (c) => c.toUpperCase())
              : t("course_interview.values.ai_voice_default")}
          </span>
        </div>
      </div>
    </div>
  );
}

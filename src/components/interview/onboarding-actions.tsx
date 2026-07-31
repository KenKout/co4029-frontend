/**
 * Action row for the interview onboarding steps (identity check, audio check,
 * readiness) — the buttons the candidate uses before the assessment begins.
 *
 * Split out of `composer.tsx` to keep that file under the 1000-line `max-lines`
 * convention, on a real seam: these actions drive onboarding stage transitions,
 * not answer submission.
 */

import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, Clock3, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  InterviewLanguage,
  InterviewOnboardingAction,
  InterviewOnboardingStage,
} from "@/lib/api/types";

export function OnboardingActions({
  stage,
  language,
  disabled,
  onLanguageChange,
  onAction,
}: {
  stage: Exclude<InterviewOnboardingStage, "completed">;
  language: InterviewLanguage;
  disabled?: boolean;
  onLanguageChange: (language: InterviewLanguage) => void;
  onAction: (
    action: InterviewOnboardingAction,
    language?: InterviewLanguage,
  ) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-muted/50 p-3 text-left sm:p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {t("course_interview.onboarding.timer_waiting")}
      </p>
      {stage === "identity_check" && (
        <div className="flex flex-wrap items-center justify-start gap-2">
          <Link
            to="/profile"
            className="text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t("course_interview.onboarding.wrong_name")}
          </Link>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("confirm_identity")}
            className="h-8 rounded-lg"
          >
            <Check className="h-4 w-4" />
            {t("course_interview.onboarding.confirm_identity")}
          </Button>
        </div>
      )}

      {stage === "audio_check" && (
        <div className="flex flex-wrap justify-start gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("needs_adjustment")}
            className="h-8 rounded-lg"
          >
            {t("course_interview.onboarding.need_moment")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("audio_clear")}
            className="h-8 rounded-lg"
          >
            <Check className="h-4 w-4" />
            {t("course_interview.onboarding.audio_clear")}
          </Button>
        </div>
      )}

      {stage === "language_check" && (
        <div className="flex flex-wrap items-center justify-start gap-2">
          <span className="text-xs font-semibold text-text-muted">
            {t("course_interview.onboarding.language_label")}
          </span>
          {(["en", "vi"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              variant={language === item ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => {
                onLanguageChange(item);
                onAction("confirm_language", item);
              }}
              aria-pressed={language === item}
              className="h-8 rounded-lg px-3"
            >
              {t(`course_interview.onboarding.languages.${item}`)}
            </Button>
          ))}
        </div>
      )}

      {stage === "preparation" && (
        <div className="flex flex-wrap justify-start gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            size="sm"
            onClick={() => onAction("needs_adjustment")}
            className="h-8 rounded-lg"
          >
            {t("course_interview.onboarding.need_moment")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("continue_setup")}
            className="h-8 rounded-lg"
          >
            {t("course_interview.onboarding.continue")}
          </Button>
        </div>
      )}

      {stage === "readiness" && (
        <div className="flex flex-wrap justify-start gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("not_ready")}
            className="h-8 rounded-lg"
          >
            {t("course_interview.onboarding.not_ready")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("ready")}
            className="h-8 rounded-lg"
          >
            <Sparkles className="h-4 w-4" />
            {t("course_interview.onboarding.ready")}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Keyboard hint under the answer box, rendered as keycaps rather than prose.
 *
 * Was a single sentence ("Enter to send · Shift + Enter for a new line") with one
 * decorative `<kbd>Enter</kbd>` beside it in the focused composer, which put the
 * same key in two visual languages at once. Now every key is a keycap and only
 * the verbs are words, so the shortcut is scannable without reading a sentence.
 *
 * `aria-label` carries the original prose: a screen reader announcing
 * "Enter send Shift plus Enter new line" as loose fragments is worse than the
 * sentence it replaced, so the visual keycaps are hidden from the a11y tree and
 * the sentence is what gets announced.
 */

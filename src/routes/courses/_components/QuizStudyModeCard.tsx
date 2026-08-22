import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Read-only recap of the quiz's config (hint availability, retake policy,
 * cooldown) shown alongside the post-submission results screen.
 */
export function QuizStudyModeCard({
  allowRetakes,
  maxAttempts,
  showHints,
  cooldownHours,
}: {
  allowRetakes: boolean;
  maxAttempts: number | null | undefined;
  showHints: boolean;
  cooldownHours: number | null | undefined;
}) {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-6">
      <h4 className="font-headline font-bold text-m3-primary text-sm mb-4">
        {t("course_quiz.sections.config")}
      </h4>
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-4">
          <span className="text-m3-on-surface-variant">
            {t("course_quiz.labels.hint")}
          </span>
          <span className="font-semibold text-m3-on-surface">
            {showHints
              ? t("course_quiz.values.hint_available")
              : t("course_quiz.values.hint_off")}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-m3-on-surface-variant">
            {t("course_quiz.labels.retake")}
          </span>
          <span className="font-semibold text-m3-on-surface">
            {allowRetakes
              ? maxAttempts != null
                ? t("course_quiz.values.retake_max_attempts", {
                    count: maxAttempts,
                  })
                : t("course_quiz.values.allowed")
              : t("course_quiz.values.disallowed")}
          </span>
        </div>
        {cooldownHours != null && cooldownHours > 0 && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-m3-on-surface-variant">
              {t("course_quiz.labels.cooldown")}
            </span>
            <span className="font-semibold text-m3-on-surface">
              {t("course_quiz.values.cooldown_hours", { hours: cooldownHours })}
            </span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

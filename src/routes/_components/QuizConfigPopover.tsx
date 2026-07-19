import { useTranslation } from "react-i18next";
import { PreviewCard } from "@base-ui/react/preview-card";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hover-triggered info popover surfacing the static quiz config
 * (hints / retakes / cooldown) from the quiz header. Replaces the old
 * always-visible "study mode" card in the right rail — this config never
 * changes during an attempt, so it doesn't deserve permanent screen real
 * estate. Built on @base-ui preview-card (hover + focus open, portalled).
 */
export function QuizConfigPopover({
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
    <PreviewCard.Root>
      <PreviewCard.Trigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl bg-m3-surface-container px-3 py-2",
          "text-sm font-bold text-m3-primary cursor-help outline-none",
          "hover:bg-m3-surface-container-high focus-visible:ring-2 focus-visible:ring-m3-primary/40",
        )}
      >
        <Info className="h-4 w-4" />
        {t("course_quiz.sections.config")}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner sideOffset={8} align="end">
          <PreviewCard.Popup
            className={cn(
              "z-50 w-64 rounded-2xl border border-m3-outline-variant/30 bg-m3-surface p-4 shadow-2xl outline-none",
              "transition-all duration-150",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            )}
          >
            <PreviewCard.Arrow className="text-m3-surface" />
            <h4 className="font-headline font-bold text-m3-primary text-sm mb-3">
              {t("course_quiz.sections.config")}
            </h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-m3-on-surface-variant">
                  {t("course_quiz.labels.hint")}
                </span>
                <span className="font-semibold text-m3-on-surface text-right">
                  {showHints
                    ? t("course_quiz.values.hint_available")
                    : t("course_quiz.values.hint_off")}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-m3-on-surface-variant">
                  {t("course_quiz.labels.retake")}
                </span>
                <span className="font-semibold text-m3-on-surface text-right">
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
                  <span className="font-semibold text-m3-on-surface text-right">
                    {t("course_quiz.values.cooldown_hours", {
                      hours: cooldownHours,
                    })}
                  </span>
                </div>
              )}
            </div>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

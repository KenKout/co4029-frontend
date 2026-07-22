import { useTranslation } from "react-i18next";
import { PreviewCard } from "@base-ui/react/preview-card";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Proctoring transparency notice, shown next to the quiz config in the
 * take header. Warns the student — before and during the attempt — that
 * leaving the page (switching tabs / apps) is monitored and reported to
 * their teacher. Pairs with `useQuizIntegrityReporter`, which records the
 * tab_switch / focus_lost signals this notice describes.
 *
 * Fair-warning by design: students are told monitoring is active rather
 * than being caught silently. Hover + focus open, portalled — matches the
 * QuizConfigPopover pattern for visual consistency.
 */
export function QuizIntegrityNotice() {
  const { t } = useTranslation();

  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2",
          "text-sm font-bold text-amber-700 cursor-help outline-none",
          "hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-400/50",
        )}
      >
        <ShieldCheck className="h-4 w-4" />
        {t("course_quiz.integrity.badge")}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner sideOffset={8} align="end">
          <PreviewCard.Popup
            className={cn(
              "z-50 w-72 rounded-2xl border border-amber-200 bg-m3-surface p-4 shadow-2xl outline-none",
              "transition-all duration-150",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            )}
          >
            <PreviewCard.Arrow className="text-m3-surface" />
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-headline font-bold text-amber-700 text-sm">
                  {t("course_quiz.integrity.title")}
                </h4>
                <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                  {t("course_quiz.integrity.body")}
                </p>
                <p className="text-xs text-m3-on-surface-variant/80 leading-relaxed">
                  {t("course_quiz.integrity.reassure")}
                </p>
              </div>
            </div>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

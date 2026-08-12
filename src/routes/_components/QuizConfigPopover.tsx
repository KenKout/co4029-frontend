import { useTranslation } from "react-i18next";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUIZ_PAGE_SIZES, type QuizPageSize } from "@/lib/quiz-timing";

/**
 * Quiz settings dialog (tap the icon in the taking bar). Surfaced on tap
 * rather than hover so it works on phones: the static config (hints /
 * retakes / cooldown), the number of previous attempts, and the
 * items-per-page selector that used to sit above the questions.
 */
export function QuizConfigPopover({
  allowRetakes,
  maxAttempts,
  showHints,
  cooldownHours,
  attemptsBefore = 0,
  pageSize,
  onPageSizeChange,
}: {
  allowRetakes: boolean;
  maxAttempts: number | null | undefined;
  showHints: boolean;
  cooldownHours: number | null | undefined;
  /** Prior attempts before the current one. */
  attemptsBefore?: number;
  pageSize?: QuizPageSize;
  onPageSizeChange?: (size: QuizPageSize) => void;
}) {
  const { t } = useTranslation();

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4">
      <span className="text-m3-on-surface-variant">{label}</span>
      <span className="font-semibold text-m3-on-surface text-right">
        {value}
      </span>
    </div>
  );

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-m3-surface-container w-9 h-9",
          "text-sm font-bold text-m3-primary cursor-pointer outline-none",
          "hover:bg-m3-surface-container-high focus-visible:ring-2 focus-visible:ring-m3-primary/40",
        )}
        aria-label={t("course_quiz.sections.config")}
      >
        <Info className="h-4 w-4" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-m3-outline-variant/30 bg-m3-surface p-5 shadow-2xl outline-none",
            "transition-all duration-150",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <DialogPrimitive.Title className="font-headline font-bold text-m3-primary text-sm">
              {t("course_quiz.sections.config")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("course_quiz.actions.close_config", "Close")}
                />
              }
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="space-y-2.5 text-sm">
            {row(
              t("course_quiz.labels.hint"),
              showHints
                ? t("course_quiz.values.hint_available")
                : t("course_quiz.values.hint_off"),
            )}
            {row(
              t("course_quiz.labels.retake"),
              allowRetakes
                ? maxAttempts != null
                  ? t("course_quiz.values.retake_max_attempts", {
                      count: maxAttempts,
                    })
                  : t("course_quiz.values.allowed")
                : t("course_quiz.values.disallowed"),
            )}
            {cooldownHours != null && cooldownHours > 0
              ? row(
                  t("course_quiz.labels.cooldown"),
                  t("course_quiz.values.cooldown_hours", {
                    hours: cooldownHours,
                  }),
                )
              : null}
            {row(
              t("course_quiz.labels.attempts_before", {
                count: attemptsBefore,
              }),
              attemptsBefore > 0
                ? t("course_quiz.values.attempts_previous", {
                    count: attemptsBefore,
                  })
                : t("course_quiz.values.attempts_first"),
            )}
          </div>

          {pageSize !== undefined && onPageSizeChange && (
            <div className="mt-4 pt-3 border-t border-m3-outline-variant/20">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("course_quiz.pagination.per_page_label")}
                </span>
                <div
                  role="group"
                  aria-label={t("course_quiz.pagination.per_page_label")}
                  className="flex items-center rounded-lg border border-m3-outline-variant/40 bg-m3-surface-container p-0.5"
                >
                  {QUIZ_PAGE_SIZES.map((size) => (
                    <Button variant="ghost"
                      key={String(size)}
                      type="button"
                      onClick={() => onPageSizeChange(size)}
                      aria-pressed={pageSize === size}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-bold transition-colors h-auto whitespace-normal",
                        pageSize === size
                          ? "bg-m3-primary text-white"
                          : "text-m3-on-surface-variant hover:text-m3-primary",
                      )}
                    >
                      {size === "all"
                        ? t("course_quiz.pagination.per_page_all")
                        : size}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

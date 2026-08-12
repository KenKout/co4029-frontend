import { useTranslation } from "react-i18next";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Proctoring transparency notice behind the shield icon in the taking bar.
 * Warns the student — before and during the attempt — that leaving the page
 * (switching tabs / apps) is monitored and reported to their teacher. Pairs
 * with `useQuizIntegrityReporter`, which records the tab_switch /
 * focus_lost signals this notice describes.
 *
 * Tap-to-open dialog (not hover) so it works on phones.
 */
export function QuizIntegrityNotice() {
  const { t } = useTranslation();

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-amber-50 w-9 h-9",
          "text-amber-700 cursor-pointer outline-none",
          "hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-400/50",
        )}
        aria-label={t("course_quiz.integrity.badge")}
      >
        <ShieldCheck className="h-4 w-4" />
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
            "rounded-2xl border border-amber-200 bg-m3-surface p-5 shadow-2xl outline-none",
            "transition-all duration-150",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1.5 flex-1">
              <DialogPrimitive.Title className="font-headline font-bold text-amber-700 text-sm">
                {t("course_quiz.integrity.title")}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-m3-on-surface-variant leading-relaxed">
                {t("course_quiz.integrity.body")}
              </DialogPrimitive.Description>
              <p className="text-xs text-m3-on-surface-variant/80 leading-relaxed">
                {t("course_quiz.integrity.reassure")}
              </p>
            </div>
            <DialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("course_quiz.actions.close_integrity", "Close")}
                />
              }
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

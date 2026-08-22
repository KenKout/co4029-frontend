import { useTranslation } from "react-i18next";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Modal that shows a question's hint. Viewing a hint is recorded on the answer
 * (hint_used) by the caller — this component is presentation only.
 */
export function QuizHintDialog({
  open,
  onOpenChange,
  hintText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hintText: string;
}) {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
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
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-m3-outline-variant/30 bg-m3-surface p-6 shadow-2xl",
            "outline-none",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-white shadow-ai-glow shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>
              <DialogPrimitive.Title className="font-headline text-base font-bold text-m3-on-surface">
                {t("course_quiz.actions.show_hint")}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("course_quiz.actions.close_hint", "Close")}
                />
              }
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="mt-4 text-sm text-m3-on-surface-variant leading-relaxed">
            {hintText}
          </DialogPrimitive.Description>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

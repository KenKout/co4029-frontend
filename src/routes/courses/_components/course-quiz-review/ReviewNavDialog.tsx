import { useTranslation } from "react-i18next";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  QuizAttemptReviewQuestion,
  QuizAttemptReviewRead,
} from "@/lib/api/types";
import { QuizReviewNavigator } from "./QuizReviewNavigator";

/**
 * Question-navigation dialog for the attempt review — the navigator grid
 * (status colours + numbers) in a modal, opened from the result card's
 * breakdown button. Clicking a number jumps AND closes the dialog, matching
 * the quiz taking screen's summary dialog.
 */
export function ReviewNavDialog({
  open,
  onOpenChange,
  questions,
  onJump,
  visibility,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuizAttemptReviewQuestion[];
  onJump: (index: number) => void;
  visibility: QuizAttemptReviewRead["visibility"];
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
            "rounded-2xl border border-m3-outline-variant/30 bg-m3-surface p-4 shadow-2xl",
            "outline-none",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <div className="flex items-center justify-end mb-1">
            <DialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("course_quiz_review.close_nav", "Close")}
                />
              }
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <QuizReviewNavigator
            questions={questions}
            onJump={onJump}
            visibility={visibility}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

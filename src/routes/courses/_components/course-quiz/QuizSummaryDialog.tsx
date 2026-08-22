import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  QuizSummaryCard,
  type QuizSummaryItem,
} from "@/routes/courses/_components/QuizSummaryCard";

/**
 * Mobile question-list dialog: the same layout as the desktop summary rail
 * (stats + number grid). Tapping a number jumps to that question and closes
 * the dialog in one tap.
 */
export function QuizSummaryDialog({
  open,
  onOpenChange,
  items,
  answeredCount,
  flaggedCount,
  total,
  passingScore,
  onJump,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: QuizSummaryItem[];
  answeredCount: number;
  flaggedCount: number;
  total: number;
  passingScore: number;
  /** Called with the chosen index; the dialog is closed by the caller. */
  onJump: (index: number) => void;
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
                  aria-label={t("course_quiz.actions.close_summary", "Close")}
                />
              }
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <QuizSummaryCard
            items={items}
            answeredCount={answeredCount}
            flaggedCount={flaggedCount}
            total={total}
            passingScore={passingScore}
            onJump={onJump}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Icon button used in the footer (flag / questions / hint). */
export function FooterIconButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "h-10 w-10 rounded-xl shrink-0",
        active
          ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
          : "text-m3-on-surface-variant hover:bg-m3-surface-container hover:text-m3-on-surface",
      )}
    >
      {children}
    </Button>
  );
}

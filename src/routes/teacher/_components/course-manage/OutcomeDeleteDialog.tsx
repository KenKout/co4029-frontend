import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Delete confirmation for an outcome — the outliner's "what happens to the
 * kids?" dialog. It says exactly what is going away (sub-outcomes, mapped
 * quiz questions), and offers the two behaviours the backend supports:
 *
 *   "Delete with N sub-outcomes" — cascade (promote_children=false)
 *   "Keep sub-outcomes"          — promote them to this outcome's level
 *
 * A leaf outcome gets a single confirm, no alternatives.
 */
export function OutcomeDeleteDialog({
  open,
  onOpenChange,
  code,
  kids,
  linkedQuestions,
  isPending,
  onCascade,
  onPromote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  kids: number;
  linkedQuestions: number;
  isPending: boolean;
  onCascade: () => void;
  onPromote: () => void;
}) {
  const { t } = useTranslation();

  const scopeBits: string[] = [];
  if (kids > 0) {
    scopeBits.push(
      t(
        "teacher_outcomes.delete_kids",
        "{{count}} sub-outcomes",
        { count: kids },
      ),
    );
  }
  if (linkedQuestions > 0) {
    scopeBits.push(
      t(
        "teacher_outcomes.delete_questions",
        "{{count}} quiz questions",
        { count: linkedQuestions },
      ),
    );
  }

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
            "rounded-xl border border-m3-outline-variant/40 bg-white p-6 shadow-2xl",
            "outline-none",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <DialogPrimitive.Title className="font-headline text-lg font-bold text-text-strong">
            {t("teacher_outcomes.delete_title", "Delete learning outcome?")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-text-muted">
            {scopeBits.length > 0 ? (
              <>
                {code}{" "}
                <span className="font-medium text-text-strong">
                  · {scopeBits.join(" · ")}
                </span>{" "}
                {t(
                  "teacher_outcomes.delete_scope_tail",
                  "will be affected.",
                )}
              </>
            ) : (
              t(
                "teacher_outcomes.delete_no_children",
                "{{code}} will be removed. This cannot be undone.",
                { code },
              )
            )}
          </DialogPrimitive.Description>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            {kids > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={onPromote}
              >
                {t(
                  "teacher_outcomes.delete_promote",
                  "Keep sub-outcomes",
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={onCascade}
            >
              {kids > 0
                ? t(
                    "teacher_outcomes.delete_cascade",
                    "Delete with {{count}} sub-outcomes",
                    { count: kids },
                  )
                : t("teacher_outcomes.delete", "Delete")}
            </Button>
            <DialogPrimitive.Close
              render={
                <Button type="button" variant="ghost" size="sm" />
              }
            >
              {t("common.cancel", "Cancel")}
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

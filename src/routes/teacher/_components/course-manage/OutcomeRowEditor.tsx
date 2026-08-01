import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";
import type { TranslateFn } from "./types";

/**
 * A row switched into edit mode: the text input plus its save / cancel pair.
 * Returns a fragment so both stay direct children of the row's flex line,
 * exactly as when it was inline in `LearningOutcomesPanel`.
 */
export function OutcomeRowEditor({
  outcomeId,
  ctl,
  t,
}: {
  outcomeId: string;
  ctl: CourseOutcomesController;
  t: TranslateFn;
}) {
  const { editText, setEditText, updateOutcome, handleSaveEdit, cancelEdit } =
    ctl;

  return (
    <>
      <Input
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleSaveEdit(outcomeId);
          } else if (e.key === "Escape") {
            cancelEdit();
          }
        }}
        autoFocus
        className="h-9 flex-1"
      />
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={updateOutcome.isPending || !editText.trim()}
          onClick={() => void handleSaveEdit(outcomeId)}
          aria-label={t("teacher_outcomes.save", "Save")}
        >
          {updateOutcome.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4 text-m3-primary" />
          )}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={cancelEdit}
          aria-label={t("teacher_outcomes.cancel", "Cancel")}
        >
          <X className="h-4 w-4 text-m3-on-surface-variant" />
        </Button>
      </div>
    </>
  );
}

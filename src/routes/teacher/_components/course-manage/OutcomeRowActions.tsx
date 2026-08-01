import { CornerDownRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourseOutcome, TranslateFn } from "./types";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";

/**
 * The edit / add-sub-outcome / delete cluster shown on a row while the course
 * is still an editable draft. Moved verbatim out of `LearningOutcomesPanel`.
 */
export function OutcomeRowActions({
  outcome,
  ctl,
  t,
}: {
  outcome: CourseOutcome;
  ctl: CourseOutcomesController;
  t: TranslateFn;
}) {
  const { startEdit, startAddChild, setPendingDeleteId } = ctl;

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => startEdit(outcome.id, outcome.outcome_text)}
        aria-label={t("teacher_outcomes.edit", "Edit")}
      >
        <Pencil className="h-4 w-4 text-m3-on-surface-variant" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => startAddChild(outcome.id)}
        aria-label={t("teacher_outcomes.add_child", "Add sub-outcome")}
        title={t("teacher_outcomes.add_child", "Add sub-outcome")}
      >
        <CornerDownRight className="h-4 w-4 text-m3-on-surface-variant" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => setPendingDeleteId(outcome.id)}
        aria-label={t("teacher_outcomes.delete", "Delete")}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

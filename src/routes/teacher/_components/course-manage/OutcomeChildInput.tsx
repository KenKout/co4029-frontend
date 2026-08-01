import { Check, CornerDownRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";
import type { TranslateFn } from "./types";

/**
 * Inline sub-outcome input — nests a child under this outcome (parent_id).
 * Enter submits, Escape cancels. Moved verbatim out of
 * `LearningOutcomesPanel`.
 */
export function OutcomeChildInput({
  parentId,
  ctl,
  t,
}: {
  parentId: string;
  ctl: CourseOutcomesController;
  t: TranslateFn;
}) {
  const {
    childText,
    setChildText,
    createOutcome,
    handleAddChild,
    cancelAddChild,
  } = ctl;

  return (
    <div className="flex items-center gap-2 pl-6">
      <CornerDownRight className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
      <Input
        value={childText}
        onChange={(e) => setChildText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleAddChild(parentId);
          } else if (e.key === "Escape") {
            cancelAddChild();
          }
        }}
        autoFocus
        placeholder={t(
          "teacher_outcomes.add_child_placeholder",
          "Sub-outcome statement…",
        )}
        className="h-9 flex-1"
      />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={createOutcome.isPending || !childText.trim()}
        onClick={() => void handleAddChild(parentId)}
        aria-label={t("teacher_outcomes.save", "Save")}
      >
        {createOutcome.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4 text-m3-primary" />
        )}
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={cancelAddChild}
        aria-label={t("teacher_outcomes.cancel", "Cancel")}
      >
        <X className="h-4 w-4 text-m3-on-surface-variant" />
      </Button>
    </div>
  );
}

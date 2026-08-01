import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";
import type { TranslateFn } from "./types";

/**
 * The bottom "add outcome" form, rendered only while the course is an editable
 * draft. Moved verbatim out of `LearningOutcomesPanel`.
 */
export function OutcomeAddForm({
  ctl,
  t,
}: {
  ctl: CourseOutcomesController;
  t: TranslateFn;
}) {
  const { newText, setNewText, createOutcome, handleAdd } = ctl;

  return (
    <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
      <Input
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        placeholder={t(
          "teacher_outcomes.add_placeholder",
          "e.g. Explain the core principles of…",
        )}
        className="h-9 flex-1"
      />
      <Button
        type="submit"
        size="sm"
        disabled={createOutcome.isPending || !newText.trim()}
        className="gap-2 shrink-0"
      >
        {createOutcome.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {t("teacher_outcomes.add", "Add outcome")}
      </Button>
    </form>
  );
}

import { Badge } from "@/components/ui/badge";
import { OutcomeChildInput } from "./OutcomeChildInput";
import { OutcomeRowActions } from "./OutcomeRowActions";
import { OutcomeRowEditor } from "./OutcomeRowEditor";
import type { CourseOutcome, TranslateFn } from "./types";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";

/**
 * One outcome in the nestable list: its dotted hierarchy badge, the statement
 * (or its editor), the draft-only action cluster and the inline sub-outcome
 * input.
 *
 * Moved verbatim out of the former 171-line `.map()` arrow in
 * `LearningOutcomesPanel`; the caller still supplies `key={outcome.id}`.
 */
export function OutcomeRow({
  outcome,
  ctl,
  t,
}: {
  outcome: CourseOutcome;
  ctl: CourseOutcomesController;
  t: TranslateFn;
}) {
  const { editable, editingId, addChildParentId } = ctl;
  // Dotted hierarchy code is derived server-side (e.g. "1.2.1"
  // → "L.O.1.2.1"); depth drives left indentation so the tree
  // reads as nested. Fallback to position if code is absent.
  const depth = outcome.depth ?? 0;
  const code = t("teacher_outcomes.code", "L.O.{{n}}", {
    n: outcome.code ?? outcome.position,
  });
  const isEditing = editingId === outcome.id;
  const isAddingChild = addChildParentId === outcome.id;

  return (
    <li
      className="flex flex-col gap-2 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5"
      style={{ marginLeft: `${depth * 1.5}rem` }}
    >
      <div className="flex items-start gap-3">
        <Badge className="mt-0.5 shrink-0 bg-violet-100 text-violet-700 border-transparent">
          {code}
        </Badge>
        {isEditing ? (
          <OutcomeRowEditor outcomeId={outcome.id} ctl={ctl} t={t} />
        ) : (
          <>
            <span className="flex-1 text-sm text-m3-on-surface leading-relaxed">
              {outcome.outcome_text}
            </span>
            {editable && (
              <OutcomeRowActions outcome={outcome} ctl={ctl} t={t} />
            )}
          </>
        )}
      </div>

      {isAddingChild && (
        <OutcomeChildInput parentId={outcome.id} ctl={ctl} t={t} />
      )}
    </li>
  );
}

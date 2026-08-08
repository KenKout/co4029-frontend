import { toast } from "sonner";
import type {
  UseMutationResult,
} from "@tanstack/react-query";
import type { CourseOutcome, TranslateFn } from "./types";

/**
 * The outliner's tree-mutation actions, factored out of the main editor hook
 * so that hook stays under the max-lines-per-function limit. Pure wiring:
 * each action computes a PATCH payload from the current tree and runs it.
 */

interface TreeActionsDeps {
  outcomes: CourseOutcome[];
  update: UseMutationResult<
    unknown,
    Error,
    {
      outcomeId: string;
      outcome_text?: string;
      parent_id?: string | null;
      position?: number;
    }
  >;
  delete: UseMutationResult<unknown, Error, { outcomeId: string; promote_children?: boolean }>;
  t: TranslateFn;
}

export function makeTreeActions({ outcomes, update, delete: del, t }: TreeActionsDeps) {
  const fail = (err: unknown) =>
    toast.error(
      (err as Error).message ||
        t("teacher_outcomes.move_failed", "Failed to move outcome"),
    );

  return {
    async moveUp(outcome: CourseOutcome) {
      const above = prevSibling(outcomes, outcome);
      if (!above) return;
      try {
        await update.mutateAsync({
          outcomeId: outcome.id,
          parent_id: outcome.parent_id ?? null,
          position: above.position,
        });
      } catch (err) {
        fail(err);
      }
    },

    async moveDown(outcome: CourseOutcome) {
      const below = nextSibling(outcomes, outcome);
      if (!below) return;
      try {
        await update.mutateAsync({
          outcomeId: outcome.id,
          parent_id: outcome.parent_id ?? null,
          position: below.position + 1,
        });
      } catch (err) {
        fail(err);
      }
    },

    /** Tab: nest this row under the row directly above it (any depth). */
    async indent(outcome: CourseOutcome) {
      const above = prevRow(outcomes, outcome);
      if (!above || above.id === outcome.id) return;
      try {
        await update.mutateAsync({ outcomeId: outcome.id, parent_id: above.id });
      } catch (err) {
        fail(err);
      }
    },

    /** Shift+Tab: lift this row out from under its parent. */
    async outdent(outcome: CourseOutcome) {
      const parent = outcomes.find((o) => o.id === outcome.parent_id);
      if (!parent) return; // already top-level
      try {
        await update.mutateAsync({
          outcomeId: outcome.id,
          parent_id: parent.parent_id ?? null,
          // Take the slot right after the (former) parent.
          position: parent.position + 1,
        });
      } catch (err) {
        fail(err);
      }
    },

    async dropOn(
      draggedId: string,
      targetId: string,
      position: "before" | "after" | "onto",
    ) {
      const dragged = outcomes.find((o) => o.id === draggedId);
      const target = outcomes.find((o) => o.id === targetId);
      if (!dragged || !target || dragged.id === target.id) return;
      // Dropping a row onto one of its own children would form a cycle; the
      // server rejects it too, but refuse it client-side for a clean UX.
      if (position === "onto") {
        const targetIsChildOfDragged = siblingsOf(outcomes, dragged.id).some(
          (o) => o.id === target.id,
        );
        if (targetIsChildOfDragged) return;
      }
      try {
        if (position === "onto") {
          await update.mutateAsync({
            outcomeId: dragged.id,
            parent_id: target.id,
          });
        } else {
          await update.mutateAsync({
            outcomeId: dragged.id,
            parent_id: target.parent_id ?? null,
            position:
              position === "before" ? target.position : target.position + 1,
          });
        }
      } catch (err) {
        fail(err);
      }
    },

    async delete(outcomeId: string, promote: boolean) {
      try {
        await del.mutateAsync({
          outcomeId,
          promote_children: promote,
        });
        toast.success(
          promote
            ? t(
                "teacher_outcomes.deleted_promote",
                "Outcome deleted, its sub-outcomes kept",
              )
            : t("teacher_outcomes.deleted", "Learning outcome deleted"),
        );
      } catch (err) {
        toast.error(
          (err as Error).message ||
            t("teacher_outcomes.delete_failed", "Failed to delete outcome"),
        );
      }
    },
  };
}

export type OutcomeTreeActions = ReturnType<typeof makeTreeActions>;

/** Outcomes sharing one parent, in tree order. `null` = top-level. */
export function siblingsOf(
  outcomes: CourseOutcome[],
  parentId: string | null,
): CourseOutcome[] {
  return outcomes.filter((o) => (o.parent_id ?? null) === parentId);
}

/** The row immediately before `outcome` in tree order (any depth). */
export function prevRow(
  outcomes: CourseOutcome[],
  outcome: CourseOutcome,
): CourseOutcome | null {
  const idx = outcomes.findIndex((o) => o.id === outcome.id);
  return idx > 0 ? outcomes[idx - 1] : null;
}

/** The sibling directly above `outcome`, if any. */
export function prevSibling(
  outcomes: CourseOutcome[],
  outcome: CourseOutcome,
): CourseOutcome | null {
  const sibs = siblingsOf(outcomes, outcome.parent_id ?? null);
  const idx = sibs.findIndex((o) => o.id === outcome.id);
  return idx > 0 ? sibs[idx - 1] : null;
}

/** The sibling directly below `outcome`, if any. */
export function nextSibling(
  outcomes: CourseOutcome[],
  outcome: CourseOutcome,
): CourseOutcome | null {
  const sibs = siblingsOf(outcomes, outcome.parent_id ?? null);
  const idx = sibs.findIndex((o) => o.id === outcome.id);
  return idx >= 0 && idx < sibs.length - 1 ? sibs[idx + 1] : null;
}

/** Number of immediate children of `outcome` (for the delete dialog). */
export function childCount(
  outcomes: CourseOutcome[],
  outcome: CourseOutcome,
): number {
  return siblingsOf(outcomes, outcome.id).length;
}

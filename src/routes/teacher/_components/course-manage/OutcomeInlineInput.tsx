import { useRef } from "react";
import type { CourseOutcome, TranslateFn } from "./types";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";

/**
 * The statement input of an outliner row. One component so the keyboard
 * contract lives in a single place — saved rows and the row being edited
 * behave identically:
 *
 *   Enter        — save + open a sibling below
 *   Tab          — indent under the row above
 *   Shift+Tab    — outdent
 *   Backspace    — delete when empty
 *   Alt+↑ / ↓    — move among siblings
 *   Escape       — leave edit mode
 */
export function OutcomeInlineInput({
  outcome,
  ctl,
  t,
}: {
  outcome: CourseOutcome;
  ctl: CourseOutcomesController;
  t: TranslateFn;
}) {
  const {
    editingId,
    setEditingId,
    saveText,
    createSiblingBelow,
    indent,
    outdent,
    setPendingDeleteId,
    moveUp,
    moveDown,
    cancelEditing,
  } = ctl;
  const ref = useRef<HTMLInputElement>(null);
  const isEditing = editingId === outcome.id;

  return (
    <input
      ref={ref}
      key={`${outcome.id}-${outcome.outcome_text}`}
      defaultValue={outcome.outcome_text}
      autoFocus={isEditing}
      placeholder={t(
        "teacher_outcomes.row_placeholder",
        "Learning outcome…",
      )}
      onFocus={() => setEditingId(outcome.id)}
      className="min-w-0 flex-1 rounded bg-transparent text-sm text-m3-on-surface outline-none placeholder:text-m3-on-surface-variant/60"
      onKeyDown={(e) => {
        const value = e.currentTarget.value;
        if (e.key === "Enter") {
          e.preventDefault();
          setEditingId(null);
          void createSiblingBelow(outcome, value);
        } else if (e.key === "Tab" && !e.shiftKey) {
          e.preventDefault();
          setEditingId(null);
          void indent(outcome);
        } else if (e.key === "Tab" && e.shiftKey) {
          e.preventDefault();
          setEditingId(null);
          void outdent(outcome);
        } else if (e.key === "Backspace" && value === "") {
          e.preventDefault();
          setEditingId(null);
          setPendingDeleteId(outcome.id);
        } else if (e.key === "ArrowUp" && e.altKey) {
          e.preventDefault();
          void moveUp(outcome);
        } else if (e.key === "ArrowDown" && e.altKey) {
          e.preventDefault();
          void moveDown(outcome);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setEditingId(null);
          cancelEditing();
        }
      }}
      onBlur={() => {
        setEditingId(null);
        const value = ref.current?.value.trim();
        if (value && value !== outcome.outcome_text) {
          void saveText(outcome.id, value);
        }
      }}
    />
  );
}

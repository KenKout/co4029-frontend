import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical } from "lucide-react";
import { OutcomeInlineInput } from "./OutcomeInlineInput";
import { OutcomeRowActions } from "./OutcomeRowActions";
import type { CourseOutcome, TranslateFn } from "./types";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";

/**
 * One row of the LO outliner.
 *
 * The statement is always an inline input while the course is an editable
 * draft: click it and type (keyboard contract in OutcomeInlineInput). The
 * left grip is the drag handle — drop between rows = reorder, drop onto a
 * row's body = reparent.
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
  const {
    editable,
    editingId,
    setEditingId,
    draggingId,
    setDraggingId,
    dropOn,
  } = ctl;
  const depth = outcome.depth ?? 0;
  const code = t("teacher_outcomes.code", "L.O.{{n}}", {
    n: outcome.code ?? outcome.position,
  });
  const isEditing = editingId === outcome.id;
  const isDragging = draggingId === outcome.id;

  return (
    <li
      className={
        "group relative flex items-center gap-1.5 rounded-lg border border-transparent " +
        "px-1.5 py-1 hover:bg-m3-surface-container-lowest " +
        (isEditing ? "bg-m3-surface-container-lowest border-m3-outline-variant/40" : "") +
        (isDragging ? "opacity-50" : "")
      }
      style={{ marginLeft: `${depth * 1.5}rem` }}
    >
      {editable && (
        <Button variant="ghost"
          type="button"
          draggable
          onDragStart={() => setDraggingId(outcome.id)}
          onDragEnd={() => setDraggingId(null)}
          aria-label={t("teacher_outcomes.drag", "Drag to move")}
          title={t(
            "teacher_outcomes.drag_hint",
            "Drag: between rows moves, onto a row nests",
          )}
          className="shrink-0 cursor-grab rounded p-0.5 text-m3-outline-variant opacity-0 transition-opacity group-hover:opacity-100 hover:text-m3-on-surface-variant active:cursor-grabbing h-auto whitespace-normal"
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      )}

      <Badge className="shrink-0 bg-violet-100 text-violet-700 border-transparent">
        {code}
      </Badge>

      {editable ? (
        <OutcomeInlineInput outcome={outcome} ctl={ctl} t={t} />
      ) : (
        <Button variant="ghost"
          type="button"
          onClick={() => setEditingId(outcome.id)}
          className="flex-1 truncate text-left text-sm text-m3-on-surface leading-relaxed hover:text-m3-on-surface-variant"
          title={t("teacher_outcomes.click_to_edit", "Click to edit")}
        >
          {outcome.outcome_text}
        </Button>
      )}

      {/* Drop target: the row's own body = reparent onto it. */}
      {editable && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "link";
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggingId) void dropOn(draggingId, outcome.id, "onto");
          }}
          className="absolute inset-x-1 inset-y-0 -z-10 rounded-lg"
        />
      )}

      {editable && <OutcomeRowActions outcome={outcome} ctl={ctl} t={t} />}

      {/* Drop zone between rows = reorder before this row. Only visible
          while a row is actually being dragged — a static blue line on
          hover alone reads as a glitch. */}
      {editable && draggingId !== null && draggingId !== outcome.id && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggingId) void dropOn(draggingId, outcome.id, "before");
          }}
          className="absolute inset-x-0 -top-1.5 h-3 rounded-full bg-m3-primary/30"
        />
      )}
    </li>
  );
}

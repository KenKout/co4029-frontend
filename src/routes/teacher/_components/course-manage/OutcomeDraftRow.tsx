import { Button } from "@/components/ui/button";
import type { TranslateFn } from "./types";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";

/**
 * The unsaved sibling row that Enter leaves behind. Rendered at the panel
 * level, below the row it follows (it is a sibling, not a child): Enter
 * commits it and opens the next draft; Escape / Backspace-on-empty cancels.
 */
export function OutcomeDraftRow({
  ctl,
  t,
}: {
  ctl: CourseOutcomesController;
  t: TranslateFn;
}) {
  const { commitDraft, cancelEditing } = ctl;

  return (
    <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-m3-outline-variant/50 bg-m3-surface-container-lowest px-1.5 py-1">
      <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-transparent">
        {t("teacher_outcomes.draft_badge", "new")}
      </span>
      <input
        autoFocus
        placeholder={t(
          "teacher_outcomes.row_placeholder",
          "Learning outcome…",
        )}
        className="min-w-0 flex-1 rounded bg-transparent text-sm text-m3-on-surface outline-none placeholder:text-m3-on-surface-variant/60"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commitDraft(e.currentTarget.value);
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEditing();
          } else if (e.key === "Backspace" && e.currentTarget.value === "") {
            e.preventDefault();
            cancelEditing();
          }
        }}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={cancelEditing}
        aria-label={t("teacher_outcomes.cancel", "Cancel")}
      >
        ×
      </Button>
    </div>
  );
}

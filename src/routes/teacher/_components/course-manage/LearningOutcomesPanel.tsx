import { useTranslation } from "react-i18next";
import { ChevronDown, ListChecks } from "lucide-react";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { cn } from "@/lib/utils";
import { OutcomeAddForm } from "./OutcomeAddForm";
import { OutcomeRow } from "./OutcomeRow";
import { useCourseOutcomesEditor } from "./use-course-outcomes-editor";

/**
 * Collapsible "Learning Outcomes" panel: a nestable (parent/child) list of
 * outcome statements with inline add/edit/delete. Editing is only permitted
 * while the course is an unpublished draft — once published the outcomes are
 * frozen (they double as the graded assessment scale, enforced server-side).
 *
 * Previously a single 363-line function whose `.map()` arrow was itself 171
 * lines. The state and handlers now live in `use-course-outcomes-editor.ts` and
 * each row (plus its editor, actions, child input and the add form) is its own
 * component; every expression is carried over unchanged.
 */
export function LearningOutcomesPanel({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const ctl = useCourseOutcomesEditor({ courseId, t });
  const {
    outcomes,
    deleteOutcome,
    editable,
    open,
    setOpen,
    pendingDeleteId,
    setPendingDeleteId,
    handleDelete,
  } = ctl;

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 border-m3-outline-variant/20 overflow-hidden transition-colors",
        open ? "border-l-m3-primary" : "border-l-m3-outline-variant",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer transition-colors",
          open
            ? "bg-m3-surface-container-low hover:bg-m3-surface-container"
            : "hover:bg-m3-primary/5",
        )}
      >
        <ListChecks className="h-4 w-4 text-m3-secondary shrink-0" />
        <span className="flex-1 text-sm font-bold text-m3-on-surface transition-colors group-hover:text-m3-primary">
          {t("teacher_outcomes.title", "Learning Outcomes")}
        </span>
        <span className="text-xs text-m3-on-surface-variant mr-2 hidden sm:block">
          {t("teacher_outcomes.count", "{{count}} defined", {
            count: outcomes.length,
          })}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-m3-on-surface-variant transition-transform duration-300",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div className="p-5 border-t border-m3-outline-variant/10 bg-m3-surface space-y-4">
            {outcomes.length === 0 ? (
              <p className="text-sm text-m3-on-surface-variant">
                {t(
                  "teacher_outcomes.empty",
                  "No learning outcomes yet. Add one to describe what students will achieve.",
                )}
              </p>
            ) : (
              <ul className="space-y-2">
                {outcomes.map((outcome) => (
                  <OutcomeRow
                    key={outcome.id}
                    outcome={outcome}
                    ctl={ctl}
                    t={t}
                  />
                ))}
              </ul>
            )}

            {editable && <OutcomeAddForm ctl={ctl} t={t} />}
          </div>
        </div>
      </div>

      <PromptDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
        title={t("teacher_outcomes.delete_title", "Delete learning outcome?")}
        description={t(
          "teacher_outcomes.delete_description",
          "The remaining outcomes will be renumbered automatically.",
        )}
        confirmLabel={t("teacher_outcomes.delete", "Delete")}
        isPending={deleteOutcome.isPending}
        onConfirm={() => {
          if (pendingDeleteId) void handleDelete(pendingDeleteId);
        }}
      />
    </div>
  );
}

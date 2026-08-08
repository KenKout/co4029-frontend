import { useTranslation } from "react-i18next";
import { ChevronDown, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OutcomeDeleteDialog } from "./OutcomeDeleteDialog";
import { OutcomeDraftRow } from "./OutcomeDraftRow";
import { OutcomeRow } from "./OutcomeRow";
import { useCourseOutcomesEditor } from "./use-course-outcomes-editor";
import { childCount } from "./use-outcome-tree-actions";

/**
 * Collapsible "Learning Outcomes" outliner: a nestable list where every row
 * is edited in place (click to type, Enter for a sibling, Tab to nest — see
 * OutcomeRow). Editing is only permitted while the course is an unpublished
 * draft — once published the outcomes are frozen (they double as the graded
 * assessment scale, enforced server-side).
 */
export function LearningOutcomesPanel({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const ctl = useCourseOutcomesEditor({ courseId, t });
  const { outcomes, editable, open, draft, pendingDeleteId } = ctl;

  const pendingOutcome = outcomes.find((o) => o.id === pendingDeleteId) ?? null;
  const kids = pendingOutcome ? childCount(outcomes, pendingOutcome) : 0;
  const pendingCode = pendingOutcome
    ? t("teacher_outcomes.code", "L.O.{{n}}", {
        n: pendingOutcome.code ?? pendingOutcome.position,
      })
    : "";

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 border-m3-outline-variant/20 overflow-hidden transition-colors",
        open ? "border-l-m3-primary" : "border-l-m3-outline-variant",
      )}
    >
      <PanelHeader ctl={ctl} t={t} />
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div className="p-5 border-t border-m3-outline-variant/10 bg-m3-surface space-y-4">
            {outcomes.length === 0 && !draft ? (
              <p className="text-sm text-m3-on-surface-variant">
                {t(
                  "teacher_outcomes.empty",
                  "No learning outcomes yet. Click below to add one.",
                )}
              </p>
            ) : (
              <ul className="space-y-1">
                {outcomes.map((outcome) => (
                  <OutcomeRow key={outcome.id} outcome={outcome} ctl={ctl} t={t} />
                ))}
              </ul>
            )}
            {draft && <OutcomeDraftRow ctl={ctl} t={t} />}
            {editable && !draft && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2 mt-2"
                onClick={() => ctl.setDraft({ parentId: null, afterId: "__root__" })}
              >
                <ListChecks className="h-4 w-4" />
                {t("teacher_outcomes.add", "Add outcome")}
              </Button>
            )}
          </div>
        </div>
      </div>
      <OutcomeDeleteDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) ctl.setPendingDeleteId(null);
        }}
        code={pendingCode}
        kids={kids}
        linkedQuestions={pendingOutcome?.question_count ?? 0}
        isPending={ctl.deleteOutcome.isPending}
        onCascade={() => {
          if (pendingDeleteId) ctl.handleDelete(pendingDeleteId, false);
        }}
        onPromote={() => {
          if (pendingDeleteId) ctl.handleDelete(pendingDeleteId, true);
        }}
      />
    </div>
  );
}

function PanelHeader({
  ctl,
  t,
}: {
  ctl: ReturnType<typeof useCourseOutcomesEditor>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const { open, setOpen, outcomes } = ctl;
  return (
    <Button variant="ghost"
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={cn(
        "group w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer transition-colors h-auto whitespace-normal",
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
    </Button>
  );
}

import type { CourseLearningOutcomeAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import type { TranslateFn } from "./types";

function OutcomeRow({
  outcome,
  checked,
  hasChildren,
  onToggle,
  t,
}: {
  outcome: CourseLearningOutcomeAuthoring;
  checked: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  t: TranslateFn;
}) {
  const depth = outcome.depth ?? 0;
  return (
    <label
      style={{ marginLeft: `${depth * 1.25}rem` }}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all",
        checked
          ? "border-m3-secondary bg-m3-secondary-fixed/30"
          : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4"
      />
      <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[11px] font-bold text-violet-700">
        {t("quiz_generation.outcomes.badge", "L.O.{{n}}", {
          n: outcome.code ?? outcome.position,
        })}
      </span>
      <span className="flex-1 text-sm text-m3-on-surface">
        {outcome.outcome_text}
      </span>
      {hasChildren && (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-m3-on-surface-variant">
          {t("quiz_generation.outcomes.parent_hint", "incl. sub-outcomes")}
        </span>
      )}
    </label>
  );
}

/**
 * Target learning-outcome picker. Rendered only when the quiz's course is
 * known; a parent toggle cascades to its whole subtree via the controller's
 * `toggleOutcome`.
 */
export function TargetOutcomesPicker({
  outcomes,
  childrenByParent,
  selectedOutcomeIds,
  onToggleOutcome,
  onSelectAll,
  t,
}: {
  outcomes: CourseLearningOutcomeAuthoring[];
  childrenByParent: Map<string, string[]>;
  selectedOutcomeIds: string[];
  onToggleOutcome: (outcomeId: string) => void;
  onSelectAll: () => void;
  t: TranslateFn;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("quiz_generation.outcomes.label", "Target learning outcomes")}
        </label>
        {outcomes.length > 0 && (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs font-semibold text-m3-secondary hover:text-m3-primary cursor-pointer"
          >
            {t("quiz_generation.outcomes.select_all", "Select all")}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {outcomes.length === 0 ? (
          <div className="rounded-xl bg-m3-surface p-4 text-sm text-m3-on-surface-variant text-center">
            {t(
              "quiz_generation.outcomes.empty",
              "No learning outcomes defined for this course yet. Questions will be generated without outcome tagging.",
            )}
          </div>
        ) : (
          outcomes.map((outcome) => (
            <OutcomeRow
              key={outcome.id}
              outcome={outcome}
              checked={selectedOutcomeIds.includes(outcome.id)}
              hasChildren={(childrenByParent.get(outcome.id)?.length ?? 0) > 0}
              onToggle={() => onToggleOutcome(outcome.id)}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}

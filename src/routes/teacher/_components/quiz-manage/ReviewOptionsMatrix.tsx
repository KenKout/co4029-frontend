import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

import type { ReviewOptions } from "@/lib/api/hooks/quizzes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ReviewPresetRow } from "./ReviewPresetRow";
import { ReviewWindowCard } from "./ReviewWindowCard";
import { WINDOW_KEYS, matchPreset } from "./review-options-model";
import type {
  FlagKey,
  ReviewWindowFlags,
  WindowKey,
} from "./review-options-model";

export { defaultReviewOptions } from "./review-options-model";
export type { ReviewWindowFlags } from "./review-options-model";

/**
 * Phase 2 — review-visibility editor: what a student sees AFTER submitting,
 * per time-window. Same 3-window x 5-flag data shape as before.
 *
 * Presented as one labelled card per time-window instead of a checkbox
 * matrix. In a matrix, a bare cell carries no meaning on its own — you have
 * to track a row label left and a column header up to decode it, for all 15
 * cells. Here every checkbox sits directly beside the text it controls, and
 * the preset row above resolves the common cases in a single click so most
 * teachers never open the per-window detail at all.
 */
export function ReviewOptionsMatrix({
  value,
  onChange,
}: {
  value: ReviewOptions;
  onChange: (next: ReviewOptions) => void;
}) {
  const { t } = useTranslation();
  const activePreset = useMemo(() => matchPreset(value), [value]);
  // Start collapsed when a preset describes the config — there's nothing to
  // read in the detail view that the preset name doesn't already say.
  const [expanded, setExpanded] = useState(activePreset === null);

  function setWindow(win: WindowKey, next: ReviewWindowFlags) {
    onChange({ ...value, [win]: next });
  }

  function toggle(win: WindowKey, flag: FlagKey) {
    setWindow(win, { ...value[win], [flag]: !value[win][flag] });
  }

  return (
    <div className="space-y-4">
      <ReviewPresetRow activePreset={activePreset} onChange={onChange} />

      {/* Per-window detail. */}
      <div className="rounded-xl border border-m3-outline-variant/20">
        <Button variant="ghost"
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left h-auto whitespace-normal"
        >
          <span className="text-sm font-semibold text-m3-on-surface">
            {t("teacher_quiz_manage.settings.review.customize")}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-m3-on-surface-variant transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </Button>

        {expanded && (
          <div className="space-y-3 border-t border-m3-outline-variant/20 p-4">
            {WINDOW_KEYS.map((win) => (
              <ReviewWindowCard
                key={win}
                win={win}
                windowFlags={value[win]}
                onSetWindow={(next) => setWindow(win, next)}
                onToggle={(flag) => toggle(win, flag)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

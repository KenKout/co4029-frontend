import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Clock, Lock, Send } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ReviewOptions } from "@/lib/api/hooks/quizzes";

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

export type ReviewWindowFlags = ReviewOptions["immediately_after"];

const WINDOW_KEYS = [
  "immediately_after",
  "later_while_open",
  "after_close",
] as const;

const FLAG_KEYS = [
  "show_score",
  "show_correctness",
  "show_correct_answers",
  "show_explanation",
  "show_points",
] as const;

type WindowKey = (typeof WINDOW_KEYS)[number];
type FlagKey = (typeof FLAG_KEYS)[number];

const WINDOW_ICONS: Record<WindowKey, typeof Send> = {
  immediately_after: Send,
  later_while_open: Clock,
  after_close: Lock,
};

function flags(on: boolean): ReviewWindowFlags {
  return {
    show_score: on,
    show_correctness: on,
    show_correct_answers: on,
    show_explanation: on,
    show_points: on,
  };
}

/** All-true default matrix (preserves historical always-show behaviour). */
export function defaultReviewOptions(): ReviewOptions {
  return {
    immediately_after: flags(true),
    later_while_open: flags(true),
    after_close: flags(true),
  };
}

/**
 * Named shortcuts for the matrix shapes teachers actually ask for. Each is a
 * complete matrix, so applying one is predictable — it never merges with
 * whatever was set before.
 */
const PRESETS = {
  everything: (): ReviewOptions => ({
    immediately_after: flags(true),
    later_while_open: flags(true),
    after_close: flags(true),
  }),
  score_now_rest_after_close: (): ReviewOptions => ({
    immediately_after: { ...flags(false), show_score: true },
    later_while_open: { ...flags(false), show_score: true },
    after_close: flags(true),
  }),
  nothing_until_close: (): ReviewOptions => ({
    immediately_after: flags(false),
    later_while_open: flags(false),
    after_close: flags(true),
  }),
  nothing: (): ReviewOptions => ({
    immediately_after: flags(false),
    later_while_open: flags(false),
    after_close: flags(false),
  }),
} as const;

type PresetKey = keyof typeof PRESETS;
const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

function sameMatrix(a: ReviewOptions, b: ReviewOptions) {
  return WINDOW_KEYS.every((win) =>
    FLAG_KEYS.every((flag) => a[win][flag] === b[win][flag]),
  );
}

/** Which preset (if any) the current value already matches. */
function matchPreset(value: ReviewOptions): PresetKey | null {
  return PRESET_KEYS.find((key) => sameMatrix(value, PRESETS[key]())) ?? null;
}

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
      {/* Presets: one click for the common cases. */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.settings.review.presets_label")}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_KEYS.map((key) => {
            const active = activePreset === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(PRESETS[key]())}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-m3-primary bg-m3-primary/10 text-m3-primary"
                    : "border-m3-outline-variant/40 text-m3-on-surface-variant hover:bg-m3-surface-container-high",
                )}
              >
                {t(`teacher_quiz_manage.settings.review.presets.${key}`)}
              </button>
            );
          })}
          {activePreset === null && (
            <span className="self-center rounded-full bg-m3-surface-container-high px-3 py-1.5 text-xs font-semibold text-m3-on-surface-variant">
              {t("teacher_quiz_manage.settings.review.presets.custom")}
            </span>
          )}
        </div>
      </div>

      {/* Per-window detail. */}
      <div className="rounded-xl border border-m3-outline-variant/20">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
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
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-m3-outline-variant/20 p-4">
            {WINDOW_KEYS.map((win) => {
              const Icon = WINDOW_ICONS[win];
              const shown = FLAG_KEYS.filter((f) => value[win][f]).length;
              const allOn = shown === FLAG_KEYS.length;
              return (
                <fieldset
                  key={win}
                  // Labelled by the visible heading rather than a duplicate
                  // sr-only <legend>, which would announce the window name
                  // twice to a screen reader.
                  aria-labelledby={`review-${win}-label`}
                  className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-m3-primary"
                        aria-hidden="true"
                      />
                      <div className="space-y-0.5">
                        <p
                          id={`review-${win}-label`}
                          className="text-sm font-semibold text-m3-on-surface"
                        >
                          {t(
                            `teacher_quiz_manage.settings.review.windows.${win}`,
                          )}
                        </p>
                        <p className="text-[11px] text-m3-on-surface-variant">
                          {t(
                            `teacher_quiz_manage.settings.review.window_hints.${win}`,
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] tabular-nums text-m3-on-surface-variant">
                        {t("teacher_quiz_manage.settings.review.shown_count", {
                          shown,
                          total: FLAG_KEYS.length,
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setWindow(win, flags(!allOn))}
                        className="rounded-lg px-2 py-1 text-[11px] font-semibold text-m3-primary hover:bg-m3-primary/10"
                      >
                        {allOn
                          ? t("teacher_quiz_manage.settings.review.hide_all")
                          : t("teacher_quiz_manage.settings.review.show_all")}
                      </button>
                    </div>
                  </div>

                  {/* Label sits beside its own control, so a row reads as one
                      sentence and needs no cross-referencing. */}
                  <div className="grid gap-1 sm:grid-cols-2">
                    {FLAG_KEYS.map((flag) => {
                      const id = `review-${win}-${flag}`;
                      return (
                        <label
                          key={flag}
                          htmlFor={id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-m3-surface-container-high"
                        >
                          <Checkbox
                            id={id}
                            checked={value[win][flag]}
                            onCheckedChange={() => toggle(win, flag)}
                          />
                          <span className="text-sm text-m3-on-surface">
                            {t(
                              `teacher_quiz_manage.settings.review.flags.${flag}`,
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

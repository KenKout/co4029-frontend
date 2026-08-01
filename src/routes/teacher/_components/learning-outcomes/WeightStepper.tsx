import { useTranslation } from "react-i18next";
import { Loader2, Minus, Plus } from "lucide-react";

/**
 * Compact −/+ stepper for an outcome's importance weight (1–5).
 *
 * Replaces the old "enter edit mode → change a number input → press Save"
 * round-trip: each click PATCHes immediately, so adjusting how much an outcome
 * counts is a single tap. Clamped to 1–5 with the ends disabled so the teacher
 * gets an affordance rather than a silent no-op.
 */
export function WeightStepper({
  weight,
  busy,
  onChange,
}: {
  weight: number;
  busy: boolean;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const MIN = 1;
  const MAX = 5;
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        {t("teacher_interview_config.outcomes.weight_label")}
      </span>
      <div className="inline-flex items-center rounded-lg border border-m3-outline-variant/30 bg-m3-surface">
        <button
          type="button"
          aria-label={t("teacher_interview_config.outcomes.weight_decrease")}
          title={t("teacher_interview_config.outcomes.weight_decrease")}
          disabled={busy || weight <= MIN}
          onClick={() => onChange(weight - 1)}
          className="grid h-7 w-7 place-items-center rounded-l-lg text-m3-on-surface-variant transition-colors hover:bg-m3-primary/10 hover:text-m3-primary disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span
          className="min-w-9 px-1 text-center text-xs font-extrabold tabular-nums text-m3-on-surface"
          aria-live="polite"
        >
          {busy ? (
            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
          ) : (
            `${weight}/${MAX}`
          )}
        </span>
        <button
          type="button"
          aria-label={t("teacher_interview_config.outcomes.weight_increase")}
          title={t("teacher_interview_config.outcomes.weight_increase")}
          disabled={busy || weight >= MAX}
          onClick={() => onChange(weight + 1)}
          className="grid h-7 w-7 place-items-center rounded-r-lg text-m3-on-surface-variant transition-colors hover:bg-m3-primary/10 hover:text-m3-primary disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Beginner-friendly replacement for the raw SM-2 "spacing" inputs
 * (initial_ef / min_ef_for_unlock / coverage_threshold).
 *
 * Teachers think in terms of "how much mastery before students move on?",
 * not easiness factors. So the primary control is a 3-way preset picker
 * (Gentle / Balanced / Rigorous) that bundles opinionated EF values. The
 * exact numbers stay available behind an "Advanced" disclosure for the rare
 * power user; touching them flips the selection to "Custom". The word "EF"
 * never appears in the primary UI — only inside Advanced.
 *
 * No backend contract change: this writes the same three draft fields the
 * form already submits.
 */

export type MasteryPresetKey = "gentle" | "balanced" | "rigorous";

export interface MasteryValues {
  initial_ef: string;
  min_ef_for_unlock: string;
  coverage_threshold: string;
}

/**
 * Canonical value bundles. initial_ef stays at the SM-2 default (2.5) across
 * presets — the pedagogically meaningful levers are the unlock bar
 * (min_ef_for_unlock) and how much of the material must clear it
 * (coverage_threshold).
 */
export const MASTERY_PRESETS: Record<MasteryPresetKey, MasteryValues> = {
  gentle: { initial_ef: "2.5", min_ef_for_unlock: "2.0", coverage_threshold: "70" },
  balanced: { initial_ef: "2.5", min_ef_for_unlock: "2.3", coverage_threshold: "85" },
  rigorous: { initial_ef: "2.5", min_ef_for_unlock: "2.4", coverage_threshold: "95" },
};

const PRESET_ORDER: MasteryPresetKey[] = ["gentle", "balanced", "rigorous"];

function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Which preset (if any) the current values match. All-empty is treated as
 * "balanced" because the backend's own defaults equal the balanced bundle,
 * so a fresh quiz reads as Balanced rather than Custom. Anything that doesn't
 * match a preset within tolerance is "custom".
 */
export function detectPreset(values: MasteryValues): MasteryPresetKey | "custom" {
  const ef = num(values.initial_ef);
  const unlock = num(values.min_ef_for_unlock);
  const coverage = num(values.coverage_threshold);

  if (ef === null && unlock === null && coverage === null) return "balanced";

  for (const key of PRESET_ORDER) {
    const preset = MASTERY_PRESETS[key];
    const efMatch = ef !== null && Math.abs(ef - Number(preset.initial_ef)) < 0.001;
    const unlockMatch =
      unlock !== null && Math.abs(unlock - Number(preset.min_ef_for_unlock)) < 0.001;
    const coverageMatch =
      coverage !== null && Math.abs(coverage - Number(preset.coverage_threshold)) < 0.001;
    if (efMatch && unlockMatch && coverageMatch) return key;
  }
  return "custom";
}

interface MasterySelectorProps {
  values: MasteryValues;
  /** Apply a partial patch to the parent draft (merges the given keys). */
  onPatch: (patch: Partial<MasteryValues>) => void;
}

export function MasterySelector({ values, onPatch }: MasterySelectorProps) {
  const { t } = useTranslation();
  const selected = detectPreset(values);
  const [advancedOpen, setAdvancedOpen] = useState(selected === "custom");

  return (
    <div className="space-y-5">
      {/* Preset cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRESET_ORDER.map((key) => {
          const active = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPatch(MASTERY_PRESETS[key])}
              aria-pressed={active}
              className={cn(
                "text-left rounded-xl border p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/50 cursor-pointer",
                active
                  ? "border-m3-primary bg-m3-primary-fixed/30 shadow-ai-glow"
                  : "border-m3-outline-variant/30 bg-m3-surface hover:border-m3-primary/40 hover:bg-m3-surface-container-low",
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <GraduationCap
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-m3-primary" : "text-m3-on-surface-variant",
                  )}
                />
                <span className="font-headline font-extrabold text-sm text-m3-on-surface">
                  {t(`teacher_quiz_manage.settings.spacing.presets.${key}.name`)}
                </span>
              </div>
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                {t(`teacher_quiz_manage.settings.spacing.presets.${key}.desc`)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Live preview sentence */}
      <div className="rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/20 px-4 py-3">
        <p className="text-xs text-m3-on-surface-variant leading-relaxed">
          {selected === "custom"
            ? t("teacher_quiz_manage.settings.spacing.preview.custom", {
                coverage: values.coverage_threshold || "—",
              })
            : t(`teacher_quiz_manage.settings.spacing.preview.${selected}`, {
                coverage: MASTERY_PRESETS[selected].coverage_threshold,
              })}
        </p>
      </div>

      {/* Advanced disclosure — raw SM-2 knobs */}
      <div className="rounded-xl border border-m3-outline-variant/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-m3-surface-container-low transition-colors cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.settings.spacing.advanced.toggle")}
            {selected === "custom" && (
              <span className="ml-2 normal-case tracking-normal text-m3-primary font-semibold">
                {t("teacher_quiz_manage.settings.spacing.advanced.custom_badge")}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-m3-on-surface-variant transition-transform",
              advancedOpen && "rotate-180",
            )}
          />
        </button>
        {advancedOpen && (
          <div className="px-4 pb-4 pt-1 space-y-3">
            <p className="text-[11px] text-m3-on-surface-variant leading-relaxed">
              {t("teacher_quiz_manage.settings.spacing.advanced.help")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AdvancedField
                label={t("teacher_quiz_manage.settings.spacing.starting_ef")}
                min={1.3}
                max={2.5}
                step={0.1}
                value={values.initial_ef}
                placeholder="2.50"
                onChange={(v) => onPatch({ initial_ef: v })}
              />
              <AdvancedField
                label={t("teacher_quiz_manage.settings.spacing.unlock_ef")}
                min={1.3}
                max={2.5}
                step={0.1}
                value={values.min_ef_for_unlock}
                placeholder="2.30"
                onChange={(v) => onPatch({ min_ef_for_unlock: v })}
              />
              <AdvancedField
                label={t("teacher_quiz_manage.settings.spacing.coverage")}
                min={0}
                max={100}
                step={1}
                value={values.coverage_threshold}
                placeholder="85"
                onChange={(v) => onPatch({ coverage_threshold: v })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdvancedField({
  label,
  min,
  max,
  step,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {label}
      </label>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-m3-surface text-sm"
      />
    </div>
  );
}

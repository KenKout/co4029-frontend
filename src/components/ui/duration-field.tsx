import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type DurationUnit = "seconds" | "minutes" | "hours" | "days";

/** How many minutes one unit represents. Stored duration is always minutes. */
const MINUTES_PER_UNIT: Record<DurationUnit, number> = {
  seconds: 1 / 60,
  minutes: 1,
  hours: 60,
  days: 60 * 24,
};

const UNIT_LABEL_KEYS: readonly { value: DurationUnit; labelKey: string }[] = [
  { value: "seconds", labelKey: "duration.unit_seconds" },
  { value: "minutes", labelKey: "duration.unit_minutes" },
  { value: "hours", labelKey: "duration.unit_hours" },
  { value: "days", labelKey: "duration.unit_days" },
];

const MAX_DISPLAY_DECIMALS = 4;

function roundedDisplayValue(minutes: number, unit: DurationUnit): number {
  return Number(
    (minutes / MINUTES_PER_UNIT[unit]).toFixed(MAX_DISPLAY_DECIMALS),
  );
}

function preferredUnit(value: string): DurationUnit {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 60) return "minutes";

  const days = roundedDisplayValue(minutes, "days");
  if (days >= 1 && Math.round(days * MINUTES_PER_UNIT.days) === minutes) {
    return "days";
  }
  return "hours";
}

/**
 * Number + unit pair for a duration, stored as minutes.
 *
 * Accepts the persisted value in minutes (string, so empty stays distinct
 * from a deliberate 0) and reports changes back in minutes. The unit select
 * picks a compact initial unit; switching unit recomputes the displayed number
 * from the stored minutes, so the underlying value is never lost on a unit
 * change. Converted values are capped at four decimal places to avoid exposing
 * floating-point repetitions such as 0.1666666667 hours.
 */
export function DurationField({
  value,
  onChange,
  className,
  placeholder,
  inputClassName,
  initialUnit,
}: {
  /** Stored duration in minutes ("" = unset). */
  value: string;
  onChange: (minutes: string) => void;
  className?: string;
  placeholder?: string;
  inputClassName?: string;
  initialUnit?: DurationUnit;
}) {
  const { t } = useTranslation();
  const [unit, setUnit] = useState<DurationUnit>(
    () => initialUnit ?? preferredUnit(value),
  );

  const minutes = Number(value);
  const factor = MINUTES_PER_UNIT[unit];
  const displayValue =
    value === "" || !Number.isFinite(minutes)
      ? ""
      : String(roundedDisplayValue(minutes, unit));

  function handleInput(raw: string) {
    if (raw.trim() === "") return onChange("");
    const num = Number(raw);
    if (!Number.isFinite(num)) return;
    onChange(String(Math.round(num * factor)));
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        type="number"
        min="0"
        inputMode="decimal"
        value={displayValue}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        className={cn("flex-1", inputClassName)}
      />
      <div className="w-28 shrink-0">
        <Select
          aria-label={t("duration.label")}
          value={unit}
          onValueChange={(next) => setUnit(next)}
          options={UNIT_LABEL_KEYS.map((o) => ({
            value: o.value,
            label: t(o.labelKey),
          }))}
        />
      </div>
    </div>
  );
}

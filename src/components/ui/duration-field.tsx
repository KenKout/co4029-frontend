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

/**
 * Number + unit pair for a duration, stored as minutes.
 *
 * Accepts the persisted value in minutes (string, so empty stays distinct
 * from a deliberate 0) and reports changes back in minutes. The unit select
 * defaults to hours; switching unit recomputes the displayed number from the
 * stored minutes, so the underlying value is never lost on a unit change.
 */
export function DurationField({
  value,
  onChange,
  className,
  placeholder,
  inputClassName,
}: {
  /** Stored duration in minutes ("" = unset). */
  value: string;
  onChange: (minutes: string) => void;
  className?: string;
  placeholder?: string;
  inputClassName?: string;
}) {
  const { t } = useTranslation();
  const [unit, setUnit] = useState<DurationUnit>("hours");

  const minutes = Number(value);
  const factor = MINUTES_PER_UNIT[unit];
  const displayValue =
    value === "" || !Number.isFinite(minutes)
      ? ""
      : String(minutes / factor);

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

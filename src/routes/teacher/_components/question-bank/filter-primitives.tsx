import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/**
 * Filter primitives for the Question Bank toolbar, extracted verbatim from the
 * former 2.4k-line question-bank.tsx. Purely presentational — no data access.
 */

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
      <span className="hidden font-semibold sm:inline">{label}</span>
      {/* Fixed identical width for every filter select. Under `w-auto` each one
          sized to its longest option, so a row of them stepped up and down at
          random — the redesigned sibling page names this exactly: unequal
          widths in one control row read as a bug. */}
      <Select
        size="sm"
        aria-label={label}
        value={value}
        onValueChange={onChange}
        options={options}
        className="w-[8.5rem]"
      />
    </label>
  );
}

export function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
      {label}
      <Button variant="ghost"
        type="button"
        onClick={onClear}
        // Was a hardcoded English string, so this button announced in English
        // to a Vietnamese screen-reader user regardless of the UI language.
        aria-label={t("teacher_interview_config.qbank.remove_filter", {
          label,
        })}
        className="cursor-pointer rounded-full hover:bg-primary/20 p-0.5 h-auto whitespace-normal"
      >
        <X className="h-3 w-3" />
      </Button>
    </span>
  );
}

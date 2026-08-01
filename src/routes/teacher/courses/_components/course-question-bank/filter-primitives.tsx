import { Select } from "@/components/ui/select";

/**
 * Filter primitive for the course-level Question Bank toolbar, extracted
 * verbatim from the former 843-line course-question-bank.tsx. Purely
 * presentational — no data access.
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
      <Select
        value={value}
        onValueChange={(next) => onChange(next)}
        aria-label={label}
        size="sm"
        // Fixed identical width for every filter select: unequal widths in one
        // control row read as a bug, and the label text length varies.
        className="w-[8.5rem]"
        options={options}
      />
    </label>
  );
}

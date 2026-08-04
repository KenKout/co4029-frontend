import { cn } from "@/lib/utils";

import { Select } from "@/components/ui/select";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  id: string;
  /** Accessible name of the dropdown; also the "no filter" row label when
   *  `allLabel` is absent. */
  label: string;
  /** Label of the explicit "no filter" row, e.g. "All results". */
  allLabel?: string;
  options: FilterOption[];
  /** Extra classes for this filter's Select trigger (e.g. a fixed width). */
  className?: string;
}

export type FilterValues = Record<string, string | undefined>;

/** Sentinel option value meaning "no filter" — every surface that uses the
 *  shared FilterBar speaks the same "all" dialect (the teacher filter bars
 *  already did; the DataTableToolbar adapts its `undefined`-based values at
 *  its boundary). */
export const FILTER_ALL_VALUE = "all";

export interface FilterBarProps {
  filters: FilterDef[];
  values: FilterValues;
  /** Called with the picked option value, `FILTER_ALL_VALUE` included. */
  onChange: (filterId: string, value: string) => void;
  /** When provided, a "Clear filters" button resets every filter. */
  onResetAll?: () => void;
  clearLabel?: string;
  className?: string;
}

/**
 * Row of dropdown filters with an explicit "All …" option per filter and an
 * optional "Clear filters" button.
 *
 * Extracted from the teacher filter bars (course Assessments page + course
 * student-detail) so the same control is defined once and reused — including
 * by the shared DataTableToolbar, which delegates its `filters` prop here.
 * Every filter is the shared styled Select (ui/select.tsx) at the DEFAULT
 * density, never a native <select> — deliberately no size option: the
 * dropdowns must always sit on the same baseline as the search inputs they
 * sit next to (both are h-10), or the row reads as misaligned.
 */
export function FilterBar({
  filters,
  values,
  onChange,
  onResetAll,
  clearLabel = "Clear filters",
  className,
}: FilterBarProps) {
  const hasActive = filters.some((f) => {
    const v = values[f.id];
    return v !== undefined && v !== FILTER_ALL_VALUE;
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filters.map((f) => (
        <Select
          key={f.id}
          aria-label={f.label}
          value={values[f.id] ?? FILTER_ALL_VALUE}
          onValueChange={(next) => onChange(f.id, next)}
          options={[
            { value: FILTER_ALL_VALUE, label: f.allLabel ?? f.label },
            // The page-local option lists already carry their own "all" row
            // ("All results", "All time") — skip it so the no-filter row
            // never renders twice.
            ...f.options.filter((o) => o.value !== FILTER_ALL_VALUE),
          ]}
          className={cn("w-44", f.className)}
        />
      ))}
      {hasActive && onResetAll && (
        <button
          type="button"
          onClick={onResetAll}
          className="h-10 rounded-lg px-3 text-sm font-medium text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}

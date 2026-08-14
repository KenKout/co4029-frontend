import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  FILTER_ALL_VALUE,
  FilterBar,
  type FilterDef,
  type FilterValues,
} from "@/components/ui/filter-bar";

export type { FilterDef, FilterOption, FilterValues } from "@/components/ui/filter-bar";

// ── Time-range presets ──────────────────────────────────────────────────────

export type TimeRange =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "6months"
  | "year"
  | "all"
  | "custom";

export interface TimeRangeOption {
  value: TimeRange;
  label: string;
}

/** User-picked from/to dates (``YYYY-MM-DD``), used when ``timeRange`` is
 *  ``"custom"``. Either bound may be absent — an absent ``from`` means
 *  "no lower bound" (like ``all``), an absent ``to`` means "no upper bound". */
export interface CustomTimeRange {
  from?: string;
  to?: string;
}

export interface TimeRangeLabels {
  /** Accessible name for the selector. */
  ariaLabel?: string;
  /** Selector option for the custom-range entry. */
  customOption?: string;
  /** Dialog heading. */
  dialogTitle?: string;
  from?: string;
  to?: string;
  apply?: string;
  clear?: string;
}

const DEFAULT_TIME_OPTIONS: TimeRangeOption[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "6months", label: "6 Months" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

const DEFAULT_TIME_LABELS: TimeRangeLabels = {
  ariaLabel: "Time range",
  customOption: "Custom range…",
  dialogTitle: "Custom time range",
  from: "From",
  to: "To",
  apply: "Apply",
  clear: "Clear",
};

// ── Toolbar props ───────────────────────────────────────────────────────────

export interface DataTableToolbarProps {
  /** Search input value (controlled). */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Time-range filter. */
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  timeRangeOptions?: TimeRangeOption[];
  /** Accessible name for the time-range selector. */
  timeRangeAriaLabel?: string;
  /** Custom from/to range, active when ``timeRange === "custom"``. */
  customTimeRange?: CustomTimeRange;
  /** Required to expose the "custom range" option (opens the date dialog). */
  onCustomTimeRangeChange?: (range: CustomTimeRange | undefined) => void;
  /** Overrides for the custom-range selector option and dialog labels. */
  timeRangeLabels?: TimeRangeLabels;

  /** Simple inline filters rendered as pill toggles. */
  filters?: FilterDef[];
  filterValues?: FilterValues;
  onFilterChange?: (filterId: string, value: string | undefined) => void;

  /** When there are many filters, open them inside a dialog. */
  dialogFilters?: FilterDef[];
  dialogFilterValues?: FilterValues;
  onDialogFilterChange?: (filterId: string, value: string | undefined) => void;

  /** Fired when user clicks "Reset all" inside the dialog. */
  onResetAllFilters?: () => void;

  /** Label of the inline "Clear filters" button (shown when a filter is set
   *  and `onResetAllFilters` is provided). */
  clearLabel?: string;

  /** Extra toolbar content (e.g. "Add" button) rendered at the end. */
  trailing?: React.ReactNode;
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search\u2026",
  timeRange,
  onTimeRangeChange,
  timeRangeOptions = DEFAULT_TIME_OPTIONS,
  timeRangeAriaLabel,
  customTimeRange,
  onCustomTimeRangeChange,
  timeRangeLabels,
  filters,
  filterValues,
  onFilterChange,
  dialogFilters,
  dialogFilterValues,
  onDialogFilterChange,
  onResetAllFilters,
  clearLabel,
  trailing,
  className,
}: DataTableToolbarProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const hasSearch = onSearchChange !== undefined;
  const hasTimeRange = onTimeRangeChange !== undefined;
  const hasFilters = filters && filters.length > 0;
  const hasDialogFilters = dialogFilters && dialogFilters.length > 0;

  const activeDialogCount = React.useMemo(() => {
    if (!dialogFilterValues) return 0;
    return Object.values(dialogFilterValues).filter(Boolean).length;
  }, [dialogFilterValues]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Search — the shared SearchInput, not a hand-rolled clone. */}
      {hasSearch && (
        <SearchInput
          value={search ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          onClear={search ? () => onSearchChange("") : undefined}
          wrapperClassName="min-w-[180px] max-w-xs flex-1"
        />
      )}

      {/* Time range — a single selector (presets + "custom range…") instead of
          a tab strip; the custom entry opens a from/to date dialog. */}
      {hasTimeRange && (
        <TimeRangeSelect
          value={timeRange ?? "all"}
          onChange={onTimeRangeChange}
          options={timeRangeOptions}
          customRange={customTimeRange}
          onCustomRangeChange={onCustomTimeRangeChange}
          labels={{
            ariaLabel: timeRangeAriaLabel,
            ...timeRangeLabels,
          }}
        />
      )}

      {/* Inline filter chips — delegated to the shared FilterBar (the same
          component the teacher Assessments / student-detail pages use), with
          the toolbar's `undefined`-based values adapted to its "all" dialect. */}
      {hasFilters && (
        <ToolbarFilters
          filters={filters}
          values={filterValues}
          onChange={onFilterChange}
          onResetAll={onResetAllFilters}
          clearLabel={clearLabel}
        />
      )}

      {/* Dialog filter button */}
      {hasDialogFilters && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Filters
            {activeDialogCount > 0 && (
              <Badge
                variant="default"
                className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
              >
                {activeDialogCount}
              </Badge>
            )}
          </Button>
          <FilterDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            filters={dialogFilters}
            values={dialogFilterValues ?? {}}
            onChange={onDialogFilterChange}
            onResetAll={onResetAllFilters}
          />
        </>
      )}

      {/* Trailing */}
      {trailing && (
        <div className="ml-auto flex items-center gap-2">{trailing}</div>
      )}
    </div>
  );
}

// ── Time-range selector + custom-range dialog ───────────────────────────────
//
// The toolbar's time filter used to be a contained-pill tab strip; a single
// selector (with a "custom range…" entry that opens a from/to date dialog)
// keeps the toolbar compact once there is a custom option. The dialog is
// plain base-ui Dialog — same family the filter dialog uses.

export function TimeRangeSelect({
  value,
  onChange,
  options,
  customRange,
  onCustomRangeChange,
  labels,
  className,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  options: TimeRangeOption[];
  customRange?: CustomTimeRange;
  onCustomRangeChange?: (range: CustomTimeRange | undefined) => void;
  labels: TimeRangeLabels;
  /** Width override (e.g. full-width inside a sheet); defaults to w-44. */
  className?: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const merged = { ...DEFAULT_TIME_LABELS, ...labels };
  const hasCustom = onCustomRangeChange !== undefined;

  // While a custom range is active, the trigger shows the actual dates
  // (e.g. "2026-08-01 → 2026-08-15") instead of the generic option label.
  const activeLabel =
    value === "custom" && customRange?.from
      ? `${customRange.from} → ${customRange.to ?? "…"}`
      : undefined;

  const selectOptions: TimeRangeOption[] = hasCustom
    ? [
        ...options,
        {
          value: "custom",
          label: activeLabel ?? merged.customOption ?? "Custom range…",
        },
      ]
    : options;

  return (
    <>
      <Select
        aria-label={merged.ariaLabel}
        value={value}
        onValueChange={(next) => {
          if (next === "custom") {
            onChange("custom");
            setDialogOpen(true);
          } else {
            onChange(next);
          }
        }}
        options={selectOptions}
        // Same density + width dialect as the FilterBar selects it sits next
        // to (h-10, w-44) — the shared Select trigger is `w-full` by default,
        // so a bare min-width would stretch this into its own full-width row.
        className={className ?? "w-44"}
      />
      {hasCustom && (
        <CustomRangeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          range={customRange}
          onChange={onCustomRangeChange}
          onReset={() => onChange("all")}
          labels={merged}
        />
      )}
    </>
  );
}

export function CustomRangeDialog({
  open,
  onOpenChange,
  range,
  onChange,
  onReset,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range?: CustomTimeRange;
  onChange: (range: CustomTimeRange | undefined) => void;
  onReset: () => void;
  labels: TimeRangeLabels;
}) {
  const [from, setFrom] = React.useState(range?.from ?? "");
  const [to, setTo] = React.useState(range?.to ?? "");

  // Re-seed the draft fields every time the dialog opens so stale edits from
  // a previous session never leak in.
  React.useEffect(() => {
    if (open) {
      setFrom(range?.from ?? "");
      setTo(range?.to ?? "");
    }
  }, [open, range]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/30 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-m3-outline-variant/30 bg-white p-5 shadow-2xl",
            "outline-none transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <DialogPrimitive.Title className="font-headline text-base font-bold text-text-strong">
            {labels.dialogTitle}
          </DialogPrimitive.Title>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="block text-xs font-medium text-m3-on-surface-variant">
                {labels.from}
              </span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-m3-outline-variant bg-white px-3 text-sm text-text-strong outline-none focus:border-m3-primary"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-medium text-m3-on-surface-variant">
                {labels.to}
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-m3-outline-variant bg-white px-3 text-sm text-text-strong outline-none focus:border-m3-primary"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(undefined);
                onReset();
                onOpenChange(false);
              }}
              className="text-destructive hover:text-destructive"
            >
              {labels.clear}
            </Button>
            <DialogPrimitive.Close
              render={
                <Button
                  size="sm"
                  disabled={!from}
                  onClick={() =>
                    onChange({ from, to: to || undefined })
                  }
                >
                  {labels.apply}
                </Button>
              }
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Inline filters — thin adapter between the toolbar's `undefined`-based
//    FilterValues and the shared FilterBar's "all" dialect. Kept out of
//    DataTableToolbar itself to hold that component under the complexity cap.
function ToolbarFilters({
  filters,
  values,
  onChange,
  onResetAll,
  clearLabel,
}: {
  filters: FilterDef[];
  values?: FilterValues;
  onChange?: (filterId: string, value: string | undefined) => void;
  onResetAll?: () => void;
  clearLabel?: string;
}) {
  return (
    <FilterBar
      filters={filters}
      values={values ?? {}}
      onChange={(filterId, value) =>
        onChange?.(filterId, value === FILTER_ALL_VALUE ? undefined : value)
      }
      onResetAll={onResetAll}
      clearLabel={clearLabel}
    />
  );
}

// ── Filter dialog (for many filters) ────────────────────────────────────────

function FilterDialog({
  open,
  onOpenChange,
  filters,
  values,
  onChange,
  onResetAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterDef[];
  values: FilterValues;
  onChange?: (filterId: string, value: string | undefined) => void;
  onResetAll?: () => void;
}) {
  const activeCount = Object.values(values).filter(Boolean).length;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/30 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-m3-outline-variant/30 bg-white p-5 shadow-2xl",
            "outline-none transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="font-headline text-base font-bold text-text-strong">
              Filters
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={
                <Button variant="ghost" size="icon-sm">
                  <X className="h-4 w-4" />
                </Button>
              }
            />
          </div>

          {/* Filter fields */}
          <div className="mt-4 space-y-3">
            {filters.map((f) => (
              <div key={f.id} className="space-y-1">
                <label className="text-xs font-medium text-m3-on-surface-variant">
                  {f.label}
                </label>
                <Select
                  aria-label={f.label}
                  value={values[f.id] ?? ""}
                  onValueChange={(next) => onChange?.(f.id, next || undefined)}
                  options={[
                    { value: "", label: "All" },
                    ...f.options.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    })),
                  ]}
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={activeCount === 0}
              onClick={() => onResetAll?.()}
              className="text-destructive hover:text-destructive"
            >
              Reset all
            </Button>
            <DialogPrimitive.Close render={<Button size="sm">Done</Button>} />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

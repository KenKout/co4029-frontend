import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs } from "@/components/ui/tabs";
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
  | "all";

export interface TimeRangeOption {
  value: TimeRange;
  label: string;
}

const DEFAULT_TIME_OPTIONS: TimeRangeOption[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "6months", label: "6 Months" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

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
  /** Accessible name for the time-range tab strip. */
  timeRangeAriaLabel?: string;

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

      {/* Time range — the shared Tabs contained-pill strip (same filter look
          as the status tabs), not hand-rolled buttons. */}
      {hasTimeRange && (
        <Tabs
          variant="contained"
          ariaLabel={timeRangeAriaLabel}
          tabs={timeRangeOptions.map((opt) => ({
            key: opt.value,
            label: opt.label,
          }))}
          value={timeRange ?? "all"}
          onChange={onTimeRangeChange}
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

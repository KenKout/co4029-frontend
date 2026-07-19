import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

// ── Filter definition ───────────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  id: string;
  label: string;
  options: FilterOption[];
}

export type FilterValues = Record<string, string | undefined>;

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
  filters,
  filterValues,
  onFilterChange,
  dialogFilters,
  dialogFilterValues,
  onDialogFilterChange,
  onResetAllFilters,
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
      {/* Search */}
      {hasSearch && (
        <div className="relative min-w-[180px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-m3-on-surface-variant/50 pointer-events-none" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 pr-7"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-m3-on-surface-variant/50 hover:text-m3-on-surface cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Time range pills */}
      {hasTimeRange && (
        <div className="flex items-center gap-1 rounded-lg border border-m3-outline-variant/20 bg-m3-surface-container-low p-0.5">
          {timeRangeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTimeRangeChange(opt.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                timeRange === opt.value
                  ? "bg-m3-primary text-m3-on-primary shadow-sm"
                  : "text-m3-on-surface-variant hover:bg-m3-surface-container-high",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Inline filter chips */}
      {hasFilters &&
        filters.map((f) => (
          <InlineFilter
            key={f.id}
            def={f}
            value={filterValues?.[f.id]}
            onChange={(v) => onFilterChange?.(f.id, v)}
          />
        ))}

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
              <Badge variant="default" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
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
      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  );
}

// ── Inline filter (dropdown-style chip) ─────────────────────────────────────

function InlineFilter({
  def,
  value,
  onChange,
}: {
  def: FilterDef;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const activeLabel = def.options.find((o) => o.value === value)?.label;

  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={cn(
          "h-7 cursor-pointer appearance-none rounded-md border px-2.5 pr-7 text-xs font-medium transition-colors outline-none",
          value
            ? "border-m3-primary/30 bg-m3-primary/5 text-m3-primary"
            : "border-m3-outline-variant/30 bg-m3-surface-container-low text-m3-on-surface-variant hover:bg-m3-surface-container-high",
        )}
      >
        <option value="">{def.label}</option>
        {def.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-m3-primary hover:bg-m3-primary/10 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
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
                <select
                  value={values[f.id] ?? ""}
                  onChange={(e) => onChange?.(f.id, e.target.value || undefined)}
                  className="w-full rounded-md border border-m3-outline-variant/30 bg-m3-surface-container-low px-2.5 py-1.5 text-sm cursor-pointer outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20"
                >
                  <option value="">All</option>
                  {f.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
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
            <DialogPrimitive.Close
              render={<Button size="sm">Done</Button>}
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

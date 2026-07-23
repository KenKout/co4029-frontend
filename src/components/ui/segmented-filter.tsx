import { cn } from "@/lib/utils";

export interface SegmentedFilterOption<T extends string> {
  /** Stable value written to state when the segment is picked. */
  key: T;
  /** Human-readable label (already translated). */
  label: string;
  /** Optional count badge shown to the right of the label. */
  count?: number;
}

export interface SegmentedFilterProps<T extends string> {
  options: SegmentedFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible label for the group. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Shared segmented control for mutually-exclusive filters (course status,
 * roster status, etc.). One rounded container with a sliding "raised card"
 * highlight on the active segment and an optional count badge per segment.
 *
 * Single source of truth so every teacher-facing filter row reads as the
 * same product surface — see teacher/courses.tsx, course-students.tsx.
 */
export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedFilterProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-xl bg-m3-surface-container-low p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.key)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              active
                ? "bg-card text-m3-primary shadow-sm"
                : "text-m3-on-surface-variant hover:bg-card/60 hover:text-m3-on-surface",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-m3-primary-fixed text-m3-primary"
                    : "bg-m3-surface-container text-m3-on-surface-variant",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import type { MonitorX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * One filter tab in the integrity breakdown row.
 *
 * Doubles as the stat tile it replaced — the count is the headline, so the tabs
 * carry the same information the old passive tiles did while also being the
 * control that filters the timeline. `aria-pressed` (not `aria-selected`) because
 * these are toggle buttons in a group, not an ARIA tablist: the panel below is a
 * filtered list, not four separate panels.
 */
export function IntegrityFilterTab({
  icon: Icon,
  count,
  label,
  title,
  selected,
  warning,
  onSelect,
}: {
  icon: typeof MonitorX;
  count: number;
  label: string;
  /** Full event wording, kept as the tooltip + accessible name when `label` is
      an abbreviation ("Switching" for "Switched away from the interview tab").
      The short form keeps four tabs readable on one row; the long form stays
      reachable so the abbreviation never has to be guessed at. */
  title?: string;
  selected: boolean;
  /** Warning-level type with at least one hit — tinted amber even when unselected. */
  warning: boolean;
  onSelect: () => void;
}) {
  const empty = count === 0;
  return (
    <Button variant="ghost"
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={title ?? label}
      aria-label={title ? `${title} (${count})` : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border p-3 text-left",
        // Hover/press feedback: lift + shadow on the way in, settle on click.
        // transform+shadow+colour only, so this stays off the layout path.
        "cursor-pointer transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-editorial active:translate-y-0 active:scale-[0.98]",
        selected
          ? warning
            ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
            : "border-m3-primary/50 bg-m3-primary-fixed ring-2 ring-m3-primary/20"
          : warning
            ? "border-amber-200 bg-amber-50/50 hover:border-amber-300"
            : "border-border bg-surface-muted/40 hover:border-m3-primary/30",
        // An empty bucket is still clickable (it explains the zero), but it
        // should not compete for attention with one that has hits.
        empty && !selected && "opacity-70 hover:opacity-100",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          selected
            ? warning
              ? "bg-amber-200 text-amber-900"
              : "bg-m3-primary text-white"
            : warning
              ? "bg-amber-100 text-amber-700"
              : "bg-white text-text-subtle group-hover:text-m3-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-lg font-bold leading-none tabular-nums transition-colors duration-200",
            selected
              ? warning
                ? "text-amber-900"
                : "text-m3-primary"
              : warning
                ? "text-amber-800"
                : "text-text-subtle",
          )}
        >
          {count}
        </p>
        <p className="mt-1 truncate text-[11px] font-medium text-m3-on-surface-variant">
          {label}
        </p>
      </div>
    </Button>
  );
}

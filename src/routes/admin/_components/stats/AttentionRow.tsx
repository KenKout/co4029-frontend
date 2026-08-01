import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One row of the "needs attention" list.
 *
 * Only rendered when the count is non-zero — a section called "Needs attention"
 * listing resolved items forces the operator to read each label to work out
 * whether it needs a click. Clear checks are summarised as a single line at the
 * bottom instead, so it's still visible that they ran.
 *
 * Every rendered row therefore carries a count badge; severity only changes how
 * loud it is, never whether the number is shown.
 */
export function AttentionRow({
  label,
  count,
  to,
  search,
  severity = "warn",
}: {
  label: string;
  count: number;
  to: string;
  search?: Record<string, string>;
  severity?: "warn" | "critical";
}) {
  const critical = severity === "critical";
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      search={search as never}
      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-muted/60"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <AlertTriangle
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0",
            critical ? "text-red-600" : "text-amber-600",
          )}
        />
        <span className="truncate text-sm font-medium text-text-strong">
          {label}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
            critical
              ? "bg-red-100 text-red-800"
              : "bg-amber-100 text-amber-800",
          )}
        >
          {count}
        </span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 text-text-subtle" />
      </span>
    </Link>
  );
}

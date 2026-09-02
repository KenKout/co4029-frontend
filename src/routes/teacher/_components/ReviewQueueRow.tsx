import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One row of the teacher's "Needs your review" queue.
 *
 * Deliberately mirrors the admin dashboard's needs-attention pattern, including
 * its rule: rows are only rendered when the count is non-zero, and every
 * rendered row always shows its count. A queue that lists resolved items forces
 * the teacher to read each label to work out whether it needs a click.
 */
export function ReviewQueueRow({
  label,
  count,
  hint,
  icon: Icon,
  to,
  tone = "amber",
}: {
  label: string;
  count: number;
  /** Optional secondary line, e.g. which courses the items sit in. */
  hint?: string;
  icon?: LucideIcon;
  /**
   * A real route from the registered tree — NOT a bare `string`. The router
   * is registered (`declare module … Register` in router.tsx), so typing this
   * as `LinkProps["to"]` makes a typo or a renamed route a compile error
   * instead of a dead link, and removes the `as any` cast this used to need.
   */
  to: LinkProps["to"];
  tone?: "amber" | "violet" | "sky";
}) {
  const TONE = {
    amber: { icon: "text-amber-600", chip: "bg-amber-100 text-amber-800" },
    violet: { icon: "text-violet-600", chip: "bg-violet-100 text-violet-800" },
    sky: { icon: "text-sky-600", chip: "bg-sky-100 text-sky-800" },
  }[tone];

  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-m3-surface-container-low"
    >
      <span className="flex min-w-0 items-center gap-3">
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn("h-4 w-4 shrink-0", TONE.icon)}
          />
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-m3-on-surface">
            {label}
          </span>
          {hint && (
            <span className="block truncate text-xs text-m3-on-surface-variant">
              {hint}
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
            TONE.chip,
          )}
        >
          {count}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 text-m3-outline transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

export default ReviewQueueRow;

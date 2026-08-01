import { Link } from "@tanstack/react-router";
import type { Users } from "lucide-react";

import { cn } from "@/lib/utils";

/** Compact metric used in the cost snapshot and activity rows. */
export function MiniStat({
  label,
  value,
  detail,
  icon: Icon,
  to,
  search,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: typeof Users;
  to?: string;
  search?: Record<string, string>;
  tone?: "default" | "warn";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-m3-on-surface-variant">
          {label}
        </p>
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              tone === "warn" ? "text-amber-600" : "text-text-subtle",
            )}
          />
        )}
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-heading font-semibold tabular-nums",
          tone === "warn" ? "text-amber-700" : "text-m3-on-surface",
        )}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-0.5 text-xs text-text-muted truncate">{detail}</p>
      )}
    </>
  );
  const shell =
    "rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong";
  if (!to) return <div className={shell}>{body}</div>;
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      search={search as never}
      className={cn(shell, "block focus:outline-none focus-visible:ring-2")}
    >
      {body}
    </Link>
  );
}

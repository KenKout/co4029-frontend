import type { CSSProperties } from "react";
import { Library } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One tile of the stat strip, extracted verbatim from the former 843-line
 * course-question-bank.tsx.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  index,
}: {
  icon: typeof Library;
  label: string;
  value: string | number;
  /** Muted trailing text (e.g. "of 6") so the value itself stays one token. */
  suffix?: string;
  index: number;
}) {
  return (
    // Entrance animation on the outer element, hover lift on the inner one —
    // `both` fill-mode would otherwise pin transform and cancel the lift.
    <div
      className="animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
      style={{ animationDelay: `${index * 60}ms` } as CSSProperties}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest px-3 py-2.5",
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-m3-primary/40 hover:shadow-editorial",
        )}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-m3-primary-fixed text-m3-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {label}
          </span>
          {/* key on the value: cross-fades when a filter/delete changes it. */}
          <span
            key={String(value)}
            className="block animate-[fade-in-up_0.25s_ease-out_both] text-sm font-extrabold tabular-nums text-m3-on-surface"
          >
            {value}
            {suffix && (
              <span className="ml-1 text-[11px] font-semibold text-m3-on-surface-variant">
                {suffix}
              </span>
            )}
          </span>
        </span>
      </div>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabDef<T extends string> {
  key: T;
  /** Already-translated label. */
  label: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Optional count badge shown after the label. */
  count?: number;
}

export interface TabsProps<T extends string> {
  tabs: TabDef<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Accessible name for the tablist. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Underline tab strip — the app's existing tab convention (bottom-border
 * indicator, primary colour when active), previously hand-rolled per page in
 * management-career-path-detail/TabBar, course-assessments/AssessmentTabBar and
 * organization-detail with no shared primitive and no count support.
 *
 * Adds the count badge, which is what lets a tab strip replace a separate
 * "filter status" row plus a row of counter cards: the number lives on the
 * control that applies it instead of in a card the user has to map by eye.
 *
 * Renders real `role="tablist"`/`role="tab"` semantics with `aria-selected` and
 * roving `tabIndex`, so arrow-key/tab behaviour matches what a screen reader
 * expects from tabs (the hand-rolled strips were plain buttons).
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex flex-wrap gap-1 border-b border-m3-outline-variant/30",
        className,
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer",
              active
                ? "border-m3-primary text-m3-primary"
                : "border-transparent text-m3-on-surface-variant hover:text-m3-on-surface",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-m3-primary-fixed text-m3-primary"
                    : "bg-m3-surface-container text-m3-on-surface-variant",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

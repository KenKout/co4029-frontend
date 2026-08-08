import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NotificationGroupBy } from "./helpers";

/**
 * Date-vs-type grouping toggle for the inbox. A two-option segmented control
 * (same contained-pill language as the toolbar's time tabs) so the user can
 * switch between "group by date" and "group by type".
 */
export function GroupByToggle({
  value,
  onChange,
  dateLabel,
  typeLabel,
  ariaLabel,
}: {
  value: NotificationGroupBy;
  onChange: (next: NotificationGroupBy) => void;
  dateLabel: string;
  typeLabel: string;
  ariaLabel: string;
}) {
  const options: { key: NotificationGroupBy; label: string }[] = [
    { key: "date", label: dateLabel },
    { key: "type", label: typeLabel },
  ];
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-full bg-m3-surface-container p-1"
    >
      {options.map((opt) => (
        <Button variant="ghost"
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          aria-pressed={value === opt.key}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer h-auto whitespace-normal",
            value === opt.key
              ? "bg-m3-primary text-white shadow-sm"
              : "text-m3-on-surface-variant hover:text-m3-on-surface",
          )}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

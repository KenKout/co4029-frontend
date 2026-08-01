import { cn } from "@/lib/utils";
import { StatusAffix } from "./status-affix";
import type { SectionNavItem } from "./types";

export function SectionNavButton({
  item,
  isActive,
  onSelect,
}: {
  item: SectionNavItem;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const status = item.status ?? { kind: "none" };
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={isActive ? "location" : undefined}
      className={cn(
        "group w-full h-full rounded-md px-3 py-2 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        "whitespace-nowrap cursor-pointer",
        isActive
          ? "bg-primary-soft text-primary"
          : "text-m3-on-surface hover:bg-surface-muted",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "h-4 w-0.5 rounded-full shrink-0 transition-colors",
            isActive ? "bg-primary" : "bg-transparent",
          )}
        />
        <span className="text-[13px] font-bold">
          <span className="lg:hidden xl:inline">{item.label}</span>
          <span className="hidden lg:inline xl:hidden">
            {item.shortLabel ?? item.label}
          </span>
        </span>
      </span>
      {status.kind !== "none" && (
        <span className="mt-0.5 block pl-3 text-[11px] leading-tight">
          <StatusAffix status={status} />
        </span>
      )}
    </button>
  );
}

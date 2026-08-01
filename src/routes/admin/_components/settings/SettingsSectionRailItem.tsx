import { cn } from "@/lib/utils";
import { groupLabel } from "./helpers";
import type { TFn } from "./types";

export function SettingsSectionRailItem({
  t,
  group,
  count,
  active,
  onSelect,
}: {
  t: TFn;
  group: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-m3-primary/10 font-semibold text-m3-primary"
          : "text-slate-600 hover:bg-slate-100",
      )}
    >
      <span className="truncate">{groupLabel(t, group)}</span>
      {count > 0 && (
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            active
              ? "bg-m3-primary text-white"
              : "bg-indigo-100 text-indigo-700",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

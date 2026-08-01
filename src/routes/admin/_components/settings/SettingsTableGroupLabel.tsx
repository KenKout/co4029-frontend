import { groupLabel } from "./helpers";
import type { TableGroupNode, TFn } from "./types";

export function SettingsTableGroupLabel({
  t,
  node,
}: {
  t: TFn;
  node: TableGroupNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="font-semibold text-slate-800">
        {groupLabel(t, node.group)}
      </span>
      <span className="text-xs font-normal text-slate-400">{node.count}</span>
      {node.overrideCount > 0 && (
        <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
          {node.overrideCount} overridden
        </span>
      )}
    </span>
  );
}

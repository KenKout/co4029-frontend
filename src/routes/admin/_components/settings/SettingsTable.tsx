import { DataTable } from "@/components/ui/data-table";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { buildSettingsTableColumns } from "./settings-table-columns";
import { SettingsTableResetButton } from "./SettingsTableResetButton";
import type { TableNode } from "./types";
import type { SettingsDraft } from "./use-settings-draft";
import { useSettingsTable } from "./use-settings-table";

/**
 * Dense alternate layout as ONE hierarchical table: each group is a
 * collapsible parent row, each setting a child row. Using the shared DataTable
 * (rather than one <table> per group) means every column shares a single
 * layout, so Value / Default / Source / Scope line up across all groups
 * instead of each group's table sizing its own columns.
 */
export function SettingsTable({
  groups,
  grouped,
  overrideCounts,
  orgId,
  showKeys,
  draft,
}: {
  groups: readonly string[];
  grouped: Map<string, RuntimeSetting[]>;
  overrideCounts: Record<string, number>;
  orgId?: string;
  showKeys: boolean;
  /** Page-level draft, so table and card view stage into one set. */
  draft: SettingsDraft;
}) {
  const controller = useSettingsTable(orgId, draft);

  const nodes: TableNode[] = groups.map((group) => {
    const rows = grouped.get(group) ?? [];
    return {
      kind: "group" as const,
      id: `group:${group}`,
      group,
      overrideCount: overrideCounts[group] ?? 0,
      count: rows.length,
      children: rows.map((s) => ({
        kind: "setting" as const,
        id: s.key,
        setting: s,
      })),
    };
  });

  const columns = buildSettingsTableColumns(controller, showKeys);

  return (
    <DataTable<TableNode>
      columns={columns}
      data={nodes}
      getRowId={(n) => n.id}
      getSubRows={(n) => (n.kind === "group" ? n.children : undefined)}
      defaultExpanded
      rowClassName={(n) => (n.kind === "group" ? "bg-slate-50/60" : undefined)}
      actionsHeader={<span className="sr-only">Reset</span>}
      actions={(node) => {
        if (node.kind === "group") return null;
        return (
          <SettingsTableResetButton
            controller={controller}
            setting={node.setting}
          />
        );
      }}
    />
  );
}

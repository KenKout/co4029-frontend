import type { DataTableColumn } from "@/components/ui/data-table";
import { unitFor } from "./helpers";
import { ResolutionPopover } from "./ResolutionPopover";
import { SettingsTableGroupLabel } from "./SettingsTableGroupLabel";
import { SettingsTableNumberInput } from "./SettingsTableNumberInput";
import { SettingsTableSettingLabel } from "./SettingsTableSettingLabel";
import { SettingsTableSwitch } from "./SettingsTableSwitch";
import type { TableNode } from "./types";
import type { SettingsTableController } from "./use-settings-table";

/**
 * The five dense-table columns. Extracted from the former inline array in
 * `SettingsTable` so the widths, headers and cell branches stay in one place;
 * the group rows render `null` in every column but the first.
 */
export function buildSettingsTableColumns(
  controller: SettingsTableController,
  showKeys: boolean,
): DataTableColumn<TableNode>[] {
  const { t, scopeLabel, overrideAtScope } = controller;

  return [
    {
      id: "setting",
      header: "Setting",
      cell: (node) => {
        if (node.kind === "group") {
          return <SettingsTableGroupLabel t={t} node={node} />;
        }
        return (
          <SettingsTableSettingLabel
            t={t}
            setting={node.setting}
            showKeys={showKeys}
          />
        );
      },
    },
    {
      id: "value",
      header: "Value",
      width: 140,
      cell: (node) => {
        if (node.kind === "group") return null;
        const s = node.setting;
        return s.type === "bool" ? (
          <SettingsTableSwitch controller={controller} setting={s} />
        ) : (
          <SettingsTableNumberInput controller={controller} setting={s} />
        );
      },
    },
    {
      id: "default",
      header: "Default",
      width: 100,
      cell: (node) => {
        if (node.kind === "group") return null;
        const s = node.setting;
        const unit = unitFor(s);
        return (
          <span className="font-mono text-xs text-slate-500">
            {String(s.default_value)}
            {unit ? ` ${unit}` : ""}
          </span>
        );
      },
    },
    {
      id: "source",
      header: "Source",
      width: 120,
      cell: (node) =>
        node.kind === "group" ? null : (
          <ResolutionPopover setting={node.setting} />
        ),
    },
    {
      id: "scope",
      header: scopeLabel,
      width: 110,
      cell: (node) =>
        node.kind === "group" ? null : (
          <span className="text-xs text-slate-500">
            {overrideAtScope(node.setting) ? "overridden" : "inherited"}
          </span>
        ),
    },
  ];
}

import type {
  RuntimeSetting,
  SettingSource,
} from "@/lib/api/hooks/admin-settings";

/**
 * Shared types for the admin runtime-settings page, extracted from the former
 * 946-line settings.tsx so the row components, the dense table, their hooks
 * and the page shell agree on one definition.
 */

// Localised label / description / group-heading lookups. The backend registry
// ships English label + description as data (settings_registry.py), so we key
// translations by the setting key and fall back to the backend English when a
// locale hasn't translated an entry yet — a newly-added setting therefore
// renders in English until its keys land, never blank.
export type TFn = (key: string, opts?: Record<string, unknown>) => string;

/** One rung of the org → global → env → built-in resolution chain. */
export interface ResolutionLayer {
  source: SettingSource;
  name: string;
  value: boolean | number | null;
  present: boolean;
}

/**
 * Dense alternate layout as ONE hierarchical table: each group is a
 * collapsible parent row, each setting a child row. Using the shared DataTable
 * (rather than one <table> per group) means every column shares a single
 * layout, so Value / Default / Source / Scope line up across all groups
 * instead of each group's table sizing its own columns.
 */
export type TableNode =
  | {
      kind: "group";
      id: string;
      group: string;
      overrideCount: number;
      count: number;
      children: TableNode[];
    }
  | { kind: "setting"; id: string; setting: RuntimeSetting };

/** The collapsible parent row of the dense table. */
export type TableGroupNode = Extract<TableNode, { kind: "group" }>;

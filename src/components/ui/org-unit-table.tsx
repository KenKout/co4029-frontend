import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { collectTreeIds, filterTree } from "@/lib/tree-filter";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";

/**
 * The Faculty collection as a searchable, sortable table.
 *
 * Replaces a bespoke indented-tree component: `DataTable` already supports
 * real hierarchy through `getSubRows` — expand/collapse, depth indentation,
 * and the "auto-expand rows that arrive later, but leave ones the user
 * collapsed alone" behaviour — and it brings the search toolbar, the actions
 * column and the empty state that every other list in the app uses.
 *
 * The table can also show course and people counts when a caller supplies
 * them. The tree-compatible API remains while legacy descendants are read.
 *
 * Pagination is deliberately OFF. Pagination applies to top-level rows, and
 * an organization has a handful of roots — paging them would hide branches
 * behind a page control for no benefit.
 */
export interface OrgUnitTableProps {
  nodes: OrgUnitNode[];
  selectedId?: string | null;
  onSelect?: (node: OrgUnitNode) => void;
  /** Row actions (add child / edit / delete). */
  actions?: (node: OrgUnitNode) => ReactNode;
  /** `{unitId: count}` for the Courses column. Omit to hide the column. */
  courseCounts?: Map<string, number>;
  /** `{unitId: count}` for the People column. Omit to hide the column. */
  peopleCounts?: Map<string, number>;
  emptyState?: ReactNode;
  loading?: boolean;
}

export function OrgUnitTable({
  nodes,
  selectedId,
  onSelect,
  actions,
  courseCounts,
  peopleCounts,
  emptyState,
  loading,
}: OrgUnitTableProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const prefix = "management_org_units";

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!needle) return nodes;
    return filterTree<OrgUnitNode>(
      nodes,
      (n) => n.children,
      (n, children) => ({ ...n, children }),
      (n) =>
        n.name.toLowerCase().includes(needle) ||
        (n.code ?? "").toLowerCase().includes(needle),
    );
  }, [nodes, needle]);

  // A pruned tree is only useful open — otherwise the user still has to
  // expand three levels by hand to reach the single match they searched for.
  // Remounting on the query keeps this simple: the table re-derives its
  // expansion state from `defaultExpanded` for the new result set.
  const tableKey = needle ? `search:${needle}` : "all";

  const columns = useMemo<DataTableColumn<OrgUnitNode>[]>(() => {
    const cols: DataTableColumn<OrgUnitNode>[] = [
      {
        id: "name",
        header: t(`${prefix}.col_unit`),
        sortable: true,
        sortValue: (n) => n.name.toLowerCase(),
        cell: (n) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-strong">
              {n.name}
            </p>
            {n.code ? (
              <p className="mt-0.5 truncate font-mono text-[11px] text-text-muted">
                {n.code}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "type",
        header: t(`${prefix}.col_type`),
        sortable: true,
        sortValue: (n) => n.unit_type,
        cell: (n) => (
          <span className="inline-flex items-center rounded-full bg-m3-surface-container px-2.5 py-1 text-xs text-m3-on-surface-variant">
            {t(`${prefix}.unit_types.${n.unit_type}`, {
              defaultValue: n.unit_type,
            })}
          </span>
        ),
      },
    ];
    if (courseCounts) {
      cols.push({
        id: "courses",
        header: t(`${prefix}.col_courses`),
        align: "left",
        sortable: true,
        sortValue: (n) => courseCounts.get(n.id) ?? 0,
        cell: (n) => <Count value={courseCounts.get(n.id) ?? 0} warnOnZero />,
      });
    }
    if (peopleCounts) {
      cols.push({
        id: "people",
        header: t(`${prefix}.col_people`),
        align: "left",
        sortable: true,
        sortValue: (n) => peopleCounts.get(n.id) ?? 0,
        cell: (n) => <Count value={peopleCounts.get(n.id) ?? 0} warnOnZero />,
      });
    }
    return cols;
  }, [t, courseCounts, peopleCounts]);

  return (
    <DataTable
      key={tableKey}
      columns={columns}
      data={filtered}
      getRowId={(n) => n.id}
      getSubRows={(n) => (n.children.length ? n.children : undefined)}
      defaultExpanded
      onRowClick={onSelect}
      rowClassName={(n) => (n.id === selectedId ? "bg-m3-primary-fixed" : undefined)}
      actions={actions}
      actionsHeader={t(`${prefix}.col_actions`)}
      loading={loading}
      emptyState={needle ? t(`${prefix}.empty_search`) : emptyState}
      toolbar={
        <DataTableToolbar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder={t(`${prefix}.search_placeholder`)}
        />
      }
    />
  );
}

/** Highlight empty Faculties as setup work still to be completed. */
function Count({ value, warnOnZero }: { value: number; warnOnZero?: boolean }) {
  if (value === 0 && warnOnZero) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
        0
      </span>
    );
  }
  return (
    <span className="text-sm tabular-nums text-text-strong">{value}</span>
  );
}

/** Ids of every node in a (possibly filtered) tree — re-exported for callers. */
export { collectTreeIds };

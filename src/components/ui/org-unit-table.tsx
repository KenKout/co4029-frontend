import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useFormatDate } from "@/lib/format/date";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { collectTreeIds, filterTree } from "@/lib/tree-filter";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import { Building2 } from "lucide-react";

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
  /** Optional contextual marker beside a Faculty name (for example, the caller's Dean scope). */
  nameAdornment?: (node: OrgUnitNode) => ReactNode;
  /** `{unitId: count}` for the Courses column. Omit to hide the column. */
  courseCounts?: Map<string, number>;
  /** `{unitId: count}` for the People column. Omit to hide the column. */
  peopleCounts?: Map<string, number>;
  /** `{unitId: count}` for the Programs column. Omit to hide the column. */
  programCounts?: Map<string, number>;
  emptyState?: ReactNode;
  loading?: boolean;
  /** Disable tree expanders for screens that intentionally show Faculties as a flat list. */
  hierarchical?: boolean;
}

export function OrgUnitTable({
  nodes,
  selectedId,
  onSelect,
  actions,
  nameAdornment,
  courseCounts,
  peopleCounts,
  programCounts,
  emptyState,
  loading,
  hierarchical,
}: OrgUnitTableProps) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const [query, setQuery] = useState("");
  const prefix = "management_org_units";
  const usesHierarchy =
    hierarchical ?? nodes.some((node) => node.children.length > 0);

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
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
              <Building2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold text-text-strong">
                  {n.name}
                </p>
                {nameAdornment?.(n)}
              </div>
              {n.code ? (
                <p className="mt-0.5 truncate font-mono text-[11px] text-text-muted">
                  {n.code}
                </p>
              ) : null}
            </div>
          </div>
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
    if (programCounts) {
      cols.push({
        id: "programs",
        header: t(`${prefix}.col_programs`),
        align: "left",
        sortable: true,
        sortValue: (n) => programCounts.get(n.id) ?? 0,
        cell: (n) => <Count value={programCounts.get(n.id) ?? 0} />,
      });
    }
    cols.push({
      id: "created_at",
      header: t(`${prefix}.col_created`),
      align: "left",
      sortable: true,
      sortValue: (n) => n.created_at,
      cell: (n) => (
        <span className="whitespace-nowrap text-xs text-text-muted">
          {formatDate(n.created_at)}
        </span>
      ),
    });
    return cols;
  }, [t, courseCounts, peopleCounts, programCounts, formatDate, nameAdornment]);

  return (
    <DataTable
      key={tableKey}
      columns={columns}
      data={filtered}
      getRowId={(n) => n.id}
      getSubRows={
        usesHierarchy
          ? (n) => (n.children.length ? n.children : undefined)
          : undefined
      }
      defaultExpanded={usesHierarchy}
      onRowClick={onSelect}
      rowClassName={(n) =>
        n.id === selectedId ? "bg-m3-primary-fixed" : undefined
      }
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
  return <span className="text-sm tabular-nums text-text-strong">{value}</span>;
}

/** Ids of every node in a (possibly filtered) tree — re-exported for callers. */
export { collectTreeIds };

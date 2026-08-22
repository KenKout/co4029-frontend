import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";

/**
 * Expand/collapse tree over the org-unit hierarchy.
 *
 * Kept in `components/ui` rather than beside one page because it serves two
 * jobs that must stay visually identical: the management screen where units
 * are created, renamed and moved, and the compact scope picker that filters
 * courses and users. A second implementation would drift.
 *
 * Expansion state is local and keyed by unit id. Roots start expanded so the
 * first paint shows structure rather than a wall of collapsed rows; deeper
 * levels start closed so a large org does not dump hundreds of nodes at once.
 *
 * Selection is controlled by the caller (`selectedId` / `onSelect`) because
 * both uses drive something outside the tree — a detail pane, or a filtered
 * list — and neither wants the tree owning that state.
 */
export interface OrgUnitTreeProps {
  nodes: OrgUnitNode[];
  selectedId?: string | null;
  onSelect?: (node: OrgUnitNode) => void;
  /** Extra controls rendered at the right of a row (edit / move / delete). */
  renderActions?: (node: OrgUnitNode) => ReactNode;
  /** Compact density for the filter popover. */
  compact?: boolean;
  /** Rendered when `nodes` is empty. */
  emptyState?: ReactNode;
  className?: string;
}

export function OrgUnitTree({
  nodes,
  selectedId,
  onSelect,
  renderActions,
  compact = false,
  emptyState,
  className,
}: OrgUnitTreeProps) {
  const rootIds = useMemo(() => nodes.map((n) => n.id), [nodes]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(rootIds),
  );

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (nodes.length === 0) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <ul className={cn("space-y-0.5", className)} role="tree">
      {nodes.map((node) => (
        <OrgUnitTreeNode
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          selectedId={selectedId}
          onSelect={onSelect}
          renderActions={renderActions}
          compact={compact}
        />
      ))}
    </ul>
  );
}

function OrgUnitTreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  renderActions,
  compact,
}: {
  node: OrgUnitNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId?: string | null;
  onSelect?: (node: OrgUnitNode) => void;
  renderActions?: (node: OrgUnitNode) => ReactNode;
  compact: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-lg pr-2",
          compact ? "py-1" : "py-1.5",
          isSelected
            ? "bg-m3-primary-fixed"
            : "hover:bg-m3-surface-container-low",
        )}
        // Indent scales with depth. Applied as padding on the row (not a
        // margin on the <li>) so the hover/selected background still spans
        // the full width at every level.
        style={{ paddingLeft: `${depth * (compact ? 14 : 18) + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="shrink-0 rounded p-0.5 hover:bg-m3-surface-container"
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-m3-on-surface-variant transition-transform",
                isOpen && "rotate-90",
              )}
            />
          </button>
        ) : (
          // Keeps leaf labels aligned with their expandable siblings.
          <span className="inline-block w-[1.125rem] shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect?.(node)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span
            className={cn(
              "truncate",
              compact ? "text-xs" : "text-sm",
              isSelected
                ? "font-semibold text-m3-primary"
                : "text-text-strong",
            )}
          >
            {node.name}
          </span>
          {node.code ? (
            <span className="shrink-0 font-mono text-[10px] text-text-muted">
              {node.code}
            </span>
          ) : null}
          <span className="shrink-0 rounded-full bg-m3-surface-container px-1.5 py-px text-[10px] text-m3-on-surface-variant">
            {node.unit_type}
          </span>
        </button>

        {renderActions ? (
          // Hidden until hover/focus so a deep tree is readable, but always
          // shown on the selected row — otherwise the row you are acting on
          // loses its controls the moment the pointer leaves.
          <div
            className={cn(
              "shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
              isSelected && "opacity-100",
            )}
          >
            {renderActions(node)}
          </div>
        ) : null}
      </div>

      {hasChildren && isOpen ? (
        <ul role="group" className="space-y-0.5">
          {node.children.map((child) => (
            <OrgUnitTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              renderActions={renderActions}
              compact={compact}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Flatten a tree to `[{id, name, depth}]` for a parent `<Select>`. */
export function flattenOrgUnits(
  nodes: OrgUnitNode[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenOrgUnits(node.children, depth + 1),
  ]);
}

/**
 * Ids of `unitId` and everything under it.
 *
 * The parent picker uses this to exclude a unit's own subtree from the list
 * of candidate parents — the backend rejects such a move as a cycle, and
 * offering an option that always errors is worse than not offering it.
 */
export function subtreeIds(nodes: OrgUnitNode[], unitId: string): Set<string> {
  const found = findNode(nodes, unitId);
  if (!found) return new Set();
  const ids = new Set<string>();
  const walk = (node: OrgUnitNode) => {
    ids.add(node.id);
    node.children.forEach(walk);
  };
  walk(found);
  return ids;
}

export function findNode(
  nodes: OrgUnitNode[],
  unitId: string,
): OrgUnitNode | null {
  for (const node of nodes) {
    if (node.id === unitId) return node;
    const hit = findNode(node.children, unitId);
    if (hit) return hit;
  }
  return null;
}

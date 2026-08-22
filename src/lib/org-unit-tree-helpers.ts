import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";

/**
 * Pure helpers for walking the org-unit tree.
 *
 * Split out of the former `OrgUnitTree` component when the tree UI was
 * replaced by `OrgUnitTable`: these are used by the create/edit dialog and
 * the page controller, none of which render a tree.
 */

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

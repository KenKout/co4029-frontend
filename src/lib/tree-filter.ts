/**
 * Search a real hierarchy without losing the path to a match.
 *
 * A flat `.filter()` over the roots is wrong for a tree whose parents are real
 * entities: searching "Computer Science" would drop it entirely when it lives
 * under "Engineering", because the root does not match.
 *
 * The rule is the standard tree prune:
 *
 *   keep a node if it matches, OR any descendant matches
 *   — and keep the ancestor chain of every match, so the path stays reachable.
 *
 * Note this is NOT how the admin settings table filters. There the hierarchy is
 * synthetic — flat settings are filtered first, then grouped, so parents exist
 * only if a child survived. Nothing has to be preserved because nothing real
 * was removed. An org unit is a row in its own right, so it does.
 *
 * Returns pruned COPIES; the input is never mutated.
 */
export function filterTree<T>(
  nodes: T[],
  getChildren: (node: T) => T[],
  withChildren: (node: T, children: T[]) => T,
  matches: (node: T) => boolean,
): T[] {
  const out: T[] = [];
  for (const node of nodes) {
    const keptChildren = filterTree(
      getChildren(node),
      getChildren,
      withChildren,
      matches,
    );
    // A matching node keeps its ENTIRE subtree, not just matching descendants:
    // having found "Engineering", the user wants to see what is inside it.
    if (matches(node)) {
      out.push(node);
    } else if (keptChildren.length > 0) {
      out.push(withChildren(node, keptChildren));
    }
  }
  return out;
}

/**
 * Ids of every node in `nodes` — what a filtered tree must auto-expand.
 *
 * After a prune the surviving branches are only useful if they are open;
 * leaving the user to expand three levels by hand to reach the one match
 * defeats the search.
 */
export function collectTreeIds<T>(
  nodes: T[],
  getChildren: (node: T) => T[],
  getId: (node: T) => string,
): string[] {
  const ids: string[] = [];
  const walk = (list: T[]) => {
    for (const node of list) {
      ids.push(getId(node));
      walk(getChildren(node));
    }
  };
  walk(nodes);
  return ids;
}

import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import { WORLD_W } from "./constants";
import type { KgVec } from "./types";

/**
 * Hierarchical (tree) layout in world space, extracted verbatim from the former
 * 863-line knowledge-graph-detail.tsx and split into the four passes it always
 * ran: adjacency → BFS depths → depth bands → orphan row.
 *
 * The heaviest concept (nodes[0]) is the root, placed at the top-centre. Rank 2
 * is every node directly connected to the root; rank 3 is their neighbours; and
 * so on — a breadth-first spanning tree over the graph, expanding vertically
 * downward. Adjacency is UNDIRECTED and spans BOTH edge kinds (PREREQUISITE_OF
 * and RELATED_TO), so a node lands one rank below whatever first connects it to
 * the root regardless of edge direction. (Edges are still colour-coded when
 * drawn; the direction just doesn't gate the ranking.)
 *
 * Edge cases (see the chat thread — these are the ones that actually occur in
 * the KG data):
 *  - CYCLES / MULTIPLE PARENTS: BFS first-visit-wins means each node is placed
 *    exactly once at its shortest hop-distance from the root, so a cycle can't
 *    loop forever and a node with several connections sits under whichever
 *    neighbour reached it first (its shortest path to the root).
 *  - FOREST / disconnected components (nodes with edges among themselves but
 *    unreachable from the root): after the root's BFS, any still-unplaced
 *    edge-bearing node is seeded as a local root and laid out in the same rank
 *    bands, so whole sub-graphs hang below the main tree instead of vanishing.
 *  - ORPHANS (no edges of any kind): parked in a row along the very bottom as
 *    leaves, per the requested behaviour — present but clearly peripheral.
 */

const LEVEL_GAP = 190;
const NODE_GAP = 240;
const TOP_MARGIN = 120;

interface Adjacency {
  adj: Map<string, string[]>;
  hasAnyEdge: Set<string>;
}

/**
 * UNDIRECTED adjacency over ALL edges. The tree is a breadth-first spanning
 * tree rooted at the heaviest node: whatever touches the root (in either
 * direction, prerequisite OR related) lands on the next rank, and so on
 * outward. Using prereq-direction only was the bug — if the root wasn't a
 * prerequisite *source* (e.g. a hub other concepts point to, or one whose
 * links are mostly RELATED_TO), its rank-2 was empty and the tree collapsed.
 */
function buildAdjacency(
  ids: string[],
  edges: LessonKnowledgeGraph["edges"],
): Adjacency {
  const idSet = new Set(ids);
  const adj = new Map<string, string[]>();
  const hasAnyEdge = new Set<string>();
  const addAdj = (a: string, b: string) => {
    const list = adj.get(a) ?? [];
    list.push(b);
    adj.set(a, list);
  };
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    hasAnyEdge.add(e.source);
    hasAnyEdge.add(e.target);
    addAdj(e.source, e.target);
    addAdj(e.target, e.source);
  }
  return { adj, hasAnyEdge };
}

interface Depths {
  depth: Map<string, number>;
  placed: Set<string>;
}

/**
 * Assign each node a depth = shortest hop-distance from a root via BFS. First
 * visit wins (standard BFS = shortest path), so each node sits one rank below
 * whichever neighbour reached it first. BFS from the heaviest node, then seed
 * any still-unplaced edge-bearing node as a local root so disconnected
 * sub-graphs still get laid out instead of vanishing.
 */
function assignDepths(
  ids: string[],
  adj: Map<string, string[]>,
  hasAnyEdge: Set<string>,
): Depths {
  const depth = new Map<string, number>();
  const placed = new Set<string>();
  const bfs = (start: string) => {
    if (placed.has(start)) return;
    placed.add(start);
    depth.set(start, 0);
    const queue: Array<{ id: string; d: number }> = [{ id: start, d: 0 }];
    while (queue.length) {
      const { id, d } = queue.shift()!;
      for (const nb of adj.get(id) ?? []) {
        if (placed.has(nb)) continue;
        placed.add(nb);
        depth.set(nb, d + 1);
        queue.push({ id: nb, d: d + 1 });
      }
    }
  };

  bfs(ids[0]);
  // Forest: remaining nodes that still have edges become local roots, in the
  // node list's (weight-sorted) order for determinism.
  for (const id of ids) {
    if (!placed.has(id) && hasAnyEdge.has(id)) bfs(id);
  }
  return { depth, placed };
}

interface DepthBands {
  byDepth: Map<number, string[]>;
  maxDepth: number;
}

/** Group placed nodes by depth to lay out level bands. */
function groupByDepth(
  ids: string[],
  placed: Set<string>,
  depth: Map<string, number>,
): DepthBands {
  const byDepth = new Map<number, string[]>();
  let maxDepth = 0;
  for (const id of ids) {
    if (!placed.has(id)) continue;
    const d = depth.get(id) ?? 0;
    maxDepth = Math.max(maxDepth, d);
    const row = byDepth.get(d) ?? [];
    row.push(id);
    byDepth.set(d, row);
  }
  return { byDepth, maxDepth };
}

/** Width of the widest band drives horizontal centring of every band. */
function widestBand(byDepth: Map<number, string[]>): number {
  let widest = 1;
  for (const [, row] of byDepth) widest = Math.max(widest, row.length);
  return widest;
}

function placeBands(
  positions: Map<string, KgVec>,
  { byDepth, maxDepth }: DepthBands,
): void {
  const cx = WORLD_W / 2;
  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth.get(d) ?? [];
    const rowWidth = (row.length - 1) * NODE_GAP;
    const startX = cx - rowWidth / 2;
    row.forEach((id, i) => {
      positions.set(id, {
        x: row.length === 1 ? cx : startX + i * NODE_GAP,
        y: TOP_MARGIN + d * LEVEL_GAP,
      });
    });
  }
}

/**
 * Orphan row: one level below the deepest tree band, wrapped so a big pile of
 * orphans doesn't run off the sides.
 */
function placeOrphans(
  positions: Map<string, KgVec>,
  orphans: string[],
  widest: number,
  maxDepth: number,
): void {
  if (orphans.length === 0) return;
  const cx = WORLD_W / 2;
  const perRow = Math.max(1, Math.min(orphans.length, widest, 10));
  const baseY = TOP_MARGIN + (maxDepth + 1.4) * LEVEL_GAP;
  orphans.forEach((id, i) => {
    const col = i % perRow;
    const rowN = Math.floor(i / perRow);
    const rowCount = Math.min(perRow, orphans.length - rowN * perRow);
    const rowWidth = (rowCount - 1) * NODE_GAP;
    const startX = cx - rowWidth / 2;
    positions.set(id, {
      x: rowCount === 1 ? cx : startX + col * NODE_GAP,
      y: baseY + rowN * LEVEL_GAP,
    });
  });
}

export function layoutTree(
  nodes: LessonKnowledgeGraph["nodes"],
  edges: LessonKnowledgeGraph["edges"],
): Map<string, KgVec> {
  const positions = new Map<string, KgVec>();
  if (nodes.length === 0) return positions;

  const ids = nodes.map((n) => n.id);
  const { adj, hasAnyEdge } = buildAdjacency(ids, edges);
  const { depth, placed } = assignDepths(ids, adj, hasAnyEdge);

  // Orphans: no edges at all → a row along the bottom.
  const orphans = ids.filter((id) => !hasAnyEdge.has(id));

  const bands = groupByDepth(ids, placed, depth);
  placeBands(positions, bands);
  placeOrphans(positions, orphans, widestBand(bands.byDepth), bands.maxDepth);

  return positions;
}

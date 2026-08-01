import { cn } from "@/lib/utils";

import type { KgNodeById, KgNodeDatum } from "./types";

/**
 * One labelled row of neighbour chips (prerequisites / unlocks / related) inside
 * the relationship popup. Clicking a chip jumps the camera to that concept.
 * Extracted verbatim from the former 863-line knowledge-graph-detail.tsx.
 */
export function KgRelationGroup({
  label,
  ids,
  nodeById,
  tone,
  onJump,
  emptyLabel,
}: {
  label: string;
  ids: string[];
  nodeById: KgNodeById;
  tone: "amber" | "slate";
  onJump: (id: string) => void;
  emptyLabel: string;
}) {
  // De-dupe (a concept can be reachable by more than one edge) and resolve to
  // labels, dropping ids we don't have a node for (out-of-window neighbours).
  const items = Array.from(new Set(ids))
    .map((id) => nodeById.get(id))
    .filter((n): n is KgNodeDatum => !!n);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs italic text-m3-on-surface-variant/70">
          {emptyLabel}
        </p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onJump(n.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                tone === "amber"
                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
              )}
            >
              {n.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

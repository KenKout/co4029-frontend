import type { KgPreviewNodeDatum } from "./kg-preview-helpers";

/**
 * Floating detail card for the hovered concept. Extracted verbatim from the
 * former 1422-line material-hub.tsx.
 */
export function KgPreviewHoverCard({ node }: { node: KgPreviewNodeDatum }) {
  return (
    <div className="absolute top-2 left-2 max-w-[70%] rounded-lg bg-m3-surface-container-high/95 backdrop-blur px-3 py-2 shadow-lg pointer-events-none">
      <p className="text-xs font-bold text-m3-on-surface">{node.label}</p>
      <p className="text-[10px] text-m3-secondary font-semibold uppercase tracking-wide">
        {node.type}
      </p>
      {node.definition && (
        <p className="text-[10px] text-m3-on-surface-variant mt-0.5 line-clamp-3">
          {node.definition}
        </p>
      )}
    </div>
  );
}

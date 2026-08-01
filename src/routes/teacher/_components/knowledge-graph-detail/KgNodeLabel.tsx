import { cn } from "@/lib/utils";

/**
 * Concept caption under a node. Long labels are ellipsised at 28 characters so
 * a dense cluster stays readable. Extracted verbatim from the former 863-line
 * knowledge-graph-detail.tsx.
 */
export function KgNodeLabel({
  r,
  label,
  isCenter,
  isActive,
}: {
  /** World radius of the node the label sits under. */
  r: number;
  label: string;
  isCenter: boolean;
  isActive: boolean;
}) {
  return (
    <text
      y={r + 14}
      textAnchor="middle"
      fontSize={13}
      fontWeight={isActive || isCenter ? 700 : 600}
      fill="currentColor"
      className={cn(
        "pointer-events-none",
        isActive ? "text-m3-on-surface" : "text-m3-on-surface-variant",
      )}
    >
      {label.length > 28 ? `${label.slice(0, 27)}…` : label}
    </text>
  );
}

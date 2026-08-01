import { cn } from "@/lib/utils";

import type { KgNodePosition } from "./types";

/**
 * Caption under a preview node, truncated at 18 characters. Extracted verbatim
 * from the former 1422-line material-hub.tsx.
 */
export function KgPreviewNodeLabel({
  p,
  label,
  isHovered,
}: {
  p: KgNodePosition;
  label: string;
  isHovered: boolean;
}) {
  return (
    <text
      x={p.x}
      y={p.y + p.r + 9}
      textAnchor="middle"
      fontSize={isHovered ? "9" : "8"}
      fontWeight={isHovered ? "700" : "600"}
      fill="currentColor"
      className={cn(
        "pointer-events-none",
        isHovered ? "text-m3-on-surface" : "text-m3-on-surface-variant",
      )}
    >
      {label.length > 18 ? `${label.slice(0, 17)}…` : label}
    </text>
  );
}

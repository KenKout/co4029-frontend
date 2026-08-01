import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOURCE_META } from "./constants";
import type { ResolutionLayer } from "./types";

/** One rung of the resolution chain inside the popover; `isWinner` is lit. */
export function ResolutionLayerRow({
  layer,
  isWinner,
}: {
  layer: ResolutionLayer;
  isWinner: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5",
        isWinner
          ? "bg-m3-primary/10 ring-1 ring-m3-primary/30"
          : layer.present
            ? ""
            : "opacity-45",
      )}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            SOURCE_META[layer.source].dot,
          )}
        />
        <span
          className={cn(
            isWinner ? "font-semibold text-slate-900" : "text-slate-600",
          )}
        >
          {layer.name}
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-slate-700">
          {layer.present ? String(layer.value) : "—"}
        </span>
        {isWinner && <Check className="h-3.5 w-3.5 text-m3-primary" />}
      </span>
    </li>
  );
}

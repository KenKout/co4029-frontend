import { Check, TriangleAlert } from "lucide-react";
import type { SectionStatus } from "./types";

export function StatusAffix({ status }: { status: SectionStatus }) {
  if (status.kind === "none") return null;

  if (status.kind === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {status.label}
          {status.srLabel && (
            <span className="sr-only"> — {status.srLabel}</span>
          )}
        </span>
      </span>
    );
  }

  if (status.kind === "warning") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {status.label}
          {status.srLabel && (
            <span className="sr-only"> — {status.srLabel}</span>
          )}
        </span>
      </span>
    );
  }

  // info — neutral, no icon
  return (
    <span className="text-m3-on-surface-variant">
      <span aria-hidden="true">· </span>
      {status.label}
      {status.srLabel && <span className="sr-only"> — {status.srLabel}</span>}
    </span>
  );
}

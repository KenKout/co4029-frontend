import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Multi-line counterpart to `ui/input.tsx`, carrying the same border, radius,
 * hover and focus language. Before this existed, every page hand-rolled the
 * class string (`rounded-xl border border-m3-outline-variant/20 bg-m3-surface
 * px-3 py-2.5 …`), so textareas drifted from the inputs beside them — a
 * near-invisible /20 border, no hover feedback, and a focus ring that didn't
 * match the field above it.
 *
 * No `size` token: a textarea's height comes from `rows`.
 */
function Textarea({
  className,
  rows = 4,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(
        "w-full min-w-0 resize-none rounded-xl border border-m3-outline-variant/60 bg-m3-surface px-3 py-2.5 text-sm leading-relaxed text-m3-on-surface",
        "transition-colors outline-none",
        "placeholder:text-m3-on-surface-variant/50",
        "hover:border-m3-primary/70 hover:bg-m3-primary/[0.04] hover:shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
        "focus-visible:border-m3-primary/60 focus-visible:bg-m3-surface focus-visible:ring-2 focus-visible:ring-m3-secondary/30",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        "disabled:cursor-not-allowed disabled:bg-m3-surface-container disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Shared surface and responsive inset for every main lesson-editor section. */
export function LessonEditorSection({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "space-y-5 rounded-2xl border border-m3-outline-variant/20 bg-card p-5 shadow-sm sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CourseTabPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

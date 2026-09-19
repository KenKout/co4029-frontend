import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StudentPageProps {
  children: ReactNode;
  className?: string;
}

/** Shared canvas for the primary student routes. AppShell owns the viewport
 * padding; this component keeps their usable width and vertical rhythm equal. */
export function StudentPage({ children, className }: StudentPageProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl space-y-6 pb-20 sm:space-y-8 sm:pb-28",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface StudentPageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Consistent title scale, colour, and mobile stacking for student pages. */
export function StudentPageHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  action,
  className,
}: StudentPageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <div className="mb-3">{eyebrow}</div> : null}
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="mt-1 shrink-0 text-m3-primary">{icon}</div>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-headline text-3xl font-bold leading-tight tracking-tight text-m3-on-surface sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-m3-on-surface-variant sm:text-lg">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

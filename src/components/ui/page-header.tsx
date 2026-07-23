import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** The page title (already translated). Rendered as the h1. */
  title: string;
  /** Optional supporting line beneath the title. */
  subtitle?: string;
  /** Optional back-navigation target. When set, a ghost back arrow is shown
      to the left of the title. */
  backTo?: string;
  /** Optional right-aligned action slot (e.g. a primary button). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standard top-of-page header for primary route pages (Overview, My Courses,
 * Students, Department Courses, Career Paths, …). Single source of truth so
 * every page's h1 shares the same size / weight / colour and the same
 * back-button + action layout. Distinct from SectionHeader, which titles
 * in-page sections (h2).
 */
export function PageHeader({
  title,
  subtitle,
  backTo,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {backTo && (
          <Link to={backTo} className="shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-headline font-bold text-m3-primary tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-m3-on-surface-variant mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

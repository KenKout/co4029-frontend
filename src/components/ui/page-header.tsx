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
      to the left of the title. Ignored when `onBack` is provided. */
  backTo?: string;
  /** Path params for `backTo` when it is a param route (e.g.
      "/teacher/courses/$courseId" needs `{ courseId }`). Ignored without
      `backTo`. Untyped on purpose: route-tree types are not generated in this
      repo, so a typed params object cannot be expressed here. */
  backParams?: Record<string, string>;
  /** Optional history-aware back handler. Use this (instead of `backTo`) when
      the page needs custom back logic (e.g. router.history.back() with a
      dashboard/settings fallback for deep-links). Renders the same ghost
      back arrow but calls this handler on click. */
  onBack?: () => void;
  /** Accessible label for the back control (defaults to "Back"). */
  backLabel?: string;
  /** Optional right-aligned action slot (e.g. a primary button). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standard top-of-page header for primary route pages (Overview, My Courses,
 * Students, Department Courses, Career Paths, Settings, …). Single source of
 * truth so every page's h1 shares the same size / weight / colour and the same
 * back-button + action layout. Distinct from SectionHeader, which titles
 * in-page sections (h2).
 */
export function PageHeader({
  title,
  subtitle,
  backTo,
  backParams,
  onBack,
  backLabel,
  action,
  className,
}: PageHeaderProps) {
  const backControl = onBack ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={onBack}
      aria-label={backLabel ?? "Back"}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  ) : backTo ? (
    <Link
      to={backTo}
      params={backParams}
      className="shrink-0"
      aria-label={backLabel ?? "Back"}
    >
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {backControl}
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

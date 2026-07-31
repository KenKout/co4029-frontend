import { cn } from "@/lib/utils";

/**
 * A vertical stack of loading-skeleton bars — the "N pulsing rows" idiom that
 * was hand-inlined in ~20 route files as
 * `{[1,2,3].map((i) => <div className="h-16 ... animate-pulse rounded-xl" />)}`.
 *
 * Props mirror the small variations those copies had:
 *   - `rows`   — how many bars (default 3)
 *   - `height` — Tailwind height class for each bar (default "h-16")
 *   - `rounded`— corner radius class (default "rounded-xl")
 *   - `bg`     — background class (default "bg-m3-surface-container"; some
 *                pages used "bg-surface-muted")
 *   - `gap`    — vertical gap class on the wrapper (default "space-y-3")
 *
 * For anything more elaborate than uniform bars (cards with an aspect-video
 * header, grids, etc.) keep a bespoke skeleton — this only covers the uniform
 * stacked-rows case.
 */
export function PageSkeleton({
  rows = 3,
  height = "h-16",
  rounded = "rounded-xl",
  bg = "bg-m3-surface-container",
  gap = "space-y-3",
  className,
}: {
  rows?: number;
  height?: string;
  rounded?: string;
  bg?: string;
  gap?: string;
  className?: string;
}) {
  return (
    <div className={cn(gap, className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn(height, bg, rounded, "animate-pulse")} />
      ))}
    </div>
  );
}

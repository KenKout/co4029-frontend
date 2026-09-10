/**
 * Courses loading placeholder — pulsing cards (grid mode) or pulsing rows
 * (list mode), so the page doesn't reflow when loading finishes.
 */
export function CoursesGridSkeleton({ viewMode }: { viewMode?: "card" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl ghost-border p-3"
          >
            <div className="h-16 w-28 shrink-0 animate-pulse rounded-lg bg-m3-surface-container" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-m3-surface-container" />
              <div className="h-2 w-1/3 animate-pulse rounded-full bg-m3-surface-container" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl ghost-border">
          <div className="aspect-video animate-pulse bg-m3-surface-container" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-m3-surface-container" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-m3-surface-container" />
          </div>
        </div>
      ))}
    </div>
  );
}

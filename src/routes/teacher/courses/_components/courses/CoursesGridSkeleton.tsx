/**
 * Courses grid loading placeholder — six pulsing cards. Extracted verbatim from
 * the former 234-line courses.tsx.
 */
export function CoursesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl ghost-border overflow-hidden">
          <div className="aspect-video bg-m3-surface-container animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-m3-surface-container animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-m3-surface-container animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

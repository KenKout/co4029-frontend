/**
 * Roster loading placeholder — four pulsing rows, extracted verbatim from the
 * former 658-line course-students.tsx.
 */
export function RosterSkeleton() {
  return (
    <div className="space-y-px">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="px-5 py-4 animate-pulse flex gap-4 items-center"
        >
          <div className="w-10 h-10 rounded-full bg-m3-surface-container-high shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-m3-surface-container-high rounded w-1/3" />
            <div className="h-2 bg-m3-surface-container-high rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

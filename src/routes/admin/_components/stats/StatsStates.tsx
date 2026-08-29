import { PageHeading } from "./PageHeading";

/** Skeleton shown while the dashboard query is in flight. */
export function StatsSkeleton() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeading />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-surface-muted"
          />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
    </div>
  );
}

/*
 * There is deliberately no whole-page error state any more. A dashboard that
 * replaces five working panels with one error message because the sixth query
 * failed hides exactly the context an operator needs mid-incident, so each row
 * renders its own `SectionErrorBox` instead (PRD ADM-015).
 */

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

/** Shown when the dashboard query fails outright. */
export function StatsLoadError({ message }: { message: string }) {
  return (
    <div className="space-y-6 pb-12">
      <PageHeading />
      <div className="rounded-lg border border-border bg-surface-elev p-5">
        <p className="text-sm text-danger">{message}</p>
      </div>
    </div>
  );
}

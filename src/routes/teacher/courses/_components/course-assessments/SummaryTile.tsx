import type { Users } from "lucide-react";

/**
 * One summary tile of the Assessments header strip. Moved verbatim out of the
 * former 458-line course-assessments.tsx, where it was a file-local component
 * below the page.
 */
export function SummaryTile({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  loading?: boolean;
  tone?: "emerald" | "default";
}) {
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-start gap-3">
      <div
        className={
          tone === "emerald"
            ? "p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"
            : "p-2 rounded-lg bg-m3-primary-fixed text-m3-primary shrink-0"
        }
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-headline font-black text-m3-on-surface">
          {loading ? "…" : value}
        </div>
        <div className="text-[11px] text-m3-on-surface-variant font-bold uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  );
}

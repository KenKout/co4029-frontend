import type { StudentPathProgressAuthoring } from "@/lib/api/types";

/** One row of the read-only progress table. */
export function ProgressRow({ row }: { row: StudentPathProgressAuthoring }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_180px] gap-4 px-5 py-3 items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium text-m3-on-surface truncate">
          {row.student_email}
        </p>
        <p className="text-[11px] font-mono text-m3-on-surface-variant truncate mt-0.5">
          {row.student_id}
        </p>
      </div>
      <span className="text-xs text-m3-on-surface font-semibold">
        {row.completed_courses}/{row.course_count}
      </span>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-m3-on-surface-variant">
            {Math.round(row.overall_percent)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-m3-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-m3-primary transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, row.overall_percent))}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

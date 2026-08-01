import type { EnrollmentAuthoring } from "@/lib/api/types";
import { formatDate } from "./helpers";
import { RosterRowActions } from "./RosterRowActions";
import type { RosterTabController } from "./use-roster-tab";

/** One enrolled student: identity, status, source, enrol date and row actions. */
export function RosterRow({
  row,
  controller,
}: {
  row: EnrollmentAuthoring;
  controller: RosterTabController;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_120px_100px] gap-4 px-5 py-3 items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium text-m3-on-surface truncate">
          {row.display_name || row.primary_email || row.student_id}
        </p>
        {row.display_name && row.primary_email && (
          <p className="text-xs text-m3-on-surface-variant truncate">
            {row.primary_email}
          </p>
        )}
      </div>
      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md w-fit">
        {row.status}
      </span>
      <span className="text-xs text-m3-on-surface-variant">{row.source}</span>
      <span className="text-xs text-m3-on-surface-variant">
        {formatDate(row.enrolled_at)}
      </span>
      <RosterRowActions studentId={row.student_id} controller={controller} />
    </div>
  );
}

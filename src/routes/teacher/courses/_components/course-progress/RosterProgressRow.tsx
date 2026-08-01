import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";

import { GradientProgress } from "@/components/ui/gradient-progress";

import { formatHours } from "./helpers";
import { RosterStatusBadge } from "./RosterStatusBadge";
import type { AtRiskMap, ProgressRow } from "./types";

/**
 * One roster progress row — name/email, lessons done, the completion bar, time
 * spent and the status pill. Extracted verbatim from the former 401-line
 * course-progress.tsx, including the grid template it shares with the header.
 */
export function RosterProgressRow({
  row,
  courseId,
  atRiskById,
}: {
  row: ProgressRow;
  courseId: string;
  atRiskById: AtRiskMap;
}) {
  const isAtRisk = atRiskById.has(row.user_id);
  const isComplete = row.completion_percent >= 100;
  const isStarted = row.completed_lessons > 0 || row.in_progress_lessons > 0;
  return (
    <Link
      to="/teacher/courses/$courseId/students/$studentId"
      params={{ courseId, studentId: row.user_id }}
      className="grid grid-cols-[1fr_120px_140px_120px_100px] gap-4 items-center px-6 py-3 hover:bg-m3-surface-container-low transition-colors cursor-pointer"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {row.display_name}
        </p>
        {row.email && (
          <p className="text-xs text-m3-on-surface-variant truncate">
            {row.email}
          </p>
        )}
      </div>
      <span className="text-sm text-m3-on-surface-variant tabular-nums">
        {row.completed_lessons}/{row.total_lessons}
      </span>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[10px] font-bold tabular-nums text-m3-on-surface-variant">
          {row.completion_percent.toFixed(0)}%
        </span>
        <GradientProgress
          value={row.completion_percent}
          size="sm"
          variant="primary"
        />
      </div>
      <span className="text-xs text-m3-on-surface-variant inline-flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        {formatHours(row.total_time_seconds)}
      </span>
      <RosterStatusBadge
        isComplete={isComplete}
        isAtRisk={isAtRisk}
        isStarted={isStarted}
      />
    </Link>
  );
}

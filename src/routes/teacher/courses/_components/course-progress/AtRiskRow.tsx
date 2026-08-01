import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";

import type { AtRiskListRead } from "@/lib/api/types";

import { relDays } from "./helpers";
import type { StudentNameMap } from "./types";

/**
 * One at-risk student row — name, first reason, completion and days since last
 * engagement. Extracted verbatim from the former 401-line course-progress.tsx.
 */
export function AtRiskRow({
  student,
  courseId,
  studentNames,
}: {
  student: AtRiskListRead["students"][number];
  courseId: string;
  studentNames: StudentNameMap;
}) {
  const { t } = useTranslation();
  const s = student;
  const meta = studentNames.get(s.user_id);
  const days = relDays(s.days_since_last_engagement);
  return (
    <Link
      to="/teacher/courses/$courseId/students/$studentId"
      params={{ courseId, studentId: s.user_id }}
      className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-6 py-3 hover:bg-m3-surface-container-low transition-colors cursor-pointer"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {meta?.name ?? s.user_id.slice(0, 8)}
        </p>
        <p className="text-xs text-m3-on-surface-variant truncate">
          {s.reasons?.[0]?.detail ??
            s.reasons?.[0]?.code ??
            t("teacher_progress.no_reason")}
        </p>
      </div>
      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
        {Number(s.completion_percent).toFixed(0)}%
      </span>
      {days && (
        <span className="text-xs text-m3-on-surface-variant inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {days}
        </span>
      )}
    </Link>
  );
}

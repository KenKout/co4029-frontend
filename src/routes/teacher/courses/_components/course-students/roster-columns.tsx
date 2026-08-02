import type { TFunction } from "i18next";

import { avatarColor, avatarInitials } from "@/components/ui/avatar";
import type { DataTableColumn } from "@/components/ui/data-table";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { Clock } from "lucide-react";
import type { RosterStudent } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

import { ENROLL_META, RISK_META, RISK_SORT_ORDER } from "./constants";
import { relDate } from "./helpers";

/**
 * Roster table columns, in the repo's `build*Columns(deps)` factory shape (see
 * `at-risk-columns.tsx`, `users-columns.tsx`). Kept out of `RosterTable` so the
 * component body stays under the `max-lines-per-function` cap.
 *
 * Sorting notes:
 *   - `risk` sorts by RISK_SORT_ORDER, the same ranking the old hand-rolled
 *     comparator used, not alphabetical — `sortValue` may return any scalar;
 *   - direction is CONTROLLED by the page controller so progress / risk /
 *     last-active still open descending (the table's own cycle opens ascending).
 */
export function buildRosterColumns(
  t: TFunction,
): DataTableColumn<RosterStudent>[] {
  return [
    {
      id: "student",
      header: t("teacher_course_students.cols.student", {
        defaultValue: "Student",
      }),
      sortable: true,
      sortValue: (s) => s.display_name.toLocaleLowerCase(),
      cell: (student) => {
        const enroll =
          ENROLL_META[student.enrollment_status] ?? ENROLL_META.active;
        const initials = avatarInitials(student.display_name);
        const aColor = avatarColor(student.student_id);
        return (
          <div className="flex items-center gap-3 min-w-0">
            {student.avatar_url ? (
              <img
                src={student.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 uppercase",
                  aColor,
                )}
              >
                {initials || "?"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-m3-on-surface truncate">
                  {student.display_name}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                    enroll.badge,
                  )}
                >
                  {enroll.label}
                </span>
              </div>
              <p className="text-xs text-m3-on-surface-variant truncate mt-0.5">
                {student.primary_email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "progress",
      header: t("teacher_course_students.cols.progress", {
        defaultValue: "Progress",
      }),
      width: 130,
      sortable: true,
      sortValue: (s) => s.progress_percent,
      cell: (student) => (
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex justify-between text-[10px] font-medium text-m3-on-surface-variant">
            <span>{Math.round(student.progress_percent)}%</span>
          </div>
          <GradientProgress
            value={student.progress_percent}
            size="sm"
            variant="primary"
          />
        </div>
      ),
    },
    {
      id: "risk",
      header: t("teacher_course_students.cols.risk", { defaultValue: "Risk" }),
      width: 100,
      sortable: true,
      // Same ranking the old hand-rolled comparator used, not alphabetical.
      sortValue: (s) =>
        RISK_SORT_ORDER[s.at_risk_level as keyof typeof RISK_SORT_ORDER] ?? 0,
      cell: (student) => {
        const risk = RISK_META[student.at_risk_level] ?? RISK_META.none;
        return (
          <span
            className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full",
              risk.badge,
            )}
          >
            {risk.label}
          </span>
        );
      },
    },
    {
      id: "last_active",
      header: t("teacher_course_students.cols.active", {
        defaultValue: "Active",
      }),
      width: 110,
      sortable: true,
      // Empty last-activity sorts last under "most recent first".
      sortValue: (s) => s.last_activity_at ?? "",
      cell: (student) => (
        <span className="flex items-center gap-1 text-xs text-m3-on-surface-variant">
          <Clock className="h-3 w-3 shrink-0" />
          {relDate(student.last_activity_at)}
        </span>
      ),
    },
  ];
}

import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock } from "lucide-react";

import { avatarColor, avatarInitials } from "@/components/ui/avatar";
import { GradientProgress } from "@/components/ui/gradient-progress";
import type { RosterStudent } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

import { ENROLL_META, RISK_META } from "./constants";
import { relDate } from "./helpers";

/**
 * One roster row — avatar, name/email/status, progress bar, risk badge, last
 * active and the hover arrow. Extracted verbatim from the former 658-line
 * course-students.tsx, including the `sm:grid-cols-[…]` template that has to
 * stay in step with the table header above it.
 */
export function RosterRow({
  student,
  courseId,
}: {
  student: RosterStudent;
  courseId: string;
}) {
  const risk = RISK_META[student.at_risk_level] ?? RISK_META.none;
  const enroll = ENROLL_META[student.enrollment_status] ?? ENROLL_META.active;
  const initials = avatarInitials(student.display_name);
  const aColor = avatarColor(student.student_id);
  return (
    <Link
      to="/teacher/courses/$courseId/students/$studentId"
      params={{ courseId, studentId: student.student_id }}
      className="flex sm:grid sm:grid-cols-[auto_1fr_130px_100px_90px_40px] gap-4 items-center px-5 py-4 hover:bg-m3-surface-container-low transition-colors cursor-pointer group"
    >
      {/* Avatar — show the uploaded image when present,
          otherwise the colour-coded initials fallback. */}
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

      {/* Name + email + enrollment status */}
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

      {/* Progress bar */}
      <div className="hidden sm:flex flex-col gap-1 min-w-0">
        <div className="flex justify-between text-[10px] font-medium text-m3-on-surface-variant">
          <span>{Math.round(student.progress_percent)}%</span>
        </div>
        <GradientProgress
          value={student.progress_percent}
          size="sm"
          variant="primary"
        />
      </div>

      {/* Risk badge */}
      <div className="hidden sm:flex items-center">
        <span
          className={cn(
            "text-[10px] font-bold px-2.5 py-1 rounded-full",
            risk.badge,
          )}
        >
          {risk.label}
        </span>
      </div>

      {/* Last active */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-m3-on-surface-variant">
        <Clock className="h-3 w-3" />
        {relDate(student.last_activity_at)}
      </div>

      {/* Arrow */}
      <div className="hidden sm:flex items-center justify-end">
        <ChevronRight className="h-4 w-4 text-m3-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

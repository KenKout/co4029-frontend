import type { RosterStudent } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

import { fmtDate } from "./helpers";
import type { EnrollMeta, RiskMeta } from "./types";

/**
 * Sidebar "Enrollment Management" card — status, risk level and enrolment date.
 * Extracted verbatim from the former 659-line course-student-detail.tsx.
 */
export function EnrollmentManagementCard({
  student,
  risk,
  enroll,
}: {
  student: RosterStudent;
  risk: RiskMeta;
  enroll: EnrollMeta;
}) {
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-4">
      <h3 className="font-headline font-bold text-m3-primary text-base">
        Enrollment Management
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-m3-on-surface-variant">Status</span>
          <span
            className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              enroll.badge,
            )}
          >
            {enroll.label}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-m3-on-surface-variant">Risk Level</span>
          <span
            className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              risk.badge,
            )}
          >
            {risk.label}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-m3-on-surface-variant">Enrolled</span>
          <span className="text-xs font-medium text-m3-on-surface">
            {fmtDate(student.enrolled_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

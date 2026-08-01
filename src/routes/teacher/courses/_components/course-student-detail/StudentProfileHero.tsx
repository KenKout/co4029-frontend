import { Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Mail } from "lucide-react";

import { avatarColor, avatarInitials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { RosterStudent } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

import { fmtDate } from "./helpers";
import { StudentMetricsStrip } from "./StudentMetricsStrip";
import type { EnrollMeta, RiskMeta } from "./types";

/**
 * Profile hero card — avatar, name, the enrollment + risk badges, contact line,
 * the back-to-roster button and the key metrics strip. Extracted verbatim from
 * the former 659-line course-student-detail.tsx.
 */
export function StudentProfileHero({
  student,
  courseId,
  risk,
  enroll,
}: {
  student: RosterStudent;
  courseId: string;
  risk: RiskMeta;
  enroll: EnrollMeta;
}) {
  const aColor = avatarColor(student.student_id);
  const initials = avatarInitials(student.display_name);
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-5">
          {/* Show the uploaded avatar when present, otherwise the
              colour-coded initials fallback. */}
          {student.avatar_url ? (
            <img
              src={student.avatar_url}
              alt=""
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div
              className={cn(
                "w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 uppercase",
                aColor,
              )}
            >
              {initials || "?"}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-headline font-bold text-m3-on-surface">
                {student.display_name}
              </h1>
              <span
                className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full",
                  enroll.badge,
                )}
              >
                {enroll.label}
              </span>
              <span
                className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full",
                  risk.badge,
                )}
              >
                {risk.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-m3-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {student.primary_email}
              </span>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Enrolled {fmtDate(student.enrolled_at)}
              </span>
            </div>
          </div>
        </div>

        <Link to="/teacher/courses/$courseId/students" params={{ courseId }}>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-m3-outline-variant/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Roster
          </Button>
        </Link>
      </div>

      {/* Key metrics strip */}
      <StudentMetricsStrip student={student} risk={risk} />
    </div>
  );
}

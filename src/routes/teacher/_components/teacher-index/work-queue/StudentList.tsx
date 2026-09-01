import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { StudentNeedingAttention } from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

import type { TranslateFn } from "../types";

/**
 * The "People" view of the Work Queue: students the risk engine
 * flagged, worst first.
 *
 * Rows are per (student, course), not per student: a learner struggling in
 * two of this teacher's courses appears twice, because the intervention
 * happens inside a course and the CTA has to land somewhere specific. The
 * headline tile counts distinct people, so the two numbers differ by
 * design.
 *
 * The section renders `primary_reason` verbatim rather than rebuilding a
 * sentence from the numbers. The server phrases it with the threshold that
 * actually fired ("No engagement for 12 days (threshold: 7)"), and those
 * thresholds are administrator-tunable — restating them here is how the
 * old copy ended up claiming a 7-day rule the query no longer used.
 */
export function StudentList({
  students,
  isLoading,
  t,
}: {
  students: StudentNeedingAttention[];
  isLoading: boolean;
  t: TranslateFn;
}) {
  if (isLoading) return <RowSkeletons />;
  if (students.length === 0) return null;
  return (
    <div className="divide-y divide-m3-outline-variant/20">
      {students.map((student) => (
        <StudentRow
          key={`${student.user_id}:${student.course_id}`}
          student={student}
          t={t}
        />
      ))}
    </div>
  );
}

function StudentRow({
  student,
  t,
}: {
  student: StudentNeedingAttention;
  t: TranslateFn;
}) {
  const name = student.display_name?.trim() || student.email;
  const extraSignals = student.signal_count - 1;

  return (
    <Link
      to="/teacher/courses/$courseId/students/$studentId"
      params={{ courseId: student.course_id, studentId: student.user_id }}
      className="group flex items-center gap-4 p-4 transition-colors hover:bg-m3-surface-container-low"
    >
      <SeverityDot severity={student.severity} />

      <Avatar size="lg" className="hidden sm:flex">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="truncate font-semibold text-text-strong">{name}</span>
          <span className="truncate text-xs text-text-muted">
            {student.course_title}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-text-muted">
          {student.primary_reason}
          {/* FR-022: a student can trip several rules at once. The primary
              one is shown in full; the rest are counted, because listing
              them all would bury the row that matters most. */}
          {extraSignals > 0 ? (
            <span className="ml-1 font-medium text-m3-on-surface-variant">
              {extraSignals === 1
                ? t("teacher_dashboard.attention.more_signals", {
                    count: 1,
                  })
                : t("teacher_dashboard.attention.more_signals_plural", {
                    count: extraSignals,
                  })}
            </span>
          ) : null}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-semibold text-text-strong">
          {Math.round(student.completion_percent)}%
        </p>
        <p className="text-[11px] text-text-muted">
          {t("teacher_dashboard.attention.progress")}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

/**
 * Severity as a shape AND a colour.
 *
 * FR-043's rule for course health applies here too: colour alone is not an
 * explanation, and it is invisible to a colourblind teacher. High severity
 * gets the warning glyph; medium gets a plain dot.
 */
function SeverityDot({ severity }: { severity: StudentNeedingAttention["severity"] }) {
  if (severity === "high") {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-destructive"
        aria-label="High severity"
      />
    );
  }
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full bg-m3-tertiary")}
      aria-label="Medium severity"
    />
  );
}

function RowSkeletons() {
  return (
    <div className="divide-y divide-m3-outline-variant/20">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-m3-surface-container" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-m3-surface-container" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-m3-surface-container" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Up to two initials; falls back to the first character of an email. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

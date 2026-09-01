import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";

import type { CourseHealthRow } from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

import { atRiskShare } from "../course-health-helpers";
import type { TranslateFn } from "../types";

/** How many courses the rail shows before deferring to the full table. */
const RAIL_LIMIT = 4;

/**
 * The worst few courses, with a way through to the full table.
 *
 * The dashboard's job is "which course needs me today", and that is
 * answerable from three or four rows — ranking a whole teaching load is a
 * different task, so the sortable table moved to its own page behind
 * "View all". Keeping it here made the dashboard a data grid that happened
 * to have a queue above it.
 *
 * Rows arrive already sorted worst-first from the server; this takes the
 * head of that list rather than re-sorting, so the rail and the table
 * cannot disagree about which course is worst.
 */
export function CourseHealthRail({
  rows,
  isLoading,
  t,
}: {
  rows: CourseHealthRow[];
  isLoading: boolean;
  t: TranslateFn;
}) {
  return (
    <section className="rounded-xl bg-card shadow-editorial ghost-border">
      <div className="flex items-center justify-between gap-2 border-b border-m3-outline-variant/20 px-4 py-3">
        <h2 className="text-xs font-bold tracking-widest text-m3-on-surface-variant uppercase">
          {t("teacher_dashboard.health.title")}
        </h2>
        {rows.length > 0 ? (
          <Link
            to="/teacher/course-health"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-m3-primary hover:underline"
          >
            {t("teacher_dashboard.health.view_all")}
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <Skeletons />
      ) : rows.length > 0 ? (
        <ul className="divide-y divide-m3-outline-variant/20">
          {rows.slice(0, RAIL_LIMIT).map((row) => (
            <li key={row.course_id}>
              <CourseRow row={row} t={t} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-xs text-text-muted">
          {t("teacher_dashboard.your_courses.no_courses_yet")}
        </p>
      )}
    </section>
  );
}

function CourseRow({ row, t }: { row: CourseHealthRow; t: TranslateFn }) {
  return (
    <Link
      to="/teacher/courses/$courseId"
      params={{ courseId: row.course_id }}
      className="group flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-m3-surface-container-low"
    >
      {/* Severity as a glyph with the server's reason on hover — colour
          alone is not an explanation, and is invisible to a colourblind
          teacher. */}
      {row.severity === "high" ? (
        <AlertTriangle
          className="h-3.5 w-3.5 shrink-0 text-destructive"
          aria-label={row.severity_reason ?? row.severity}
        />
      ) : row.severity === "medium" ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-m3-tertiary"
          aria-label={row.severity_reason ?? row.severity}
          title={row.severity_reason ?? undefined}
        />
      ) : (
        <span aria-hidden="true" className="inline-block h-3.5 w-3.5 shrink-0" />
      )}

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-strong">
        {row.title}
      </span>

      {/* "2/3" rather than a bare "2": at-risk only means something against
          the roster it came from, and the rail has no column headers to
          carry that context. */}
      {row.at_risk_students > 0 ? (
        <span
          className={cn(
            "shrink-0 text-xs font-semibold tabular-nums",
            atRiskShare(row) >= 0.25 ? "text-destructive" : "text-text-strong",
          )}
          title={t("teacher_dashboard.health.at_risk")}
        >
          {row.at_risk_students}
          <span className="font-normal text-text-muted">/{row.students}</span>
        </span>
      ) : (
        <span className="shrink-0 text-xs text-text-muted tabular-nums">
          {row.students}
        </span>
      )}
    </Link>
  );
}

function Skeletons() {
  return (
    <div className="divide-y divide-m3-outline-variant/20">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2.5 px-4 py-3">
          <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-m3-surface-container" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-m3-surface-container" />
        </div>
      ))}
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, ChevronRight } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import type { CourseHealthRow } from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

import {
  atRiskShare,
  daysSince,
  hasUsablePassRate,
  nullableSortValue,
} from "./course-health-helpers";
import type { TranslateFn } from "./types";

/** A course is called dormant after this long with no activity of any kind. */
const DORMANT_DAYS = 14;

/**
 * Course Health: the teaching load as a comparable table.
 *
 * Replaces the course gallery. The gallery gave every course a large
 * thumbnail and equal visual weight, which made "which course needs me
 * today" unanswerable — the signals were shrunk into badges while the
 * imagery took the space. A table ranks, and ranking is the whole job.
 *
 * Rows arrive pre-sorted worst-first from the server; every column is
 * client-sortable from there so a teacher can re-rank by whichever signal
 * they are chasing.
 *
 * Five core columns stay on screen (Course, Students, Progress, At risk,
 * Action) — an 8-column table overflowed the viewport at ~1246px and
 * pushed Pending review / Last activity off-screen. Those live in an
 * expandable detail row instead. The course NAME is a real link (keyboard
 * focusable), not a click-capturing row.
 */
type HealthRow = CourseHealthRow & { readonly __detail?: true };

function detailRowFor(row: CourseHealthRow): HealthRow {
  return { ...row, __detail: true };
}

function isDetailRow(row: CourseHealthRow): row is HealthRow {
  return Boolean((row as HealthRow).__detail);
}

export function CourseHealthSection({
  rows,
  isLoading,
  t,
}: {
  rows: CourseHealthRow[];
  isLoading: boolean;
  t: TranslateFn;
}) {
  const columns: DataTableColumn<CourseHealthRow>[] = [
    {
      id: "title",
      header: t("teacher_dashboard.health.course"),
      sortable: true,
      sortValue: (row) => row.title.toLowerCase(),
      cell: (row) =>
        isDetailRow(row) ? (
          <DetailRow row={row} t={t} />
        ) : (
          <div className="flex items-center gap-2.5">
            <SeverityMark row={row} />
            <div className="min-w-0">
              {/* A real link, not an onClick row: keyboard-focusable and
                  announced as a link by assistive tech. */}
              <Link
                to="/teacher/courses/$courseId"
                params={{ courseId: row.course_id }}
                className="block truncate font-medium text-text-strong hover:text-m3-primary hover:underline"
              >
                {row.title}
              </Link>
              {/* Published state as a word, not a colour (FR-044). Drafts
                  are called out because a draft course with enrolled
                  students is usually a mistake worth seeing. */}
              {row.status !== "published" ? (
                <span className="text-[11px] tracking-wide text-text-muted uppercase">
                  {row.status}
                </span>
              ) : null}
            </div>
          </div>
        ),
    },
    {
      id: "students",
      header: t("teacher_dashboard.health.students"),
      align: "right",
      sortable: true,
      sortValue: (row) => row.students,
      cell: (row) =>
        isDetailRow(row) ? null : <Numeric value={row.students} />,
    },
    {
      id: "progress",
      header: t("teacher_dashboard.health.progress"),
      align: "right",
      sortable: true,
      sortValue: (row) => nullableSortValue(row.avg_progress_percent),
      cell: (row) =>
        isDetailRow(row)
          ? null
          : row.avg_progress_percent === null ? (
              <NoData t={t} />
            ) : (
              <Numeric value={`${Math.round(row.avg_progress_percent)}%`} />
            ),
    },
    {
      id: "at_risk",
      header: t("teacher_dashboard.health.at_risk"),
      align: "right",
      // Sorted by SHARE, not count: 8 of 20 is a worse course than 8 of 200,
      // and sorting on the raw count would rank the big cohort first.
      sortable: true,
      sortValue: atRiskShare,
      cell: (row) =>
        isDetailRow(row) ? null : (
          row.at_risk_students > 0 ? (
            <span className="font-semibold text-destructive">
              {row.at_risk_students}
              <span className="font-normal text-text-muted">/{row.students}</span>
            </span>
          ) : (
            <Numeric value={0} />
          )
        ),
    },
    {
      id: "action",
      header: t("teacher_dashboard.health.action"),
      align: "right",
      cell: (row) =>
        isDetailRow(row) ? null : (
          <Link
            to="/teacher/courses/$courseId"
            params={{ courseId: row.course_id }}
            className="inline-flex items-center gap-1 text-xs font-bold text-m3-primary hover:underline"
          >
            {t("teacher_dashboard.health.action")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ),
    },
  ];

  return (
    <div>
      <SectionHeader
        title={t("teacher_dashboard.health.title")}
        subtitle={t("teacher_dashboard.health.subtitle")}
      />
      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) =>
            isDetailRow(row) ? `${row.course_id}:detail` : row.course_id
          }
          getSubRows={(row) => (isDetailRow(row) ? undefined : [detailRowFor(row)])}
          loading={isLoading}
          emptyState={
            <EmptyState
              icon={BookOpen}
              title={t("teacher_dashboard.your_courses.no_courses_yet")}
              description={t("teacher_dashboard.your_courses.create_first")}
            />
          }
        />
      </div>
    </div>
  );
}

/**
 * The expandable detail row: pass rate, pending review and last activity —
 * the columns dropped from the main table so the five core ones fit the
 * viewport. Rendered in the first (Course) cell; the sibling cells are
 * empty so the row reads as one summary line.
 */
function DetailRow({ row, t }: { row: CourseHealthRow; t: TranslateFn }) {
  const pass = hasUsablePassRate(row)
    ? `${Math.round(row.pass_rate_percent as number)}%`
    : null;
  const passSample =
    row.pass_sample === 1
      ? t("teacher_dashboard.health.pass_sample", { count: 1 })
      : t("teacher_dashboard.health.pass_sample_plural", {
          count: row.pass_sample,
        });
  const lastActivity = <LastActivity iso={row.last_activity_at} t={t} />;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-1.5 py-0.5 text-xs text-m3-on-surface-variant">
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-m3-on-surface">
          {t("teacher_dashboard.health.pass_rate")}
        </span>
        {pass ?? "—"}
        {pass !== null && (
          <span className="text-m3-on-surface-variant/70">({passSample})</span>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-m3-on-surface">
          {t("teacher_dashboard.health.pending")}
        </span>
        <span className="tabular-nums">{row.pending_review}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-m3-on-surface">
          {t("teacher_dashboard.health.last_activity")}
        </span>
        {lastActivity}
      </span>
    </div>
  );
}

/**
 * Severity as glyph + tooltip, never colour alone (FR-043).
 *
 * The reason string comes from the server, which knows which signal set
 * the band; rebuilding it here would mean re-deriving thresholds the
 * client does not own.
 */
function SeverityMark({ row }: { row: CourseHealthRow }) {
  if (row.severity === "none") {
    return <span className="inline-block h-4 w-4 shrink-0" aria-hidden />;
  }
  const label = row.severity_reason ?? row.severity;
  if (row.severity === "high") {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-destructive"
        aria-label={label}
      />
    );
  }
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full bg-m3-tertiary")}
      aria-label={label}
      title={label}
    />
  );
}

function Numeric({ value }: { value: number | string }) {
  return <span className="tabular-nums">{value}</span>;
}

/** Explicit "no data" — an em-dash a teacher can read, not a silent 0. */
function NoData({ t }: { t: TranslateFn }) {
  return (
    <span className="text-text-muted" title={t("teacher_dashboard.health.no_data")}>
      —
    </span>
  );
}

function LastActivity({ iso, t }: { iso: string | null; t: TranslateFn }) {
  const days = daysSince(iso);
  if (days === null) {
    return <NoData t={t} />;
  }
  const dormant = days >= DORMANT_DAYS;
  return (
    <span className={cn("tabular-nums", dormant && "text-text-muted")}>
      {days === 0
        ? t("teacher_dashboard.health.today")
        : t("teacher_dashboard.health.days_ago", { count: days })}
    </span>
  );
}
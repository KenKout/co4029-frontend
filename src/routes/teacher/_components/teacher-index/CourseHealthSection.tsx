import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, BookOpen } from "lucide-react";

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
 */
export function CourseHealthSection({
  rows,
  isLoading,
  t,
}: {
  rows: CourseHealthRow[];
  isLoading: boolean;
  t: TranslateFn;
}) {
  const navigate = useNavigate();

  const columns: DataTableColumn<CourseHealthRow>[] = [
    {
      id: "title",
      header: t("teacher_dashboard.health.course"),
      sortable: true,
      sortValue: (row) => row.title.toLowerCase(),
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <SeverityMark row={row} />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-strong">{row.title}</p>
            {/* Published state as a word, not a colour (FR-044). Drafts are
                called out because a draft course with enrolled students is
                usually a mistake worth seeing. */}
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
      cell: (row) => <Numeric value={row.students} />,
    },
    {
      id: "progress",
      header: t("teacher_dashboard.health.progress"),
      align: "right",
      sortable: true,
      sortValue: (row) => nullableSortValue(row.avg_progress_percent),
      cell: (row) =>
        row.avg_progress_percent === null ? (
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
        row.at_risk_students > 0 ? (
          <span className="font-semibold text-destructive">
            {row.at_risk_students}
            <span className="font-normal text-text-muted">/{row.students}</span>
          </span>
        ) : (
          <Numeric value={0} />
        ),
    },
    {
      id: "pass_rate",
      header: t("teacher_dashboard.health.pass_rate"),
      align: "right",
      sortable: true,
      sortValue: (row) =>
        hasUsablePassRate(row) ? nullableSortValue(row.pass_rate_percent) : -1,
      cell: (row) =>
        hasUsablePassRate(row) ? (
          <span
            title={t("teacher_dashboard.health.pass_sample", {
              count: row.pass_sample,
            })}
          >
            {Math.round(row.pass_rate_percent as number)}%
          </span>
        ) : (
          // Withheld rather than shown: a rate off a handful of attempts
          // reads as a verdict on the course when it is one bad afternoon.
          <NoData t={t} />
        ),
    },
    {
      id: "pending",
      header: t("teacher_dashboard.health.pending"),
      align: "right",
      sortable: true,
      sortValue: (row) => row.pending_review,
      cell: (row) => <Numeric value={row.pending_review} />,
    },
    {
      id: "activity",
      header: t("teacher_dashboard.health.last_activity"),
      align: "right",
      sortable: true,
      sortValue: (row) =>
        row.last_activity_at ? new Date(row.last_activity_at).getTime() : 0,
      cell: (row) => <LastActivity iso={row.last_activity_at} t={t} />,
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
          getRowId={(row) => row.course_id}
          loading={isLoading}
          onRowClick={(row) =>
            void navigate({
              to: "/teacher/courses/$courseId",
              params: { courseId: row.course_id },
            })
          }
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

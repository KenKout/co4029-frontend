import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CornerDownRight } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { CourseEnrollmentStatusBadge } from "@/components/ui/status-badges";
import { useFormatDate } from "@/lib/format/date";
import type {
  UserProgramPathAttemptRead,
  UserProgramProgressRead,
} from "@/lib/api/types/user-overview";

/**
 * A student's learning programs, with their path history nested underneath.
 *
 * Sits beside the career-path table but is NOT a duplicate of it: a program
 * pins a specific path *version*, so its progress is measured against what
 * the student was enrolled onto rather than the path's current head. The two
 * can legitimately disagree, which is why both are shown.
 *
 * Path attempts render as expandable child rows via `getSubRows`. That is the
 * enrolment history the manager is looking for — the backend records a switch
 * as a NEW attempt instead of mutating the old one, so "abandoned Data
 * Science in March, now on Backend" is readable straight off the row rather
 * than inferred from a single current-state field.
 */

/** Row union: a program, or one of its path attempts. */
type Row =
  | { kind: "program"; id: string; program: UserProgramProgressRead }
  | {
      kind: "attempt";
      id: string;
      attempt: UserProgramPathAttemptRead;
      program: UserProgramProgressRead;
    };

export function ProgramsTable({
  programs,
}: {
  programs: UserProgramProgressRead[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const [search, setSearch] = useState("");
  const prefix = "management_users.detail";

  const rows = useMemo<Row[]>(() => {
    const q = search.trim().toLowerCase();
    return programs
      .filter((p) => !q || p.program_name.toLowerCase().includes(q))
      .map((program) => ({
        kind: "program" as const,
        id: program.enrollment_id,
        program,
      }));
  }, [programs, search]);

  const columns = useMemo<DataTableColumn<Row>[]>(
    () => [
      {
        id: "name",
        header: t(`${prefix}.cols.program`, { defaultValue: "Program" }),
        cell: (row) =>
          row.kind === "program" ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-strong">
                {row.program.program_name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-text-muted">
                {t(`${prefix}.version_no`, {
                  defaultValue: "v{{no}}",
                  no: row.program.program_version_no,
                })}
              </p>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate text-sm text-text-strong">
                {row.attempt.career_path_name ??
                  t(`${prefix}.unknown_path`, { defaultValue: "Career path" })}
              </span>
            </div>
          ),
      },
      {
        id: "status",
        header: t(`${prefix}.cols.path_status`, { defaultValue: "Status" }),
        cell: (row) => (
          <CourseEnrollmentStatusBadge
            status={row.kind === "program" ? row.program.status : row.attempt.status}
          />
        ),
      },
      {
        id: "progress",
        header: t(`${prefix}.cols.progress`, { defaultValue: "Progress" }),
        cell: (row) =>
          // Progress belongs to the enrolment, not to a past attempt — a
          // percentage on an abandoned path would be meaningless.
          row.kind !== "program" ? null : (
            <div className="flex min-w-[180px] items-center gap-3">
              <GradientProgress
                value={row.program.completion_percent}
                size="sm"
                className="flex-1"
              />
              <span className="whitespace-nowrap text-xs font-semibold text-text-strong">
                {row.program.completed_courses}/{row.program.course_count}
              </span>
            </div>
          ),
      },
      {
        id: "switches",
        header: t(`${prefix}.cols.switches`, { defaultValue: "Path switches" }),
        align: "left",
        cell: (row) =>
          row.kind !== "program" ? null : (
            <span className="text-sm tabular-nums text-text-strong">
              {row.program.approved_switch_count}
              <span className="text-text-muted">
                {" / "}
                {row.program.max_path_switches}
              </span>
            </span>
          ),
      },
      {
        id: "dates",
        header: t(`${prefix}.cols.timeline`, { defaultValue: "Timeline" }),
        cell: (row) => {
          const [from, to] =
            row.kind === "program"
              ? [
                  row.program.enrolled_at,
                  row.program.completed_at ?? row.program.withdrawn_at,
                ]
              : [row.attempt.selected_at, row.attempt.ended_at];
          return (
            <span className="whitespace-nowrap text-xs text-text-muted">
              {formatDate(from)}
              {to ? ` → ${formatDate(to)}` : ""}
            </span>
          );
        },
      },
    ],
    [t, formatDate],
  );

  return (
    <section>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        getSubRows={(r) =>
          r.kind === "program" && r.program.attempts.length > 0
            ? r.program.attempts.map((attempt, i) => ({
                kind: "attempt" as const,
                // Attempts have no id on the wire; the enrolment id plus the
                // index is stable for the lifetime of one payload, which is
                // all `getRowId` needs.
                id: `${r.program.enrollment_id}:${i}`,
                attempt,
                program: r.program,
              }))
            : undefined
        }
        onRowClick={(row) =>
          void navigate({
            to: "/management/learning-programs/$id",
            params: { id: row.program.learning_program_id },
          })
        }
        emptyState={t(`${prefix}.no_programs_match`, {
          defaultValue: "No matching programs",
        })}
        toolbar={
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t(`${prefix}.search_programs`, {
              defaultValue: "Search programs…",
            })}
          />
        }
      />
    </section>
  );
}

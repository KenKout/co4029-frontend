import { useNavigate } from "@tanstack/react-router";
import { FileClock, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useConfirm } from "@/components/ui/use-confirm";
import { useArchiveLearningProgram } from "@/lib/api/hooks/learning-programs";
import { useFormatDate } from "@/lib/format/date";
import type { LearningProgram } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { PROGRAM_STATUS_TOKENS } from "./program-status";

/**
 * The comparison view: every program as a sortable row.
 *
 * The card grid answers "which program is this"; the table answers "how do
 * they compare" — which has the most students, which has a revision in
 * flight, which is holding the most change requests. Same data, different
 * question, so both views ship rather than one being a compromise.
 *
 * Search is deliberately NOT owned here. The page renders one toolbar
 * above whichever view is active, so switching from table to cards keeps
 * the filter and its input visible — a filter you cannot see is worse than
 * no filter, because the list silently lies about how many programs exist.
 */
export function ProgramTable({
  programs,
  canManage,
  isDean,
}: {
  programs: LearningProgram[];
  canManage: boolean;
  isDean: boolean;
}) {
  const navigate = useNavigate();
  const formatDate = useFormatDate();

  const columns: DataTableColumn<LearningProgram>[] = [
    {
      id: "name",
      header: "Program",
      sortable: true,
      sortValue: (row) => row.name.toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-m3-on-surface">{row.name}</p>
          <p className="truncate font-mono text-[11px] text-m3-on-surface-variant">
            {row.slug}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => row.status,
      cell: (row) => (
        <StatusBadge
          status={row.status}
          tokens={PROGRAM_STATUS_TOKENS}
          label={row.status}
          size="sm"
          shape="pill"
        />
      ),
    },
    {
      id: "version",
      header: "Version",
      align: "right",
      sortable: true,
      sortValue: (row) => row.current_version.version_no,
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold tabular-nums">
            v{row.current_version.version_no}
          </span>
          {/* The draft flag rides in the Version cell rather than taking a
              column of its own: it is a fact ABOUT the version, and an
              almost-always-empty column would waste the width. */}
          {row.has_draft_version ? (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700"
              title={`Draft v${row.current_version.version_no + 1} in progress`}
            >
              <FileClock aria-hidden="true" className="h-2.5 w-2.5" />+1
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "paths",
      header: "Paths",
      align: "right",
      sortable: true,
      sortValue: (row) => row.paths.length,
      cell: (row) => <span className="tabular-nums">{row.paths.length}</span>,
    },
    {
      id: "students",
      header: "Students",
      align: "right",
      sortable: true,
      sortValue: (row) => row.student_count ?? 0,
      cell: (row) => (
        <span className="tabular-nums">{row.student_count ?? 0}</span>
      ),
    },
    ...(isDean
      ? [
          {
            id: "requests",
            header: "Requests",
            align: "right" as const,
            sortable: true,
            sortValue: (row: LearningProgram) =>
              row.path_change_request_count ?? 0,
            cell: (row: LearningProgram) => {
              const n = row.path_change_request_count ?? 0;
              return (
                <span
                  className={cn(
                    "tabular-nums",
                    n > 0 ? "font-semibold text-rose-600" : "",
                  )}
                >
                  {n}
                </span>
              );
            },
          },
        ]
      : []),
    {
      id: "published",
      header: "Published",
      align: "right",
      sortable: true,
      // Never published sorts to 0 rather than being treated as "oldest" —
      // a draft has no publication date, which is different from an old one.
      sortValue: (row) =>
        row.current_version.published_at
          ? new Date(row.current_version.published_at).getTime()
          : 0,
      cell: (row) =>
        row.current_version.published_at ? (
          <span className="whitespace-nowrap">
            {formatDate(row.current_version.published_at)}
          </span>
        ) : (
          <span className="text-m3-on-surface-variant">—</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={programs}
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        void navigate({
          to: "/management/learning-programs/$id",
          params: { id: row.id },
        })
      }
      actions={
        canManage ? (row) => <ArchiveAction program={row} /> : undefined
      }
      emptyState={
        <EmptyState
          icon={GraduationCap}
          title="No Learning Programs"
          description="Create a draft and add published Career Paths before publishing it."
        />
      }
    />
  );
}

function ArchiveAction({ program }: { program: LearningProgram }) {
  const archive = useArchiveLearningProgram(program.id);
  const { confirm, dialog } = useConfirm({
    title: "Archive this program?",
    confirmLabel: "Archive program",
    cancelLabel: "Cancel",
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={archive.isPending}
        onClick={async (event) => {
          // The row itself navigates; the action must not.
          event.stopPropagation();
          const ok = await confirm({
            description: `"${program.name}" leaves the management list. Students already enrolled stay on their pinned version — this hides the program, it does not cancel anyone.`,
          });
          if (ok) archive.mutate();
        }}
        className="h-auto w-auto rounded-full p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600"
        title="Archive program"
        aria-label={`Archive ${program.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {dialog}
    </>
  );
}

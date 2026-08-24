import { useMemo, useState } from "react";
import { UserPlus, Upload } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { CourseEnrollmentStatusBadge } from "@/components/ui/status-badges";
import { useUsersByIds } from "@/lib/api/hooks/admin";
import type { LearningProgramEnrollment } from "@/lib/api/types";

/**
 * Program roster: who is enrolled, which path they picked, how far they are.
 *
 * `ProgramEnrollmentRead` carries only `student_id`, so the roster used to
 * render a bare UUID against a status string — unreadable, unsearchable, and
 * impossible to act on. Names come from the same `/users/by-ids` batch lookup
 * the org-unit picker uses; without it there is no identity on this screen at
 * all.
 */
export interface RosterRow {
  enrollmentId: string;
  studentId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  pathName: string | null;
  progressPercent: number;
  completedCourses: number;
  courseCount: number;
}

export function RosterTab({
  roster,
  canEnroll,
  onOpenPicker,
  onOpenImport,
}: {
  roster: LearningProgramEnrollment[];
  canEnroll: boolean;
  onOpenPicker: () => void;
  onOpenImport: () => void;
}) {
  const [search, setSearch] = useState("");

  const studentIds = useMemo(
    () => roster.map((r) => r.student_id),
    [roster],
  );
  const users = useUsersByIds(studentIds);
  const usersById = useMemo(() => {
    const map = new Map<string, { display_name?: string | null; primary_email?: string; avatar_url?: string | null }>();
    for (const u of users.data ?? []) map.set(u.id, u);
    return map;
  }, [users.data]);

  const rows = useMemo<RosterRow[]>(() => {
    const needle = search.trim().toLowerCase();
    return roster
      .map((item) => {
        // The path a student is on is the ACTIVE attempt, not the first one:
        // a student who switched has several attempts and only one is live.
        const active = item.attempts.find((a) => a.status === "active");
        const path = item.paths.find(
          (p) => p.career_path_id === active?.career_path_id,
        );
        const user = usersById.get(item.student_id);
        return {
          enrollmentId: item.id,
          studentId: item.student_id,
          displayName:
            user?.display_name?.trim() || user?.primary_email || item.student_id,
          email: user?.primary_email ?? "",
          avatarUrl: user?.avatar_url ?? null,
          status: item.status,
          pathName: path?.name ?? null,
          progressPercent: item.current_progress_percent,
          completedCourses: item.current_completed_courses,
          courseCount: item.current_total_courses,
        };
      })
      .filter(
        (r) =>
          !needle ||
          r.displayName.toLowerCase().includes(needle) ||
          r.email.toLowerCase().includes(needle) ||
          (r.pathName ?? "").toLowerCase().includes(needle),
      );
  }, [roster, usersById, search]);

  const columns = useMemo<DataTableColumn<RosterRow>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        sortable: true,
        sortValue: (r) => r.displayName.toLowerCase(),
        cell: (r) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size="sm" className={avatarColor(r.studentId)}>
              {r.avatarUrl ? (
                <AvatarImage src={r.avatarUrl} alt={r.displayName} />
              ) : null}
              <AvatarFallback>
                {avatarInitials(r.displayName, { uppercase: true })}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-strong">
                {r.displayName}
              </p>
              {r.email ? (
                <p className="mt-0.5 truncate text-[11px] text-text-muted">
                  {r.email}
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "path",
        header: "Chosen path",
        sortable: true,
        sortValue: (r) => (r.pathName ?? "").toLowerCase(),
        cell: (r) =>
          r.pathName ? (
            <span className="text-sm text-text-strong">{r.pathName}</span>
          ) : (
            // Awaiting a choice is a work item, not a blank: these are the
            // students who enrolled but have not started anything yet.
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              No path selected
            </span>
          ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (r) => r.status,
        cell: (r) => <CourseEnrollmentStatusBadge status={r.status} />,
      },
      {
        id: "progress",
        header: "Progress",
        sortable: true,
        sortValue: (r) => r.progressPercent,
        cell: (r) =>
          // Progress against no path is meaningless — do not draw an empty
          // bar that reads as "0% done" when nothing has been chosen.
          r.pathName === null ? (
            <span className="text-xs text-text-muted">—</span>
          ) : (
            <div className="flex min-w-[170px] items-center gap-3">
              <GradientProgress
                value={r.progressPercent}
                size="sm"
                className="flex-1"
              />
              <span className="whitespace-nowrap text-xs font-semibold text-text-strong">
                {r.completedCourses}/{r.courseCount}
              </span>
            </div>
          ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.enrollmentId}
      loading={users.isLoading && roster.length > 0}
      emptyState={
        search ? "No students match your search" : "No students enrolled yet"
      }
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name, email or path…"
          />
          {canEnroll ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onOpenImport}
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button size="sm" className="gap-2" onClick={onOpenPicker}>
                <UserPlus className="h-4 w-4" />
                Enroll students
              </Button>
            </div>
          ) : null}
        </div>
      }
    />
  );
}

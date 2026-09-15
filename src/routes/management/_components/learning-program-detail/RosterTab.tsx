import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import type { LearningProgramEnrollment, User } from "@/lib/api/types";
import { getUserAvatarUrl, getUserDisplayName } from "@/lib/user-identity";

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

interface RosterTabProps {
  roster: LearningProgramEnrollment[];
  canEnroll: boolean;
  onOpenPicker: () => void;
  onOpenImport: () => void;
}

function toRosterRow(
  item: LearningProgramEnrollment,
  user: User | undefined,
): RosterRow {
  const selectedPathIds = new Set(
    item.attempts
      .filter(
        (attempt) =>
          attempt.status === "active" || attempt.status === "completed",
      )
      .map((attempt) => attempt.career_path_id),
  );
  const pathNames = item.paths
    .filter((path) => selectedPathIds.has(path.career_path_id))
    .map((path) => path.name);

  return {
    enrollmentId: item.id,
    studentId: item.student_id,
    displayName: getUserDisplayName(user, item.student_id),
    email: user?.primary_email ?? "",
    avatarUrl: getUserAvatarUrl(user),
    status: item.status,
    pathName: pathNames.length > 0 ? pathNames.join(", ") : null,
    progressPercent: item.current_progress_percent,
    completedCourses: item.current_completed_courses,
    courseCount: item.current_total_courses,
  };
}

export function RosterTab({
  roster,
  canEnroll,
  onOpenPicker,
  onOpenImport,
}: RosterTabProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const studentIds = useMemo(() => roster.map((r) => r.student_id), [roster]);
  const users = useUsersByIds(studentIds);
  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of users.data ?? []) map.set(u.id, u);
    return map;
  }, [users.data]);

  const rows = useMemo<RosterRow[]>(() => {
    const needle = search.trim().toLowerCase();
    return roster
      .map((item) => toRosterRow(item, usersById.get(item.student_id)))
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
        header: t("management_learning_program_detail.roster.student"),
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
        header: t("management_learning_program_detail.roster.chosen_path"),
        sortable: true,
        sortValue: (r) => (r.pathName ?? "").toLowerCase(),
        cell: (r) =>
          r.pathName ? (
            <span className="text-sm text-text-strong">{r.pathName}</span>
          ) : (
            // Awaiting a choice is a work item, not a blank: these are the
            // students who enrolled but have not started anything yet.
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {t("management_learning_program_detail.roster.no_path")}
            </span>
          ),
      },
      {
        id: "status",
        header: t("management_learning_program_detail.roster.status"),
        sortable: true,
        sortValue: (r) => r.status,
        cell: (r) => <CourseEnrollmentStatusBadge status={r.status} />,
      },
      {
        id: "progress",
        header: t("management_learning_program_detail.roster.progress"),
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
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.enrollmentId}
      loading={users.isLoading && roster.length > 0}
      emptyState={
        search
          ? t("management_learning_program_detail.roster.empty_filtered")
          : t("management_learning_program_detail.roster.empty")
      }
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t(
              "management_learning_program_detail.roster.search",
            )}
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
                {t("management_learning_program_detail.actions.import_csv")}
              </Button>
              <Button size="sm" className="gap-2" onClick={onOpenPicker}>
                <UserPlus className="h-4 w-4" />
                {t(
                  "management_learning_program_detail.actions.enroll_students",
                )}
              </Button>
            </div>
          ) : null}
        </div>
      }
    />
  );
}

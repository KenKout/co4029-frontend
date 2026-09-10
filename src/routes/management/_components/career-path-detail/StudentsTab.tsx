import { useMemo, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UserPlus, Users } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "./EmptyState";
import { ReadinessSnapshot } from "./ReadinessSnapshot";
import { SectionActionCard } from "./SectionActionCard";
import { StudentPickerDialog } from "./StudentPickerDialog";
import type { TFunction } from "i18next";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { useStudentsTab } from "./use-students-tab";
import { useRemoveCareerPathStudent } from "@/lib/api/hooks/career-paths";
import { RemoveRowButtons } from "./RemoveRowButtons";
import type { StudentPathProgressAuthoring } from "@/lib/api/types";

/**
 * Students tab: a data table over the path roster — toolbar search, a
 * completion filter, pagination, and rows that link to the user's detail
 * page. Enrolment still lives behind the register card + picker; removal
 * stays a row action.
 *
 * Completion filter vocabulary: a row whose completed_courses equals
 * course_count has finished the path version it is pinned to.
 */

type ProgressFilter = "all" | "in_progress" | "completed";

const PROGRESS_FILTER_ID = "progress";

function isCompleted(row: StudentPathProgressAuthoring): boolean {
  return row.course_count > 0 && row.completed_courses >= row.course_count;
}

/** Unenroll action cell — the same confirm flow the old row card used. */
function RemoveCell({
  pathId,
  row,
}: {
  pathId: string;
  row: StudentPathProgressAuthoring;
}) {
  const { t } = useTranslation();
  const remove = useRemoveCareerPathStudent(pathId, row.student_id);
  const [confirming, setConfirming] = useState(false);

  return (
    <RemoveRowButtons
      confirming={confirming}
      isPending={remove.isPending}
      confirmLabel={t("common.confirm")}
      cancelLabel={t("common.cancel")}
      onStartConfirm={() => setConfirming(true)}
      onCancel={() => setConfirming(false)}
      onRemove={() =>
        remove.mutate(undefined, {
          onSuccess: () =>
            toast.success(
              t("management_career_path_detail.toasts.student_unregistered"),
            ),
          onError: (err) =>
            toast.error(
              err.message ||
                t(
                  "management_career_path_detail.errors.unregister_student_failed",
                ),
            ),
        })
      }
      wrapperClassName="flex gap-1 shrink-0"
      triggerClassName="text-red-600 hover:text-red-700 shrink-0"
    />
  );
}

function buildStudentColumns(
  t: TFunction,
  id: string,
  canUnenroll: boolean,
): DataTableColumn<StudentPathProgressAuthoring>[] {
  return [
      {
        id: "student",
        header: t("management_career_path_detail.students.col_student"),
        sortable: true,
        sortValue: (row) => row.student_email.toLowerCase(),
        cell: (row) => {
          const displayName =
            row.student_display_name?.trim() || row.student_email;
          return (
            <Link
              to="/management/users/$userId"
              params={{ userId: row.student_id }}
              className="flex min-w-0 items-center gap-3 hover:text-m3-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar size="sm" className={avatarColor(row.student_id)}>
                {row.student_avatar_url && (
                  <AvatarImage
                    src={row.student_avatar_url}
                    alt={displayName}
                  />
                )}
                <AvatarFallback>
                  {avatarInitials(displayName, { uppercase: true })}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-strong">
                  {displayName}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{row.student_email}</span>
                </p>
              </div>
            </Link>
          );
        },
      },
      {
        id: "completion",
        header: t("management_career_path_detail.students.col_completion"),
        sortable: true,
        align: "right",
        sortValue: (row) => row.completed_courses,
        cell: (row) => (
          <span className="text-sm tabular-nums text-m3-on-surface">
            {t("management_career_path_detail.labels.student_completion", {
              completed: row.completed_courses,
              total: row.course_count,
            })}
          </span>
        ),
      },
      {
        id: "progress",
        header: t("management_career_path_detail.students.col_progress"),
        sortable: true,
        sortValue: (row) => row.overall_percent,
        cell: (row) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-m3-surface-container">
              <div
                className="h-full bg-m3-primary transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, row.overall_percent))}%`,
                }}
              />
            </div>
            <span className="text-xs tabular-nums text-m3-on-surface-variant">
              {Math.round(row.overall_percent)}%
            </span>
          </div>
        ),
      },
      ...(canUnenroll
        ? [
            {
              id: "actions",
              header: t("management_career_path_detail.students.col_actions"),
              align: "right" as const,
              cell: (row: StudentPathProgressAuthoring) => (
                <RemoveCell pathId={id} row={row} />
              ),
            },
          ]
        : []),
  ];
}

export function StudentsTab({
  id,
  canEnroll,
  canUnenroll,
}: {
  id: string;
  canEnroll: boolean;
  canUnenroll: boolean;
}) {
  const { t } = useTranslation();
  const controller = useStudentsTab(id, t);
  const [search, setSearch] = useState("");
  const [progressFilter, setProgressFilter] = useState<
    ProgressFilter | undefined
  >();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return controller.rows.filter((row) => {
      if (
        q &&
        !row.student_email.toLowerCase().includes(q) &&
        !(row.student_display_name ?? "").toLowerCase().includes(q) &&
        !row.student_id.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (progressFilter === "completed" && !isCompleted(row)) return false;
      if (progressFilter === "in_progress" && isCompleted(row)) return false;
      return true;
    });
  }, [controller.rows, search, progressFilter]);

  const columns = useMemo(
    () => buildStudentColumns(t, id, canUnenroll),
    [t, id, canUnenroll],
  );

  const filterDefs = useMemo(
    () => [
      {
        id: PROGRESS_FILTER_ID,
        label: t("management_career_path_detail.students.filter_label"),
        allLabel: t("management_career_path_detail.students.filter_all"),
        options: [
          {
            value: "in_progress",
            label: t(
              "management_career_path_detail.students.filter_in_progress",
            ),
          },
          {
            value: "completed",
            label: t(
              "management_career_path_detail.students.filter_completed",
            ),
          },
        ],
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      {canEnroll && (
        <SectionActionCard
          title={t("management_career_path_detail.sections.register_student")}
          hint={t(
            "management_career_path_detail.sections.register_student_hint",
          )}
          icon={UserPlus}
          actionLabel={t(
            "management_career_path_detail.actions.register_students",
          )}
          onAction={() => controller.setPickerOpen(true)}
        />
      )}

      {canEnroll && controller.pickerOpen && (
        <StudentPickerDialog controller={controller} />
      )}

      {controller.readiness.data &&
        controller.readiness.data.student_count > 0 && (
          <ReadinessSnapshot data={controller.readiness.data} />
        )}

      {controller.progress.isLoading ? (
        <PageSkeleton
          rows={2}
          height="h-14"
          rounded="rounded-lg"
          gap="space-y-2"
        />
      ) : controller.rows.length === 0 ? (
        <EmptyState
          icon={Users}
          text={t("management_career_path_detail.empty_states.no_students")}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(row) => row.student_id}
          loading={controller.progress.isLoading}
          pagination
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            search || progressFilter
              ? t("management_career_path_detail.students.empty_filtered")
              : t("management_career_path_detail.empty_states.no_students")
          }
          toolbar={
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t(
                "management_career_path_detail.students.search_placeholder",
              )}
              filters={filterDefs}
              filterValues={{
                [PROGRESS_FILTER_ID]: progressFilter,
              }}
              onFilterChange={(filterId, value) => {
                if (filterId === PROGRESS_FILTER_ID) {
                  setProgressFilter(
                    value === "in_progress" || value === "completed"
                      ? value
                      : undefined,
                  );
                }
              }}
              onResetAllFilters={() => setProgressFilter(undefined)}
              clearLabel={t("common.clear_filters")}
            />
          }
        />
      )}

    </div>
  );
}

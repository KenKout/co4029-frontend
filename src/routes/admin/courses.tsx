import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Archive, BookOpen, RotateCcw, Trash2 } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useServerTable } from "@/lib/api/use-server-table";
import { useDeleteCourse, useRestoreCourse } from "@/lib/api/hooks/admin";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { useFormatDateTime } from "@/lib/format/date";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge";
import { ADMIN_COURSE_STATUS_TOKENS } from "@/lib/status-tokens";
import type { CourseAuthoring } from "@/lib/api/types";

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <SharedStatusBadge
      status={status}
      tokens={ADMIN_COURSE_STATUS_TOKENS}
      size="11px"
      label={t(`admin.courses_list.row_status.${status}`, {
        defaultValue: status,
      })}
    />
  );
}

function RestoreButton({ course }: { course: CourseAuthoring }) {
  const { t } = useTranslation();
  const restore = useRestoreCourse();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        restore.mutate(course.id, {
          onSuccess: () =>
            toast.success(t("admin.course_detail.toasts.restored")),
          onError: (err) =>
            toast.error(
              (err as Error).message ||
                t("admin.course_detail.toasts.restore_failed"),
            ),
        });
      }}
      disabled={restore.isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {restore.isPending
        ? t("admin.course_detail.restoring")
        : t("admin.course_detail.restore")}
    </button>
  );
}

function DeleteButton({ course }: { course: CourseAuthoring }) {
  const { t } = useTranslation();
  const del = useDeleteCourse();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Cascade tombstone — confirm before deleting. It's reversible
        // (Restore appears on the row afterwards), but it also removes the
        // course's modules/lessons from every listing, so make it deliberate.
        if (
          !window.confirm(
            t("admin.course_detail.delete_confirm", { title: course.title }),
          )
        ) {
          return;
        }
        del.mutate(course.id, {
          onSuccess: () =>
            toast.success(t("admin.course_detail.toasts.deleted")),
          onError: (err) =>
            toast.error(
              (err as Error).message ||
                t("admin.course_detail.toasts.delete_failed"),
            ),
        });
      }}
      disabled={del.isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-danger text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {del.isPending
        ? t("admin.course_detail.deleting")
        : t("admin.course_detail.delete")}
    </button>
  );
}

export default function AdminCoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const formatDate = useFormatDateTime();

  useRequirePermission(canAdmin, {
    messageKey: "common.no_permission",
  });

  // Server-side search + sort + page across every course (the old
  // InfiniteList had no search). `include_deleted` is a server filter.
  const table = useServerTable<CourseAuthoring>({
    queryKey: ["admin", "courses", "search"],
    path: "/admin/courses/search",
    pageSize: 25,
    filters: { include_deleted: String(includeDeleted) },
    enabled: !permissions.isLoading && canAdmin,
  });

  const columns: DataTableColumn<CourseAuthoring>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("admin.courses_list.cols.course", { defaultValue: "Course" }),
        sortable: true,
        cell: (course) => {
          const isDeleted = course.deleted_at != null;
          const instructorName =
            course.instructor?.display_name?.trim() ||
            course.instructor?.primary_email ||
            "—";
          return (
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-m3-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text-strong truncate">
                    {course.title}
                  </p>
                  {isDeleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-red-100 text-red-700">
                      <Archive className="h-3 w-3" />
                      {t("admin.courses_list.row_status.deleted")}{" "}
                      {formatDate(course.deleted_at)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted font-mono truncate mt-0.5">
                  {course.slug}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t("course_detail.instructor_role")}:{" "}
                  <span className="text-text-strong">{instructorName}</span>
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        header: t("admin.courses_list.cols.status", { defaultValue: "Status" }),
        sortable: true,
        cell: (course) => <StatusBadge status={course.status} />,
      },
      {
        id: "created_at",
        header: t("admin.courses_list.cols.created", {
          defaultValue: "Created",
        }),
        sortable: true,
        align: "right",
        cell: (course) => (
          <span className="text-xs text-text-muted whitespace-nowrap">
            {formatDate(course.created_at)}
          </span>
        ),
      },
    ],
    [t, formatDate],
  );

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!canAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.courses_list.title")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("admin.courses_list.subtitle")}
          </p>
        </div>
      </div>

      {table.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.courses_list.load_failed")}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={table.rows}
          getRowId={(course) => course.id}
          loading={table.isLoading}
          onRowClick={(course) =>
            void navigate({
              to: "/admin/courses/$courseId",
              params: { courseId: course.id },
            })
          }
          actions={(course) =>
            course.deleted_at != null ? (
              <RestoreButton course={course} />
            ) : (
              <DeleteButton course={course} />
            )
          }
          pagination
          manualPagination
          manualSorting
          rowCount={table.total}
          page={table.page}
          pageSize={table.pageSize}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
          pageSizeOptions={[25, 50, 100]}
          sort={table.sort}
          onSortChange={table.setSort}
          emptyState={
            table.search
              ? t("admin.courses_list.empty_search", {
                  defaultValue: "No matching courses",
                })
              : t("admin.courses_list.empty_title")
          }
          toolbar={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                wrapperClassName="max-w-md flex-1 min-w-[12rem]"
                value={table.search}
                onChange={(e) => table.setSearch(e.target.value)}
                placeholder={t("admin.courses_list.search_placeholder", {
                  defaultValue: "Search by title or slug…",
                })}
                className="pl-10"
              />
              <label className="inline-flex items-center gap-2 text-sm text-text-strong select-none shrink-0">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-m3-primary"
                />
                {t("admin.courses_list.include_deleted")}
              </label>
            </div>
          }
        />
      )}
    </div>
  );
}

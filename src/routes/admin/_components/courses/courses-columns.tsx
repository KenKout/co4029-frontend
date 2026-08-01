import { Archive, BookOpen } from "lucide-react";

import type { DataTableColumn } from "@/components/ui/data-table";
import { AdminCourseStatusBadge as StatusBadge } from "@/components/ui/status-badges";
import type { CourseAuthoring } from "@/lib/api/types";

import type { FormatDate, TFn } from "./types";

export function buildCourseColumns(
  t: TFn,
  formatDate: FormatDate,
): DataTableColumn<CourseAuthoring>[] {
  return [
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
  ];
}

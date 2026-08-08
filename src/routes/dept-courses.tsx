import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, Plus, UserPlus, Users } from "lucide-react";
import { useDeptCourses } from "@/lib/api/hooks/dept";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CourseStatusBadge } from "@/components/ui/status-badges";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import type { CourseAuthoring } from "@/lib/api/types";

/**
 * Manager/HOD course worklist — the merged view that replaced the old
 * "/dept" (Team management) and "/management/enrolment" (Enrolment) pair,
 * which were the same list rendered twice with different row links.
 *
 * One table, two row actions:
 *   * Enrol      → /management/courses/{id}/enrollments   (enrolment perms)
 *   * Teachers   → /dept/courses/{id}?tab=teachers        (assign_teacher)
 *
 * The backend populates student_count / module_count / instructor on
 * GET /dept/courses, so a row tells a manager at a glance that a course
 * with no teacher and no content cannot be published — the publish-gate
 * failure surfaced in the list instead of as a 409 at publish time.
 * The worklist filter (All · Needs teacher · No content · Draft) answers
 * "what needs me?" directly; search answers "where is course X".
 *
 * Client-side search/filter/pagination is deliberate: this is a full-fetch,
 * org-scoped endpoint (one org's courses, bounded). The admin users/courses
 * tables use useServerTable + manualPagination because those lists are
 * global and already page server-side. Migrate this table the same way when
 * the dept endpoint grows server-side pagination or an org routinely
 * exceeds ~200 courses.
 */

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type WorklistFilter = "all" | "needs_teacher" | "no_content" | "draft";

function CourseTitleCell({ course }: { course: CourseAuthoring }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-9 h-9 rounded-md bg-m3-primary-fixed flex items-center justify-center shrink-0">
        <BookOpen className="h-4 w-4 text-m3-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {course.title}
        </p>
        <p className="text-xs text-text-muted font-mono truncate mt-0.5">
          {course.slug}
        </p>
      </div>
    </div>
  );
}

function InstructorCell({ course, t }: { course: CourseAuthoring; t: TFn }) {
  const instructor = course.instructor;
  if (!instructor?.display_name) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
        <UserPlus className="h-3 w-3" />
        {t("dept_courses.instructor_unassigned")}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar size="sm" className={avatarColor(instructor.user_id)}>
        {instructor.avatar_url && (
          <AvatarImage
            src={instructor.avatar_url}
            alt={instructor.display_name}
          />
        )}
        <AvatarFallback>
          {avatarInitials(instructor.display_name, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-text-strong truncate">
        {instructor.display_name}
      </span>
    </div>
  );
}

function StudentsCell({ course }: { course: CourseAuthoring }) {
  const cap = course.enrollment_cap;
  if (!cap || cap <= 0) {
    return (
      <span className="text-sm tabular-nums text-text-strong">
        {course.student_count}
      </span>
    );
  }
  const pct = Math.min(100, Math.round((course.student_count / cap) * 100));
  return (
    <div className="flex flex-col gap-1 min-w-[7rem]">
      <span className="text-sm tabular-nums text-text-strong">
        {course.student_count} / {cap}
      </span>
      <div
        role="progressbar"
        aria-valuenow={course.student_count}
        aria-valuemin={0}
        aria-valuemax={cap}
        className="h-1.5 w-full max-w-[7rem] rounded-full bg-m3-surface-container"
      >
        <div
          className={`h-full rounded-full ${
            course.student_count >= cap
              ? "bg-amber-500"
              : "bg-m3-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ContentCell({ course, t }: { course: CourseAuthoring; t: TFn }) {
  // Zero modules is a hard publish failure (stage_course_has_no_gradeable_units),
  // so it gets the same amber treatment as the Unassigned instructor chip —
  // "0 modules" must not read as a healthy number next to "8 modules".
  if (course.module_count === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
        {t("dept_courses.modules", { count: 0 })}
      </span>
    );
  }
  return (
    <span className="text-sm tabular-nums text-text-strong">
      {t("dept_courses.modules", { count: course.module_count })}
    </span>
  );
}

function RowActions({
  course,
  canEnrol,
  canStaff,
  t,
}: {
  course: CourseAuthoring;
  canEnrol: boolean;
  canStaff: boolean;
  t: TFn;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {canEnrol && (
        <Link
          to="/management/courses/$courseId/enrollments"
          params={{ courseId: course.id }}
          onClick={(e) => e.stopPropagation()}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold hover:opacity-90"
        >
          <Users className="h-3.5 w-3.5" />
          {t("dept_courses.action_enrol")}
        </Link>
      )}
      {canStaff && (
        // Explicit deep-link to the teachers tab (the row click lands on the
        // same page at its default tab) — the search param keeps this action
        // meaningful even if the detail page's default tab ever changes.
        <Link
          to="/dept/courses/$courseId"
          params={{ courseId: course.id }}
          search={{ tab: "teachers" }}
          onClick={(e) => e.stopPropagation()}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-xs font-semibold text-m3-on-surface-variant bg-m3-surface-container hover:bg-m3-surface-container-high"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {t("dept_courses.action_teachers")}
        </Link>
      )}
    </div>
  );
}

function buildColumns(t: TFn): DataTableColumn<CourseAuthoring>[] {
  return [
    {
      id: "title",
      header: t("dept_courses.col_course"),
      sortable: true,
      sortValue: (c) => c.title.toLowerCase(),
      cell: (c) => <CourseTitleCell course={c} />,
    },
    {
      id: "instructor",
      header: t("dept_courses.col_instructor"),
      sortable: true,
      sortValue: (c) => c.instructor?.display_name?.toLowerCase() ?? "",
      cell: (c) => <InstructorCell course={c} t={t} />,
    },
    {
      id: "students",
      header: t("dept_courses.col_students"),
      sortable: true,
      sortValue: (c) => c.student_count,
      align: "left",
      // Enrollment counts are deliberately visible even to staff without
      // enrollment permissions — an aggregate, not the roster itself.
      cell: (c) => <StudentsCell course={c} />,
    },
    {
      id: "content",
      header: t("dept_courses.col_content"),
      sortable: true,
      sortValue: (c) => c.module_count,
      cell: (c) => <ContentCell course={c} t={t} />,
    },
    {
      id: "status",
      header: t("dept_courses.col_status"),
      sortable: true,
      sortValue: (c) => c.status,
      cell: (c) => <CourseStatusBadge status={c.status} />,
    },
  ];
}

export default function DeptCoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [query, setQuery] = useState("");
  const [worklist, setWorklist] = useState<WorklistFilter>("all");

  const canEnrol = permissions.hasAny(
    "course.enrollment.create",
    "course.enrollment.read",
    "system.administer",
  );
  const canStaff = permissions.hasAny(
    "course.assign_teacher",
    "system.administer",
  );
  // Merged gate: anyone who could see either of the two old pages.
  const canRead = canStaff || canEnrol;
  const canCreate = permissions.hasAny("course.create", "system.administer");

  useRequirePermission(canRead, {
    messageKey: "dept_courses.no_permission",
  });

  const enabled = !permissions.isLoading && canRead;
  const list = useDeptCourses();

  const courses = useMemo(() => {
    let all = list.data ?? [];
    const q = query.trim().toLowerCase();
    if (q) {
      all = all.filter((c) =>
        [c.title, c.slug, c.instructor?.display_name]
          .filter(Boolean)
          .some((s) => (s as string).toLowerCase().includes(q)),
      );
    }
    if (worklist === "needs_teacher") {
      all = all.filter((c) => !c.instructor?.display_name);
    } else if (worklist === "no_content") {
      all = all.filter((c) => c.module_count === 0);
    } else if (worklist === "draft") {
      all = all.filter((c) => c.status === "draft");
    }
    return all;
  }, [list.data, query, worklist]);

  if (permissions.isLoading) {
    return (
      <PageSkeleton
        rows={3}
        rounded="rounded-lg"
        bg="bg-surface-muted"
        className="pb-12"
      />
    );
  }

  if (!canRead) {
    return null;
  }

  const onRowClick = (course: CourseAuthoring) =>
    void navigate({
      to: "/dept/courses/$courseId",
      params: { courseId: course.id },
    });

  const columns = buildColumns(t);

  const worklistFilter: FilterDef = {
    id: "worklist",
    label: t("dept_courses.filter_label"),
    allLabel: t("dept_courses.filter_all"),
    options: [
      {
        value: "needs_teacher",
        label: t("dept_courses.filter_needs_teacher"),
      },
      { value: "no_content", label: t("dept_courses.filter_no_content") },
      { value: "draft", label: t("dept_courses.filter_draft") },
    ],
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("dept_courses.title")}
        subtitle={t("dept_courses.subtitle")}
        action={
          canCreate ? (
            <Link to="/management/courses/new" className="shrink-0">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("dept_courses.new_course", { defaultValue: "New course" })}
              </Button>
            </Link>
          ) : undefined
        }
      />

      {!enabled || list.isLoading ? (
        <PageSkeleton rows={5} rounded="rounded-lg" bg="bg-surface-muted" />
      ) : list.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("dept_courses.load_failed")}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={courses}
          getRowId={(c) => c.id}
          onRowClick={onRowClick}
          actions={(course) => (
            <RowActions course={course} canEnrol={canEnrol} canStaff={canStaff} t={t} />
          )}
          actionsHeader={t("dept_courses.col_actions")}
          pagination
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            query || worklist !== "all"
              ? t("dept_courses.empty_search", {
                  defaultValue: "No matching courses",
                })
              : t("dept_courses.empty_title")
          }
          toolbar={
            <DataTableToolbar
              search={query}
              onSearchChange={setQuery}
              searchPlaceholder={t("dept_courses.search_placeholder")}
              filters={[worklistFilter]}
              filterValues={{ worklist }}
              onFilterChange={(_id, value) =>
                setWorklist((value as WorklistFilter) ?? "all")
              }
              onResetAllFilters={() => setWorklist("all")}
              clearLabel={t("dept_courses.filter_clear")}
              trailing={
                <p className="text-xs text-text-muted">
                  {t("dept_courses.count", { count: courses.length })}
                </p>
              }
            />
          }
        />
      )}
    </div>
  );
}

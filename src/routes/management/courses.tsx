import { useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, Plus, Upload, UserPlus, Users, X } from "lucide-react";
import { useDeptCourses } from "@/lib/api/hooks/dept";
import { usePermissions } from "@/lib/auth/use-permissions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CourseStatusBadge } from "@/components/ui/status-badges";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
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
import { ImportSyllabusDialog } from "./_components/courses/ImportSyllabusDialog";
import { useOrgUnitTree, type OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import { findNode } from "@/lib/org-unit-tree-helpers";
import { useMe } from "@/lib/api/hooks/auth";
import { useFacultyFilter } from "./_components/courses/use-faculty-filter";

/**
 * Manager/HOD course worklist — the merged view that replaced the old
 * "/management/courses" (Team management) and "/management/enrolment" (Enrolment) pair,
 * which were the same list rendered twice with different row links.
 *
 * One table, two row actions:
 *   * Enrol      → /management/courses/{id}/enrollments   (enrollment.create)
 *   * Teachers   → /dept/courses/{id}?tab=teachers        (assign_teacher)
 *
 * An HOD reaches this page on ``course.enrollment.read`` + ``assign_teacher``
 * but sees only the Teachers action — enrolment is manager-owned.
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
  // Enrollment is always unlimited — no cap to show, just the current count.
  return (
    <span className="text-sm tabular-nums text-text-strong">
      {course.student_count}
    </span>
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
          to="/management/courses/$courseId"
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
      id: "faculty",
      header: t("dept_courses.col_faculty"),
      sortable: true,
      // Unassigned sorts LAST under ascending order rather than first: the
      // column exists to find a course's owner, and a block of blanks at the
      // top buries the rows that answer that.
      sortValue: (c) => c.faculty_name?.toLowerCase() ?? "\uffff",
      cell: (c) => <FacultyCell course={c} t={t} />,
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

/**
 * The owning faculty, or an explicit "unassigned" marker.
 *
 * Renders `faculty_name` from the server rather than resolving `faculty_id`
 * client-side: the id alone would need one lookup per row, and the server
 * already omits the name for a RETIRED faculty so a stale pointer reads as
 * unassigned instead of naming a faculty that no longer exists.
 */
function FacultyCell({
  course,
  t,
}: {
  course: CourseAuthoring;
  t: TFn;
}) {
  if (!course.faculty_name) {
    return (
      <span className="text-xs text-text-subtle">
        {t("dept_courses.faculty_unassigned")}
      </span>
    );
  }
  return <span className="text-sm">{course.faculty_name}</span>;
}

function buildWorklistFilter(t: TFn): FilterDef {
  return {
    id: "worklist",
    label: t("dept_courses.filter_label"),
    allLabel: t("dept_courses.filter_all"),
    options: [
      { value: "needs_teacher", label: t("dept_courses.filter_needs_teacher") },
      { value: "no_content", label: t("dept_courses.filter_no_content") },
      { value: "draft", label: t("dept_courses.filter_draft") },
    ],
  };
}

function buildFacultyFilter(
  t: TFn,
  options: { value: string; label: string }[],
): FilterDef {
  return {
    id: "faculty",
    label: t("dept_courses.faculty_filter_label"),
    allLabel: t("dept_courses.faculty_filter_all"),
    options,
  };
}

export default function DeptCoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [query, setQuery] = useState("");
  const [worklist, setWorklist] = useState<WorklistFilter>("all");
  const [importOpen, setImportOpen] = useState(false);
  // ?unit= scopes the list to one org unit and its subtree. It lives in the
  // URL rather than component state so the org tree can link straight into a
  // scoped list, and the scoped view stays shareable and back-button safe.
  const { unit: unitId } = useSearch({ strict: false }) as { unit?: string };

  // Two different questions, deliberately separate codes:
  //
  //  * canEnrol   — may the caller USE the enrolments page? That page (and the
  //    backend behind it) enforces ``course.enrollment.create``, so the row
  //    action must gate on exactly that. An HOD holds only ``.read``; folding
  //    ``.read`` in here handed them an Enrol button that redirected straight
  //    back to the dashboard with an error toast.
  //  * canSeeRoster — may the caller see this worklist at all? Roster reading
  //    is enough, so ``.read`` still opens the page (just without the button).
  const canEnrol = permissions.hasAny(
    "course.enrollment.create",
    "system.administer",
  );
  const canSeeRoster = permissions.hasAny(
    "course.enrollment.read",
    "system.administer",
  );
  const canStaff = permissions.hasAny(
    "course.assign_teacher",
    "system.administer",
  );
  // Merged gate: anyone who could see either of the two old pages.
  const canRead = canStaff || canEnrol || canSeeRoster;
  const canCreate = permissions.hasAny("course.create", "system.administer");
  // The importer WRITES learning outcomes, which the backend gates on
  // `learning_outcome.manage` on top of `course.create` — a teacher holding
  // only `course.create` would get a 403. Mirror both here so the button is
  // absent rather than broken.
  const canImport =
    canCreate &&
    permissions.hasAny("learning_outcome.manage", "system.administer");

  const enabled = !permissions.isLoading && canRead;
  const me = useMe();
  const list = useDeptCourses(unitId);
  // Only to name the active scope chip; the filtering itself is server-side.
  const unitTree = useOrgUnitTree(
    unitId ? (me.data?.organization_id ?? undefined) : undefined,
  );
  const scopedUnit: OrgUnitNode | null = unitId
    ? findNode(unitTree.data ?? [], unitId)
    : null;

  // Faculty filter (state + options + the auto-default). Extracted to a hook
  // because this component already breached the line/complexity caps.
  const facultyFilterState = useFacultyFilter(list.data);
  const faculty = facultyFilterState.value;
  const setFaculty = facultyFilterState.setValue;
  const facultyOptions = facultyFilterState.options;

  const courses = useMemo(() => {
    let all = list.data ?? [];
    if (faculty !== "all") {
      all = all.filter((c) => c.faculty_id === faculty);
    }
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
    return <PermissionDenied />;
  }

  if (!canRead) {
    return null;
  }

  const onRowClick = (course: CourseAuthoring) =>
    void navigate({
      to: "/management/courses/$courseId",
      params: { courseId: course.id },
    });

  const columns = buildColumns(t);

  // Faculty filter is OMITTED, not shown empty, when no course on the page has
  // a faculty: a lone "All" dropdown is a control that cannot do anything.
  // Routes on `id` now that there are two filters — the previous handler
  // ignored it and sent every change to the worklist.
  const handleFilterChange = (id: string, value: string | undefined) => {
    if (id === "faculty") {
      setFaculty(value ?? "all");
      return;
    }
    setWorklist((value as WorklistFilter) ?? "all");
  };

  const filters: FilterDef[] =
    facultyOptions.length > 0
      ? [buildWorklistFilter(t), buildFacultyFilter(t, facultyOptions)]
      : [buildWorklistFilter(t)];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("dept_courses.title")}
        subtitle={t("dept_courses.subtitle")}
        action={
          canCreate ? (
            <div className="flex shrink-0 items-center gap-2">
              {canImport ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  {t("dept_courses.import_syllabus.action")}
                </Button>
              ) : null}
              <Link to="/management/courses/new">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("dept_courses.new_course", { defaultValue: "New course" })}
                </Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {canImport ? (
        <ImportSyllabusDialog open={importOpen} onOpenChange={setImportOpen} />
      ) : null}

      {/* Active org-unit scope. Shown whenever ?unit= is set so the list is
          never silently filtered — a short list with no explanation reads as
          missing data. Clearing it drops the param, restoring the caller's
          own derived scope. */}
      {unitId ? (
        <div className="flex items-center gap-2 rounded-lg border border-m3-primary/30 bg-m3-primary-fixed/40 px-3 py-2">
          <span className="text-xs text-m3-on-surface-variant">
            {t("dept_courses.scope_label")}
          </span>
          <span className="text-sm font-semibold text-m3-primary">
            {scopedUnit?.name ?? t("dept_courses.scope_unknown")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 text-xs"
            onClick={() => void navigate({ to: "/management/courses", search: {} })}
          >
            <X className="h-3.5 w-3.5" />
            {t("dept_courses.scope_clear")}
          </Button>
        </div>
      ) : null}

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
              filters={filters}
              filterValues={{ worklist, faculty }}
              onFilterChange={handleFilterChange}
              onResetAllFilters={() => {
                setWorklist("all");
                setFaculty("all");
              }}
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

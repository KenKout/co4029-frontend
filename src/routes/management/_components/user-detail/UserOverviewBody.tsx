import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  Clock,
  Mail,
  Map as MapIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, avatarColor, avatarInitials } from "@/components/ui/avatar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  CourseEnrollmentStatusBadge,
  CourseStatusBadge,
  UserStatusBadge as StatusBadge,
} from "@/components/ui/status-badges";
import { useFormatDate } from "@/lib/format/date";
import type {
  UserCareerPathProgressRead,
  UserCourseProgressRead,
  UserOverview,
} from "@/lib/api/types/user-overview";

import { ProgramsTable } from "./ProgramsTable";
import type { ManagerUserDetailController } from "./use-manager-user-detail";

/** Error / loading / loaded switch for the manager user-detail body. */
export function UserOverviewBody({ c }: { c: ManagerUserDetailController }) {
  const { t, isError, isLoading, data } = c;

  if (isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("management_users.detail.load_failed", {
            defaultValue: "Failed to load user details.",
          })}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <PageSkeleton rows={2} rounded="rounded-lg" className="pb-6" />
      </div>
    );
  }

  const hasStudentSections =
    data.courses.length > 0 ||
    data.career_paths.length > 0 ||
    (data.programs?.length ?? 0) > 0;
  const hasTeacherSections = data.assigned_courses.length > 0;

  return (
    <div className="space-y-6">
      <IdentityCard data={data} />

      {hasStudentSections && <StudentSections data={data} />}

      {hasTeacherSections && <TeacherSections data={data} />}

      {!hasStudentSections && !hasTeacherSections && (
        <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-6 text-center">
          <p className="text-sm text-m3-on-surface-variant">
            {t("management_users.detail.no_learning_data", {
              defaultValue:
                "This account has no learning activity to show — managers, HODs and admins only expose identity here.",
            })}
          </p>
        </div>
      )}
    </div>
  );
}

/** Avatar + identity card, mirroring the admin user-detail header (no actions). */
function IdentityCard({ data }: { data: UserOverview }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const u = data.user;
  const displayName = u.profile?.display_name?.trim() || u.primary_email;
  const roles = u.roles ?? [];

  return (
    <div className="bg-surface-elev border border-border rounded-xl p-6">
      <div className="flex items-start gap-4">
        <Avatar size="lg" className={avatarColor(u.id)}>
          <AvatarFallback>{avatarInitials(displayName, { uppercase: true })}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-headline font-bold text-text-strong truncate">
              {displayName}
            </h1>
            <StatusBadge status={u.status} />
          </div>
          <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{u.primary_email}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
              <Briefcase className="h-3 w-3" />
              {roles.length > 0
                ? roles.join(", ")
                : t("management_users.detail.no_roles", { defaultValue: "No roles" })}
            </span>
            {u.organization_name && (
              <span className="inline-flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
                <MapIcon className="h-3 w-3" />
                {u.organization_name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
              <Clock className="h-3 w-3" />
              {t("management_users.detail.joined", { defaultValue: "Joined" })}:{" "}
              {formatDate(u.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Last-active banner + the two student tables (courses, career paths). */
function StudentSections({ data }: { data: UserOverview }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();

  return (
    <>
      {data.last_active_at && (
        <div className="rounded-xl bg-m3-primary-fixed/30 border border-m3-primary/20 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_users.detail.last_active", {
              defaultValue: "Last active",
            })}
          </p>
          <p className="text-sm font-semibold text-m3-on-surface mt-1">
            {formatDate(data.last_active_at)}
          </p>
        </div>
      )}

      {data.courses.length > 0 && <CoursesTable courses={data.courses} />}

      {(data.programs?.length ?? 0) > 0 && (
        <ProgramsTable programs={data.programs} />
      )}

      {data.career_paths.length > 0 && (
        <CareerPathsTable paths={data.career_paths} />
      )}
    </>
  );
}

/** Student's enrolled courses: DataTable + toolbar, row click opens /dept/courses/:id. */
function CoursesTable({ courses }: { courses: UserCourseProgressRead[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [courses, search]);

  const columns: DataTableColumn<UserCourseProgressRead>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("management_users.detail.cols.course", {
          defaultValue: "Course",
        }),
        cell: (course) => (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-strong truncate">
              {course.title}
            </p>
            <p className="text-[11px] font-mono text-text-muted truncate mt-0.5">
              {course.slug}
            </p>
          </div>
        ),
      },
      {
        id: "course_status",
        header: t("management_users.detail.cols.course_status", {
          defaultValue: "Course status",
        }),
        cell: (course) => <CourseStatusBadge status={course.status} />,
      },
      {
        id: "enrollment_status",
        header: t("management_users.detail.cols.enrollment_status", {
          defaultValue: "Enrollment",
        }),
        cell: (course) => (
          <CourseEnrollmentStatusBadge status={course.enrollment_status} />
        ),
      },
      {
        id: "progress",
        header: t("management_users.detail.cols.progress", {
          defaultValue: "Progress",
        }),
        cell: (course) => (
          <div className="flex items-center gap-3 min-w-[180px]">
            <GradientProgress
              value={course.completion_percent}
              size="sm"
              className="flex-1"
            />
            <span className="text-xs font-semibold text-text-strong whitespace-nowrap">
              {course.completed_lessons}/{course.total_lessons}
            </span>
            <span className="text-[11px] text-text-muted whitespace-nowrap w-10 text-right">
              {Math.round(course.completion_percent)}%
            </span>
          </div>
        ),
      },
      {
        // `enrolled_at` was always on the wire and never rendered — half the
        // "enrolment history" ask was already paid for.
        id: "enrolled",
        header: t("management_users.detail.cols.enrolled", {
          defaultValue: "Enrolled",
        }),
        sortable: true,
        sortValue: (course) => course.enrolled_at,
        cell: (course) => (
          <span className="whitespace-nowrap text-xs text-text-muted">
            {formatDate(course.enrolled_at)}
          </span>
        ),
      },
    ],
    [t, formatDate],
  );

  return (
    <section>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(c) => c.course_id}
        onRowClick={(course) =>
          void navigate({
            to: "/management/courses/$courseId",
            params: { courseId: course.course_id },
          })
        }
        emptyState={t("management_users.detail.no_courses_match", {
          defaultValue: "No matching courses",
        })}
        toolbar={
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("management_users.detail.search_courses", {
              defaultValue: "Search courses…",
            })}
          />
        }
      />
    </section>
  );
}

/** Student's career paths: DataTable + toolbar, row click opens the path detail. */
function CareerPathsTable({ paths }: { paths: UserCareerPathProgressRead[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return paths;
    return paths.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [paths, search]);

  const columns: DataTableColumn<UserCareerPathProgressRead>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("management_users.detail.cols.path", {
          defaultValue: "Career path",
        }),
        cell: (path) => (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-strong truncate">
              {path.name}
            </p>
            <p className="text-[11px] font-mono text-text-muted truncate mt-0.5">
              {path.slug}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("management_users.detail.cols.path_status", {
          defaultValue: "Status",
        }),
        cell: (path) => <CourseEnrollmentStatusBadge status={path.status} />,
      },
      {
        id: "progress",
        header: t("management_users.detail.cols.progress", {
          defaultValue: "Progress",
        }),
        cell: (path) => (
          <div className="flex items-center gap-3 min-w-[180px]">
            <GradientProgress
              value={path.completion_percent}
              size="sm"
              className="flex-1"
            />
            <span className="text-xs font-semibold text-text-strong whitespace-nowrap">
              {t("management_users.detail.completed_courses", {
                defaultValue: "{{done}}/{{total}}",
                done: path.completed_courses,
                total: path.course_count,
              })}
            </span>
          </div>
        ),
      },
      {
        id: "timeline",
        header: t("management_users.detail.cols.timeline", {
          defaultValue: "Timeline",
        }),
        sortable: true,
        sortValue: (path) => path.started_at,
        cell: (path) => (
          <span className="whitespace-nowrap text-xs text-text-muted">
            {formatDate(path.started_at)}
            {path.completed_at ? ` → ${formatDate(path.completed_at)}` : ""}
          </span>
        ),
      },
    ],
    [t, formatDate],
  );

  return (
    <section>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(p) => p.career_path_id}
        onRowClick={(path) =>
          void navigate({
            to: "/management/career-paths/$id",
            params: { id: path.career_path_id },
          })
        }
        emptyState={t("management_users.detail.no_paths_match", {
          defaultValue: "No matching career paths",
        })}
        toolbar={
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("management_users.detail.search_paths", {
              defaultValue: "Search career paths…",
            })}
          />
        }
      />
    </section>
  );
}

/** Teacher section: courses assigned to teach (row click → course detail). */
function TeacherSections({ data }: { data: UserOverview }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.assigned_courses;
    return data.assigned_courses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [data.assigned_courses, search]);

  const columns = useMemo(
    () => [
      {
        id: "title",
        header: t("management_users.detail.cols.course", {
          defaultValue: "Course",
        }),
        cell: (course: { course_id: string; title: string; slug: string; status: string }) => (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-strong truncate">
              {course.title}
            </p>
            <p className="text-[11px] font-mono text-text-muted truncate mt-0.5">
              {course.slug}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("management_users.detail.cols.course_status", {
          defaultValue: "Course status",
        }),
        cell: (course: { status: string }) => <CourseStatusBadge status={course.status} />,
      },
    ],
    [t],
  );

  return (
    <section>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(c) => c.course_id}
        onRowClick={(course) =>
          void navigate({
            to: "/management/courses/$courseId",
            params: { courseId: course.course_id },
          })
        }
        emptyState={t("management_users.detail.no_courses_match", {
          defaultValue: "No matching courses",
        })}
        toolbar={
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("management_users.detail.search_courses", {
              defaultValue: "Search courses…",
            })}
          />
        }
      />
    </section>
  );
}

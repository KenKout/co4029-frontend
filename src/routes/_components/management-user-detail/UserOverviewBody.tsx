import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Briefcase,
  Clock,
  GraduationCap,
  Mail,
  Map as MapIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, avatarColor, avatarInitials } from "@/components/ui/avatar";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { UserStatusBadge as StatusBadge } from "@/components/ui/status-badges";
import { useFormatDate } from "@/lib/format/date";
import type {
  UserCareerPathProgressRead,
  UserCourseProgressRead,
  UserOverview,
} from "@/lib/api/types/user-overview";

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

  const hasStudentSections = data.courses.length > 0 || data.career_paths.length > 0;
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

/** Student sections: enrolled courses + career paths + last active time. */
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

      {data.courses.length > 0 && (
        <section className="bg-surface-elev border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t("management_users.detail.courses_title", {
              defaultValue: "Courses",
            })}
          </h2>
          <div className="mt-3 space-y-2">
            {data.courses.map((course) => (
              <CourseRow key={course.course_id} course={course} />
            ))}
          </div>
        </section>
      )}

      {data.career_paths.length > 0 && (
        <section className="bg-surface-elev border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {t("management_users.detail.career_paths_title", {
              defaultValue: "Career paths",
            })}
          </h2>
          <div className="mt-3 space-y-2">
            {data.career_paths.map((path) => (
              <CareerPathRow key={path.career_path_id} path={path} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** One enrolled course: title, enrolment status, completion bar. */
function CourseRow({ course }: { course: UserCourseProgressRead }) {
  const { t } = useTranslation();
  const percent = Math.min(100, Math.max(0, course.completion_percent));
  const statusLabel = t(`management_users.detail.enrollment_status.${course.enrollment_status}`, {
    defaultValue: course.enrollment_status,
  });

  return (
    <div className="rounded-xl bg-m3-surface-container-low ghost-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-m3-on-surface truncate">{course.title}</p>
          <p className="text-[11px] font-mono text-m3-on-surface-variant truncate mt-0.5">
            {course.slug}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-m3-on-surface-variant shrink-0">
          {statusLabel}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 bg-m3-surface-container rounded-full overflow-hidden">
          <div className="h-full bg-m3-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs font-semibold text-m3-on-surface shrink-0">
          {course.completed_lessons}/{course.total_lessons}
        </span>
        <span className="text-[11px] text-m3-on-surface-variant shrink-0 w-11 text-right">
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

/** One career path: name, status, completed-courses counter. */
function CareerPathRow({ path }: { path: UserCareerPathProgressRead }) {
  const { t } = useTranslation();
  const percent = Math.min(100, Math.max(0, path.completion_percent));
  const statusLabel = t(`management_users.detail.path_status.${path.status}`, {
    defaultValue: path.status,
  });

  return (
    <div className="rounded-xl bg-m3-surface-container-low ghost-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-m3-on-surface truncate">{path.name}</p>
          <p className="text-[11px] font-mono text-m3-on-surface-variant truncate mt-0.5">
            {path.slug}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-m3-on-surface-variant shrink-0">
          {statusLabel}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 bg-m3-surface-container rounded-full overflow-hidden">
          <div className="h-full bg-m3-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs font-semibold text-m3-on-surface shrink-0">
          {t("management_users.detail.completed_courses", {
            defaultValue: "{{done}}/{{total}} courses",
            done: path.completed_courses,
            total: path.course_count,
          })}
        </span>
      </div>
    </div>
  );
}

/** Teacher section: courses assigned to teach. */
function TeacherSections({ data }: { data: UserOverview }) {
  const { t } = useTranslation();

  return (
    <section className="bg-surface-elev border border-border rounded-xl p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        {t("management_users.detail.assigned_courses_title", {
          defaultValue: "Assigned courses",
        })}
      </h2>
      <div className="mt-3 space-y-2">
        {data.assigned_courses.map((course) => (
          <div
            key={course.course_id}
            className="rounded-xl bg-m3-surface-container-low ghost-border p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-m3-on-surface truncate">{course.title}</p>
              <p className="text-[11px] font-mono text-m3-on-surface-variant truncate mt-0.5">
                {course.slug}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-m3-on-surface-variant shrink-0">
              {t(`management_users.detail.course_status.${course.status}`, {
                defaultValue: course.status,
              })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

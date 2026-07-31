import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ChevronRight, GraduationCap, Users } from "lucide-react";
import { useDeptCourses } from "@/lib/api/hooks/dept";
import { usePermissions } from "@/lib/auth/use-permissions";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { COURSE_STATUS_TOKENS } from "@/lib/status-tokens";
import type { CourseAuthoring } from "@/lib/api/types";

/**
 * Enrolment hub for managers. Enrolment is managed per-course
 * (``/management/courses/{id}/enrollments`` needs a courseId), so the sidebar
 * can't deep-link straight to it — this page is the landing target: it lists
 * the organisation's courses and each row opens that course's enrolment
 * management (add / bulk import / invitation codes).
 *
 * Distinct from the ``Courses`` set (course lifecycle + teacher assignment) so
 * the manager's student-management responsibility has its own home.
 */
export default function ManagementEnrolmentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();

  const canManage = permissions.hasAny(
    "course.enrollment.create",
    "course.enrollment.read",
    "system.administer",
  );

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canManage) {
      toast.error(t("management_enrolment.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canManage, navigate, t]);

  const enabled = !permissions.isLoading && canManage;
  const list = useDeptCourses();

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-surface-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!canManage) return null;

  const courses = (list.data ?? []) as CourseAuthoring[];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("management_enrolment.title")}
        subtitle={t("management_enrolment.subtitle")}
      />

      {!enabled || list.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-surface-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {t("management_enrolment.empty_title")}
          </p>
          <p className="text-xs mt-1">{t("management_enrolment.empty_body")}</p>
        </div>
      ) : (
        <div>
          {courses.map((course) => (
            <Link
              key={course.id}
              to="/management/courses/$courseId/enrollments"
              params={{ courseId: course.id }}
              className="block bg-surface-elev border border-border rounded-lg p-4 mb-2 hover:border-border-strong hover:shadow-editorial transition-colors duration-150"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-md bg-m3-primary-fixed flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-m3-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-strong truncate">
                    {course.title}
                  </p>
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {course.slug}
                  </p>
                </div>
                <StatusBadge
                  status={course.status}
                  tokens={COURSE_STATUS_TOKENS}
                  size="11px"
                  label={t(`dept_courses.status.${course.status}`, {
                    defaultValue: course.status,
                  })}
                />
                <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronRight, Plus, Users } from "lucide-react";
import { useDeptCourses } from "@/lib/api/hooks/dept";
import { usePermissions } from "@/lib/auth/use-permissions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { COURSE_STATUS_TOKENS } from "@/lib/status-tokens";
import type { CourseAuthoring } from "@/lib/api/types";

function CourseRow({ course }: { course: CourseAuthoring }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/dept/courses/$courseId"
      params={{ courseId: course.id }}
      className="block bg-surface-elev border border-border rounded-lg p-4 mb-2 hover:border-border-strong hover:shadow-editorial transition-colors duration-150"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-md bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-m3-primary" />
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
  );
}

export default function DeptCoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();

  const canAssign = permissions.hasAny(
    "course.assign_teacher",
    "system.administer",
  );
  const canRead = canAssign || permissions.has("course.enrollment.read");
  const canCreate = permissions.hasAny("course.create", "system.administer");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canRead) {
      toast.error(t("dept_courses.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canRead, navigate, t]);

  const enabled = !permissions.isLoading && canRead;
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

  if (!canRead) {
    return null;
  }

  const courses = list.data ?? [];

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
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-surface-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : list.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("dept_courses.load_failed")}</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
          <p className="text-sm font-medium text-text-strong">
            {t("dept_courses.empty_title")}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {t("dept_courses.empty_body")}
          </p>
          {canCreate && (
            <Link to="/management/courses/new">
              <Button size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                {t("dept_courses.new_course", { defaultValue: "New course" })}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div>
          {courses.map((course) => (
            <CourseRow key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

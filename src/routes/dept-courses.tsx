import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronRight, Users } from "lucide-react";
import { useDeptCourses } from "@/lib/api/hooks/dept";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import type { CourseAuthoring } from "@/lib/api/types";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  const label = t(`dept_courses.status.${status}`, { defaultValue: status });
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
    >
      {label}
    </span>
  );
}

function CourseRow({ course }: { course: CourseAuthoring }) {
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
        <StatusBadge status={course.status} />
        <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
      </div>
    </Link>
  );
}

export default function DeptCoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = useMyPermissions();
  const perms = permissions.data?.permissions ?? [];

  const canAssign =
    perms.includes("course.assign_teacher") ||
    perms.includes("system.administer");
  const canRead = canAssign || perms.includes("course.enrollment.read");

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
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("dept_courses.title")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("dept_courses.subtitle")}
        </p>
      </div>

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

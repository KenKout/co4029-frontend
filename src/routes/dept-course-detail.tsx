import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import {
  useCourseRoster,
  useCourseTeachers,
  useDeptCourses,
} from "@/lib/api/hooks/dept";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { DeptStudentsTab } from "./_components/dept-course-detail/StudentsTab";
import { DeptTeachersTab } from "./_components/dept-course-detail/TeachersTab";
import { Tabs } from "@/components/ui/tabs";
import type { TabKey } from "./_components/dept-course-detail/types";

export default function DeptCourseDetailPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  const permissions = usePermissions();
  const canAssign = permissions.hasAny(
    "course.assign_teacher",
    "system.administer",
  );
  const canRead = canAssign || permissions.has("course.enrollment.read");

  useRequirePermission(canRead, {
    messageKey: "dept_course_detail.no_permission",
  });

  const enabled = !permissions.isLoading && canRead;

  const courses = useDeptCourses();
  const course = courses.data?.find((c) => c.id === courseId);

  const teachers = useCourseTeachers(enabled ? courseId : undefined);
  const roster = useCourseRoster(enabled ? courseId : undefined);

  const [tab, setTab] = useState<TabKey>("teachers");

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-16 bg-surface-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!canRead) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          to="/dept"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-m3-primary transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("dept_course_detail.back")}
        </Link>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {course?.title ?? t("dept_course_detail.course_fallback")}
        </h1>
        {course?.slug && (
          <p className="text-sm text-text-muted mt-1">{course.slug}</p>
        )}
      </div>

      <Tabs
        variant="contained"
        value={tab}
        onChange={setTab}
        ariaLabel={t("dept_course_detail.title")}
        tabs={[
          {
            key: "teachers" as TabKey,
            label: t("dept_course_detail.tabs.teachers"),
            count: teachers.data?.length,
          },
          {
            key: "students" as TabKey,
            label: t("dept_course_detail.tabs.students"),
            count: roster.data?.length,
          },
        ]}
      />

      <DeptTeachersTab
        active={tab === "teachers"}
        teachers={teachers}
        canAssign={canAssign}
        courseId={courseId}
      />

      <DeptStudentsTab
        active={tab === "students"}
        roster={roster}
        canAssign={canAssign}
        courseId={courseId}
      />
    </div>
  );
}

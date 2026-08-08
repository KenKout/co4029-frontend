import { useState } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  useCourseRoster,
  useCourseTeachers,
  useDeptCourses,
} from "@/lib/api/hooks/dept";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { DeptCourseHeader } from "./_components/dept-course-detail/DeptCourseHeader";
import { DeptSettingsTab } from "./_components/dept-course-detail/SettingsTab";
import { DeptStudentsTab } from "./_components/dept-course-detail/StudentsTab";
import { DeptTeachersTab } from "./_components/dept-course-detail/TeachersTab";
import { Tabs } from "@/components/ui/tabs";
import type { TabKey } from "./_components/dept-course-detail/types";

const TAB_KEYS: TabKey[] = ["teachers", "students", "settings"];

export default function DeptCourseDetailPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  // ?tab= deep-links (the worklist's Teachers action); anything unknown
  // falls back to the default tab. settings is manager-only, so a deep-link
  // must not force it for someone who cannot see the tab.
  const { tab: tabParam } = useSearch({ strict: false });

  const permissions = usePermissions();
  const canAssign = permissions.hasAny(
    "course.assign_teacher",
    "system.administer",
  );
  const canRead = canAssign || permissions.has("course.enrollment.read");
  // Course deletion is manager-owned (``course.delete``) — teachers and HOD
  // never see the button, matching the backend gate on the same code.
  const canDelete = permissions.hasAny("course.delete", "system.administer");

  useRequirePermission(canRead, {
    messageKey: "dept_course_detail.no_permission",
  });

  const enabled = !permissions.isLoading && canRead;

  const courses = useDeptCourses();
  const course = courses.data?.find((c) => c.id === courseId);

  const teachers = useCourseTeachers(enabled ? courseId : undefined);
  const roster = useCourseRoster(enabled ? courseId : undefined);

  const initialTab: TabKey =
    TAB_KEYS.includes(tabParam as TabKey) &&
    (tabParam !== "settings" || canDelete)
      ? (tabParam as TabKey)
      : "teachers";
  const [tab, setTab] = useState<TabKey>(initialTab);

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
      <DeptCourseHeader course={course} courseId={courseId} canDelete={canDelete} />

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
          // Course settings + learning outcomes live behind course.delete /
          // learning_outcome.manage, so the tab only appears for a manager.
          ...(canDelete
            ? [
                {
                  key: "settings" as TabKey,
                  label: t("dept_course_detail.tabs.settings"),
                },
              ]
            : []),
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

      {canDelete && (
        <DeptSettingsTab active={tab === "settings"} courseId={courseId} />
      )}
    </div>
  );
}

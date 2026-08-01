import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import { BulkTab } from "@/routes/_components/management-course-enrollments/BulkTab";
import { CodesTab } from "@/routes/_components/management-course-enrollments/CodesTab";
import { PageHeader } from "@/routes/_components/management-course-enrollments/PageHeader";
import { RosterTab } from "@/routes/_components/management-course-enrollments/RosterTab";
import { TabBar } from "@/routes/_components/management-course-enrollments/TabBar";
import type { TabKey } from "@/routes/_components/management-course-enrollments/types";

/**
 * Enrollment management for one course. This module is the orchestrator only:
 * permission gate, course lookup and which tab is showing. The roster table, the
 * bulk import flow and the invitation-code manager each own their own state in
 * `_components/management-course-enrollments/`.
 */
export default function ManagementCourseEnrollmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  const permissions = usePermissions();
  const canManage = permissions.hasAny(
    "course.enrollment.create",
    "system.administer",
  );

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canManage) {
      toast.error(t("management_course_enrollments.errors.no_access"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canManage, navigate, t]);

  const enabled = !permissions.isLoading && canManage;
  const { data: course } = useTeacherCourseById(enabled ? courseId : "");

  const [tab, setTab] = useState<TabKey>("roster");

  if (permissions.isLoading || !enabled) {
    return (
      <PageSkeleton
        rows={3}
        rounded="rounded-lg"
        bg="bg-surface-muted"
        className="pb-12"
      />
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-16 space-y-6">
      <PageHeader courseId={courseId} courseTitle={course?.title} />

      <TabBar tab={tab} onSelect={setTab} />

      {tab === "roster" && <RosterTab courseId={courseId} />}
      {tab === "bulk" && <BulkTab courseId={courseId} />}
      {tab === "codes" && <CodesTab courseId={courseId} />}
    </div>
  );
}

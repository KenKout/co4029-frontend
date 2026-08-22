import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import { BulkTab } from "@/routes/management/_components/course-enrollments/BulkTab";
import { CodesTab } from "@/routes/management/_components/course-enrollments/CodesTab";
import { PageHeader } from "@/routes/management/_components/course-enrollments/PageHeader";
import { RosterTab } from "@/routes/management/_components/course-enrollments/RosterTab";
import { TabBar } from "@/routes/management/_components/course-enrollments/TabBar";
import type { TabKey } from "@/routes/management/_components/course-enrollments/types";

/**
 * Enrollment management for one course. This module is the orchestrator only:
 * permission gate, course lookup and which tab is showing. The roster table, the
 * bulk import flow and the invitation-code manager each own their own state in
 * `_components/management-course-enrollments/`.
 */
export default function ManagementCourseEnrollmentsPage() {
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  const permissions = usePermissions();
  const canManage = permissions.hasAny(
    "course.enrollment.create",
    "system.administer",
  );

  const enabled = !permissions.isLoading && canManage;
  const { data: course } = useTeacherCourseById(enabled ? courseId : "");

  const [tab, setTab] = useState<TabKey>("roster");

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

  if (!canManage) {
    return <PermissionDenied />;
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

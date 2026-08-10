import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PermissionDenied } from "@/components/ui/permission-denied";

import { CourseAuditSection } from "./_components/course-detail/CourseAuditSection";
import { CourseDetailHeader } from "./_components/course-detail/CourseDetailHeader";
import { RecentJobsSection } from "./_components/course-detail/RecentJobsSection";
import { useAdminCourseDetail } from "./_components/course-detail/use-admin-course-detail";

export default function AdminCourseDetailPage() {
  const c = useAdminCourseDetail();
  const { t } = c;

  if (c.permissionsLoading) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-24 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!c.canAdmin) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("sections.admin"), to: "/admin/stats" },
          { label: t("nav.courses"), to: "/admin/courses" },
          { label: t("admin.course_detail.title") },
        ]}
      />
      <Link
        to="/admin/courses"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.course_detail.back_to_list")}
      </Link>

      <CourseDetailHeader c={c} />

      <CourseAuditSection c={c} />

      <RecentJobsSection c={c} />
    </div>
  );
}

import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import {
  useCourseAudit,
  useCourseProcessingJobs,
  useRestoreCourse,
} from "@/lib/api/hooks/admin";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";

import { useFormatters } from "./use-formatters";

/**
 * Permission gate, audit/jobs queries and the restore mutation.
 *
 * Hook call order is identical to the original component body: translation →
 * formatters → route params → permissions → the permission requirement →
 * audit query → jobs query → restore mutation.
 */
export function useAdminCourseDetail() {
  const { t } = useTranslation();
  const f = useFormatters();
  const params = useParams({ strict: false }) as { courseId?: string };
  const courseId = params.courseId ?? "";

  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  useRequirePermission(canAdmin, {
    messageKey: "common.no_permission",
  });

  const enabled = !permissions.isLoading && canAdmin && Boolean(courseId);
  const audit = useCourseAudit(enabled ? courseId : "");
  const jobs = useCourseProcessingJobs(enabled ? courseId : "", 20);
  const restore = useRestoreCourse();

  const handleRestore = () => {
    restore.mutate(courseId, {
      onSuccess: () => toast.success(t("admin.course_detail.toasts.restored")),
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("admin.course_detail.toasts.restore_failed"),
        ),
    });
  };

  return {
    t,
    f,
    courseId,
    permissionsLoading: permissions.isLoading,
    canAdmin,
    audit,
    jobs,
    restore,
    handleRestore,
  };
}

export type CourseDetailController = ReturnType<typeof useAdminCourseDetail>;

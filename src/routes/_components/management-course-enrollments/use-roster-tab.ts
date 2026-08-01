import { useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  useDeptEnrollments,
  useDropEnrollment,
} from "@/lib/api/hooks/enrollments";
import type { EnrollmentAuthoring } from "@/lib/api/types";

/**
 * Everything stateful behind the roster tab: the enrollment query, the drop
 * mutation and the id of the row currently asking for confirmation.
 *
 * Hook calls are in the exact order `RosterTab` used to make them (roster query
 * -> drop mutation -> local state), and `t` is injected so no extra
 * `useTranslation` is added.
 */
export function useRosterTab(courseId: string, t: TFunction) {
  const { data, isLoading, isError } = useDeptEnrollments(courseId);
  const drop = useDropEnrollment(courseId);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows: EnrollmentAuthoring[] = data ?? [];

  function handleDrop(userId: string) {
    drop.mutate(userId, {
      onSuccess: () => {
        toast.success(t("management_course_enrollments.toasts.dropped"));
        setConfirmId(null);
      },
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("management_course_enrollments.toasts.drop_failed"),
        ),
    });
  }

  return {
    isLoading,
    isError,
    drop,
    confirmId,
    setConfirmId,
    rows,
    handleDrop,
  };
}

export type RosterTabController = ReturnType<typeof useRosterTab>;

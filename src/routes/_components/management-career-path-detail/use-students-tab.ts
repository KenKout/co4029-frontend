import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { SelectableEntity } from "@/components/ui/entity-multi-select-dialog";
import { useAdminUsersSearch } from "@/lib/api/hooks/admin-organizations";
import {
  useAddCareerPathStudent,
  usePathReadinessOverview,
  useTeacherCareerPathProgress,
} from "@/lib/api/hooks/career-paths";
import { toStudentCandidates } from "./helpers";

/**
 * Everything stateful behind the students tab: the enrol mutation, the roster
 * progress + readiness queries, the debounced user search feeding the picker,
 * and the sequential enrol loop.
 *
 * Hook calls are in the exact order `StudentsTab` used to make them (add ->
 * progress -> readiness -> local state -> debounce effect -> user search ->
 * derived memos), and `t` is injected so no extra `useTranslation` is added.
 */
export function useStudentsTab(id: string, t: TFunction) {
  const add = useAddCareerPathStudent(id);
  const progress = useTeacherCareerPathProgress(id);
  const readiness = usePathReadinessOverview(id);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Debounce the search box so we don't fire /admin/users on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(studentQuery), 250);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  const search = useAdminUsersSearch(debouncedQuery, pickerOpen);

  const rows = progress.data ?? [];

  // Students already enrolled in this path — shown checked+disabled.
  const alreadyEnrolledIds = useMemo(
    () => new Set(rows.map((r) => r.student_id)),
    [rows],
  );
  const studentCandidates: SelectableEntity[] = useMemo(
    () => toStudentCandidates(search.data),
    [search.data],
  );

  async function handleConfirmStudents(selected: SelectableEntity[]) {
    setSubmitting(true);
    let ok = 0;
    // Single-item enroll route only; loop so one failure doesn't abort the rest.
    for (const entity of selected) {
      try {
        await add.mutateAsync({ student_id: entity.id });
        ok += 1;
      } catch (err) {
        toast.error(
          (err as Error).message ||
            t("management_career_path_detail.errors.add_student_failed"),
        );
      }
    }
    setSubmitting(false);
    if (ok > 0) {
      toast.success(
        t("management_career_path_detail.toasts.students_added", { count: ok }),
      );
    }
    setPickerOpen(false);
    setStudentQuery("");
  }

  function closePicker() {
    setPickerOpen(false);
    setStudentQuery("");
  }

  return {
    add,
    progress,
    readiness,
    pickerOpen,
    setPickerOpen,
    studentQuery,
    setStudentQuery,
    submitting,
    search,
    rows,
    alreadyEnrolledIds,
    studentCandidates,
    handleConfirmStudents,
    closePicker,
  };
}

export type StudentsTabController = ReturnType<typeof useStudentsTab>;

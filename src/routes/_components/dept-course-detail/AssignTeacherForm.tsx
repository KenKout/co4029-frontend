import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useAssignableTeachers, useAssignTeacher } from "@/lib/api/hooks/dept";
import { ApiError } from "@/lib/api/client";

/**
 * Pick a teacher to staff onto this course.
 *
 * This used to be a free-text box you pasted a user UUID into, which meant a
 * manager needed the id from somewhere else entirely. The options come from
 * `GET /dept/courses/{id}/assignable-teachers`, which resolves the
 * organization from the COURSE — the client sends no org parameter, so the
 * "same organization" rule cannot be bypassed by a crafted request. The POST
 * re-checks membership server-side for the same reason.
 *
 * Teachers already on the course are shown as such and cannot be re-picked,
 * since assigning them again is a no-op.
 */
export function AssignTeacherForm({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [userId, setUserId] = useState("");
  const assign = useAssignTeacher(courseId);
  const { data: candidates, isLoading } = useAssignableTeachers(courseId);

  // Teachers already on the course are filtered OUT rather than rendered
  // disabled: this Select primitive has no per-option disabled support (only a
  // whole-control `disabled`), so a disabled flag on an option would be
  // silently dropped and the manager could pick a no-op. They are already
  // visible in the teachers list right below this form.
  const available = (candidates ?? []).filter((c) => !c.already_assigned);
  const assignedCount = (candidates ?? []).length - available.length;

  const options = [
    { value: "", label: t("dept_course_detail.assign_placeholder") },
    ...available.map((teacher) => ({
      value: teacher.user_id,
      label: teacher.display_name
        ? `${teacher.display_name} · ${teacher.primary_email}`
        : teacher.primary_email,
    })),
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;
    assign.mutate(
      { user_id: userId },
      {
        onSuccess: () => {
          toast.success(t("dept_course_detail.success.assigned"));
          setUserId("");
        },
        onError: (err) => {
          const detail =
            err instanceof ApiError ? err.body || err.message : String(err);
          toast.error(t("dept_course_detail.errors.assign_failed", { detail }));
        },
      },
    );
  };

  const noCandidates = !isLoading && available.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-elev border border-border rounded-lg p-4 mb-4"
    >
      <label className="block text-xs font-semibold text-text-muted mb-2">
        {t("dept_course_detail.assign_label")}
      </label>
      <div className="flex gap-2">
        <Select
          value={userId}
          onValueChange={setUserId}
          options={options}
          disabled={assign.isPending || isLoading || noCandidates}
        />
        <Button type="submit" disabled={assign.isPending || !userId}>
          <UserPlus className="h-3.5 w-3.5" />
          {t("dept_course_detail.assign_button")}
        </Button>
      </div>
      <p className="text-[11px] text-text-muted mt-2">
        {noCandidates
          ? // Distinguish "everyone is already on it" from "this org has no
            // teachers" — they need different actions from the manager.
            assignedCount > 0
            ? t("dept_course_detail.assign_all_assigned")
            : t("dept_course_detail.assign_none_available")
          : t("dept_course_detail.assign_help")}
      </p>
    </form>
  );
}

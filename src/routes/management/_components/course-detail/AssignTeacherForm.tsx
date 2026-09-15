import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { useAssignableTeachers, useAssignTeacher } from "@/lib/api/hooks/dept";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

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
 *
 * Two title flags let the manager pick Course Instructor and/or Teacher
 * Assistant for the new teacher (user decision 2026-08-30 — both may be
 * checked; the first teacher on a course is always the Course Instructor
 * server-side regardless of what is sent).
 */
export function AssignTeacherForm({
  courseId,
  currentCount,
  maxCount,
}: {
  courseId: string;
  currentCount: number;
  /** Undefined until readiness loads — until then we cannot bound the count. */
  maxCount: number | undefined;
}) {
  const { t } = useTranslation();
  const [userIds, setUserIds] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isAssistant, setIsAssistant] = useState(true);
  const assign = useAssignTeacher(courseId);
  const { data: candidates, isLoading } = useAssignableTeachers(courseId);

  // Teachers already on the course are filtered OUT rather than rendered
  // disabled: the combobox has no per-option disabled support, so a disabled
  // flag on an option would be silently dropped and the manager could pick a
  // no-op. They are already visible in the teachers list right below this
  // form.
  const available = (candidates ?? []).filter((c) => !c.already_assigned);
  const assignedCount = (candidates ?? []).length - available.length;

  const atMax = maxCount !== undefined && currentCount >= maxCount;
  const remainingSlots =
    maxCount === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, maxCount - currentCount);

  // At least one title must stay checked (a course-scoped teacher cannot be
  // titleless — server CHECK + 409).
  const toggleInstructor = (next: boolean) => {
    setIsInstructor(next);
    if (next === false && !isAssistant) {
      setIsAssistant(true);
    }
  };
  const toggleAssistant = (next: boolean) => {
    setIsAssistant(next);
    if (next === false && !isInstructor) {
      setIsInstructor(true);
    }
  };

  const options = available.map((teacher) => ({
    value: teacher.user_id,
    label: teacher.display_name
      ? `${teacher.display_name} · ${teacher.primary_email}`
      : teacher.primary_email,
    disabled:
      userIds.length >= remainingSlots && !userIds.includes(teacher.user_id),
  }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const selected = userIds
      .filter((id) => available.some((teacher) => teacher.user_id === id))
      .slice(0, remainingSlots);
    if (selected.length === 0 || working) return;

    setWorking(true);
    const failed: Array<{ id: string; detail: string }> = [];
    for (const userId of selected) {
      try {
        await assign.mutateAsync({
          user_id: userId,
          is_instructor: isInstructor,
          is_assistant: isAssistant,
        });
      } catch (err) {
        failed.push({
          id: userId,
          detail:
            err instanceof ApiError ? err.body || err.message : String(err),
        });
      }
    }
    setWorking(false);

    if (failed.length > 0) {
      setUserIds(failed.map(({ id }) => id));
      toast.error(
        t("dept_course_detail.errors.assign_failed", {
          detail: failed.map(({ detail }) => detail).join("; "),
        }),
      );
      return;
    }
    setUserIds([]);
    toast.success(t("dept_course_detail.success.assigned"));
  };

  const noCandidates = !isLoading && available.length === 0;
  const canAssign = !atMax && !noCandidates;

  // The help line only earns its space when it says something a manager must
  // act on. "Pick someone and press Add" restates the controls beside it.
  const notice = atMax
    ? t("dept_course_detail.assign_at_max", { max: maxCount })
    : noCandidates
      ? // Distinguish "everyone is already on it" from "this org has no
        // teachers" — they need different actions from the manager.
        assignedCount > 0
        ? t("dept_course_detail.assign_all_assigned")
        : t("dept_course_detail.assign_none_available")
      : null;

  return (
    // One row, no card. This was a bordered panel ~164px tall holding a
    // single combobox, two pills and a line of help — stacked above two more
    // full-width strips before the manager reached the actual list. It now
    // sits inside the table's own toolbar, so staffing, search and assignment
    // share one container instead of four.
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-wrap items-center gap-2"
      aria-label={t("dept_course_detail.assign_label")}
    >
      {/* Bounded: a name picker does not need the full page width, and at
          1400px the unconstrained input dwarfed everything beside it. */}
      <div className="w-full min-w-0 sm:w-[28rem]">
        <SearchableMultiSelect
          options={options}
          value={userIds}
          onValueChange={(next) => setUserIds(next.slice(0, remainingSlots))}
          label={t("dept_course_detail.assign_label")}
          placeholder={t("dept_course_detail.assign_placeholder")}
          emptyText={t("dept_course_detail.assign_no_match")}
          removeLabel={(label) =>
            t("dept_course_detail.remove_selection", { name: label })
          }
          disabled={working || isLoading || !canAssign}
        />
      </div>

      {/* Title flags: Instructor and/or TA for the new teacher (manager only). */}
      <TitleFlagOption
        label={t("dept_course_detail.teacher_role_course_instructor")}
        active={isInstructor}
        onClick={() => toggleInstructor(!isInstructor)}
      />
      <TitleFlagOption
        label={t("dept_course_detail.teacher_role_teacher_assistant")}
        active={isAssistant}
        onClick={() => toggleAssistant(!isAssistant)}
      />

      <Button
        type="submit"
        size="sm"
        disabled={working || userIds.length === 0 || !canAssign}
      >
        <UserPlus className="h-3.5 w-3.5" />
        {t("dept_course_detail.assign_button")}
      </Button>

      {notice ? <p className="text-[11px] text-text-muted">{notice}</p> : null}
    </form>
  );
}

/** One title flag in the assign form's toggle pair (both may be checked). */
function TitleFlagOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "gap-1.5 rounded-full px-3 text-xs",
        active && "border-m3-primary text-m3-primary bg-m3-primary/10",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          active ? "bg-m3-primary" : "bg-m3-outline-variant",
        )}
      />
      {label}
    </Button>
  );
}

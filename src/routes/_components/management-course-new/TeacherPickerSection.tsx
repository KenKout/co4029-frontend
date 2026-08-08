import type { TFunction } from "i18next";
import { Check, Loader2, UserPlus } from "lucide-react";
import { useAssignableTeachersForNewCourse } from "@/lib/api/hooks/dept";
import { cn } from "@/lib/utils";
import type { CourseFormController } from "./use-course-form";

/**
 * Pick the instructors while creating the course, not on a later screen.
 *
 * Multi-select rather than the single `<Select>` used on the dept course page:
 * staffing a brand-new course often means adding a lead plus co-teachers, and
 * making that three round-trips through a separate screen is the friction this
 * whole wizard removes.
 *
 * The list is org-scoped SERVER-SIDE from the caller's token — the same
 * organization the new course will be created in — so nothing here can offer a
 * teacher whose assignment would then be rejected. There is no course yet, so
 * `already_assigned` is uniformly false and is not rendered.
 *
 * Assignment itself still happens after the course row exists; this only
 * collects the ids. If one of those assignment calls fails, the course is NOT
 * re-created on retry (see `use-course-wizard.ts`).
 */
export function TeacherPickerSection({
  controller,
  t,
}: {
  controller: CourseFormController;
  t: TFunction;
}) {
  const { form, setField } = controller;
  const { data: teachers = [], isLoading } = useAssignableTeachersForNewCourse();

  function toggle(userId: string) {
    const next = form.teacherIds.includes(userId)
      ? form.teacherIds.filter((id) => id !== userId)
      : [...form.teacherIds, userId];
    setField("teacherIds", next);
  }

  return (
    // Its own card now that it sits on the page background beside the preview,
    // rather than inside the form card.
    <div className="bg-card ghost-border shadow-editorial rounded-xl p-4 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-m3-on-surface flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {t("teacher_course_new.teachers_heading")}
        </h2>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {t("teacher_course_new.teachers_help")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-m3-on-surface-variant py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("common.loading")}
        </div>
      ) : teachers.length === 0 ? (
        <p className="text-xs text-m3-on-surface-variant rounded-lg bg-surface-muted p-3">
          {t("dept_course_detail.assign_none_available")}
        </p>
      ) : (
        /* No max-height here: the sticky rail is already the scroll container,
           and nesting a second one gives two scrollbars where the inner list
           traps the wheel before the rail ever moves. */
        <ul className="space-y-1.5">
          {teachers.map((teacher) => {
            const selected = form.teacherIds.includes(teacher.user_id);
            return (
              <li key={teacher.user_id}>
                <button
                  type="button"
                  onClick={() => toggle(teacher.user_id)}
                  aria-pressed={selected}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left cursor-pointer transition-colors",
                    selected
                      ? "bg-m3-primary-fixed text-m3-on-surface"
                      : "hover:bg-surface-muted",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                      selected
                        ? "bg-m3-primary border-m3-primary"
                        : "border-m3-outline-variant",
                    )}
                  >
                    {selected && (
                      <Check className="h-3 w-3 text-m3-on-primary" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">
                      {teacher.display_name || teacher.primary_email}
                    </span>
                    {teacher.display_name && (
                      <span className="block text-xs text-m3-on-surface-variant truncate">
                        {teacher.primary_email}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

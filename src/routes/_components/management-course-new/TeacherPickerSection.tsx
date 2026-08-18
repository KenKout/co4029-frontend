import type { TFunction } from "i18next";
import { Check, Loader2, UserPlus, Users } from "lucide-react";
import { useAssignableTeachersForNewCourse } from "@/lib/api/hooks/dept";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CourseTeacherRole } from "@/lib/api/types";
import type { CourseFormController } from "./use-course-form";

/**
 * Runtime staffing bounds for a NEW course. There is no course row yet (so no
 * readiness endpoint to read them from) and resolving the org-scoped admin
 * settings here adds a fetch with its own org resolution; the backend's
 * `courses.min/max_teachers_per_course` defaults are 2 and 10 respectively
 * (see settings_registry.py), so those are shown as a clearly-labelled target
 * window while the manager staffs the course.
 */
const DEFAULT_MIN_TEACHERS = 2;
const DEFAULT_MAX_TEACHERS = 10;

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
 * Each selected teacher also gets a course-scoped title (Course Instructor vs
 * Teacher Assistant) written into `form.teacherRoles`. The first teacher picked
 * is made the Course Instructor by default, and exactly one CI is allowed — the
 * CI choice is disabled for everyone else once one exists. The assignment
 * itself still happens after the course row exists (`use-course-wizard.ts`
 * forwards `course_role`); if one assignment call fails, the course is NOT
 * re-created on retry.
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

  const roles = form.teacherRoles ?? {};
  const selectedCount = form.teacherIds.length;
  // The single Course Instructor, if one has been picked.
  const ciUserId = Object.keys(roles).find(
    (id) => roles[id] === "course_instructor",
  );

  function selectedRole(userId: string): CourseTeacherRole {
    return roles[userId] ?? "teacher_assistant";
  }

  function toggle(userId: string) {
    const isSelected = form.teacherIds.includes(userId);
    if (isSelected) {
      const nextRoles = { ...roles };
      delete nextRoles[userId];
      setField("teacherRoles", nextRoles);
      setField(
        "teacherIds",
        form.teacherIds.filter((id) => id !== userId),
      );
    } else {
      // Default the new teacher to Course Instructor when none is picked yet,
      // otherwise to Teacher Assistant (exactly one CI allowed).
      const hasCi = Object.values(roles).includes("course_instructor");
      setField("teacherRoles", {
        ...roles,
        [userId]: hasCi ? "teacher_assistant" : "course_instructor",
      });
      setField("teacherIds", [...form.teacherIds, userId]);
    }
  }

  function setRole(userId: string, role: CourseTeacherRole) {
    const nextRoles = { ...roles, [userId]: role };
    // Promoting someone to CI demotes whoever held it — exactly one CI.
    if (role === "course_instructor") {
      for (const id of Object.keys(nextRoles)) {
        if (id !== userId && nextRoles[id] === "course_instructor") {
          nextRoles[id] = "teacher_assistant";
        }
      }
    }
    setField("teacherRoles", nextRoles);
  }

  const overMax = selectedCount >= DEFAULT_MAX_TEACHERS;
  const underMin = selectedCount < DEFAULT_MIN_TEACHERS;

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

      {/* Staffing target window: how many teachers the course needs, against
          the admin-configured [min, max]. `current` starts at the number
          currently selected. */}
      <div className="rounded-lg border border-border bg-surface-elev px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-sm text-text-strong">
          <Users className="h-4 w-4 text-text-subtle" />
          {t("dept_course_detail.staffing_minmax", {
            current: selectedCount,
            min: DEFAULT_MIN_TEACHERS,
            max: DEFAULT_MAX_TEACHERS,
            count: selectedCount,
          })}
        </span>
        {overMax && (
          <span className="text-xs text-danger">
            {t("dept_course_detail.staffing_at_max")}
          </span>
        )}
        {underMin && (
          <span className="text-xs text-warning">
            {t("dept_course_detail.staffing_under_min", {
              min: DEFAULT_MIN_TEACHERS,
            })}
          </span>
        )}
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
            const role = selectedRole(teacher.user_id);
            const ciDisabled =
              !!ciUserId && ciUserId !== teacher.user_id;
            return (
              <TeacherPickerItem
                key={teacher.user_id}
                teacher={teacher}
                selected={selected}
                role={role}
                ciDisabled={ciDisabled}
                onToggle={() => toggle(teacher.user_id)}
                onSetRole={(next) => setRole(teacher.user_id, next)}
                t={t}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** A single selectable teacher row with its CI/TA toggle. */
function TeacherPickerItem({
  teacher,
  selected,
  role,
  ciDisabled,
  onToggle,
  onSetRole,
  t,
}: {
  teacher: { user_id: string; display_name?: string | null; primary_email: string };
  selected: boolean;
  role: CourseTeacherRole;
  ciDisabled: boolean;
  onToggle: () => void;
  onSetRole: (role: CourseTeacherRole) => void;
  t: TFunction;
}) {
  return (
    <li>
      <Button
        variant="ghost"
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left cursor-pointer transition-colors h-auto whitespace-normal",
          selected ? "bg-m3-primary-fixed text-m3-on-surface" : "hover:bg-surface-muted",
        )}
      >
        <span
          className={cn(
            "h-4 w-4 rounded border flex items-center justify-center shrink-0",
            selected ? "bg-m3-primary border-m3-primary" : "border-m3-outline-variant",
          )}
        >
          {selected && <Check className="h-3 w-3 text-m3-on-primary" />}
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
      </Button>
      {selected && (
        <div className="mt-1.5 flex items-center gap-1.5 pl-2">
          <RoleOption
            label={t("dept_course_detail.teacher_role_course_instructor")}
            active={role === "course_instructor"}
            disabled={ciDisabled}
            title={ciDisabled ? t("dept_course_detail.ci_already_exists") : undefined}
            onClick={() => onSetRole("course_instructor")}
          />
          <RoleOption
            label={t("dept_course_detail.teacher_role_teacher_assistant")}
            active={role === "teacher_assistant"}
            onClick={() => onSetRole("teacher_assistant")}
          />
        </div>
      )}
    </li>
  );
}

/** One half of the CI/TA segmented toggle for a selected teacher. */
function RoleOption({
  label,
  active,
  disabled,
  title,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      title={title}
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

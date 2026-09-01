import type { TFunction } from "i18next";
import { Check, Loader2, UserPlus, Users } from "lucide-react";
import { useAssignableTeachersForNewCourse } from "@/lib/api/hooks/dept";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CourseFormController } from "./use-course-form";
import type { TeacherTitles } from "./use-course-form";

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
 * Each selected teacher also gets course-scoped TITLE FLAGS (Course
 * Instructor and/or Teacher Assistant — user decision 2026-08-30) written
 * into `form.teacherTitles`. The first teacher picked is made the Course
 * Instructor by default (and is forced to it server-side anyway); later
 * teachers default to Teacher Assistant, and any of them may be ticked as
 * both. The assignment itself still happens after the course row exists
 * (`use-course-wizard.ts` forwards the flags); if one assignment call
 * fails, the course is NOT re-created on retry.
 */
export function TeacherPickerSection({
  controller,
  t,
}: {
  controller: CourseFormController;
  t: TFunction;
}) {
  const { form, setField } = controller;
  const { data: teachers = [], isLoading } = useAssignableTeachersForNewCourse(
    form.facultyId || null,
  );

  const titles = form.teacherTitles ?? {};
  const selectedCount = form.teacherIds.length;

  function selectedTitles(userId: string): TeacherTitles {
    return titles[userId] ?? { is_instructor: false, is_assistant: true };
  }

  function toggle(userId: string) {
    const isSelected = form.teacherIds.includes(userId);
    if (isSelected) {
      const nextTitles = { ...titles };
      delete nextTitles[userId];
      setField("teacherTitles", nextTitles);
      setField(
        "teacherIds",
        form.teacherIds.filter((id) => id !== userId),
      );
    } else {
      // Default the new teacher to Course Instructor when none is picked
      // yet, otherwise to Teacher Assistant (both flags may later be ticked).
      const hasInstructor = form.teacherIds.some(
        (id) => selectedTitles(id).is_instructor,
      );
      setField("teacherTitles", {
        ...titles,
        [userId]: hasInstructor
          ? { is_instructor: false, is_assistant: true }
          : { is_instructor: true, is_assistant: false },
      });
      setField("teacherIds", [...form.teacherIds, userId]);
    }
  }

  function setTitleFlag(
    userId: string,
    flag: "instructor" | "assistant",
    next: boolean,
  ) {
    const current = selectedTitles(userId);
    setField("teacherTitles", {
      ...titles,
      [userId]: {
        is_instructor: flag === "instructor" ? next : current.is_instructor,
        is_assistant: flag === "assistant" ? next : current.is_assistant,
      },
    });
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
            return (
              <TeacherPickerItem
                key={teacher.user_id}
                teacher={teacher}
                selected={selected}
                titles={selectedTitles(teacher.user_id)}
                onToggle={() => toggle(teacher.user_id)}
                onSetFlag={(flag, next) =>
                  setTitleFlag(teacher.user_id, flag, next)
                }
                t={t}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** A single selectable teacher row with its two title-flag toggles. */
function TeacherPickerItem({
  teacher,
  selected,
  titles,
  onToggle,
  onSetFlag,
  t,
}: {
  teacher: { user_id: string; display_name?: string | null; primary_email: string };
  selected: boolean;
  titles: TeacherTitles;
  onToggle: () => void;
  onSetFlag: (flag: "instructor" | "assistant", next: boolean) => void;
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
            active={titles.is_instructor}
            onClick={() => onSetFlag("instructor", !titles.is_instructor)}
          />
          <RoleOption
            label={t("dept_course_detail.teacher_role_teacher_assistant")}
            active={titles.is_assistant}
            onClick={() => onSetFlag("assistant", !titles.is_assistant)}
          />
        </div>
      )}
    </li>
  );
}

/** One title-flag toggle for a selected teacher (both flags may be on). */
function RoleOption({
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

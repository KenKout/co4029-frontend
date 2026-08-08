import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  CourseSettingsSetters,
  CourseSettingsValues,
  TeacherCourse,
  TranslateFn,
} from "./types";

/**
 * Delivery fields, split by who owns them.
 *
 * `scope="teacher"` renders only the study-time estimate. Level, status and
 * the caps are manager-owned: the backend 403s a teacher PATCH that carries
 * any of them, so rendering them on the teacher surface would offer a control
 * whose Save can only fail. Status in particular is removed rather than
 * disabled — publishing is the manager's decision and a greyed-out publish
 * control still reads as "yours, later".
 *
 * `scope="manager"` renders the full set on the dept course page.
 */
export function CourseSettingsDeliveryFields({
  course,
  values,
  setters,
  t,
  scope = "manager",
}: {
  course: TeacherCourse | undefined;
  values: CourseSettingsValues;
  setters: CourseSettingsSetters;
  t: TranslateFn;
  scope?: "teacher" | "manager";
}) {
  const { level, status, estimatedMinutes, enrollmentCap, completionDays } =
    values;
  const {
    setLevel,
    setStatus,
    setEstimatedMinutes,
    setEnrollmentCap,
    setCompletionDays,
  } = setters;
  const managerScope = scope === "manager";

  return (
    <>
      {managerScope && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_course_settings.level")}
          </label>
          <Select
            value={level}
            onValueChange={(next) => setLevel(next)}
            options={[
              {
                value: "",
                label: t("teacher_course_settings.level_not_set"),
              },
              {
                value: "beginner",
                label: t("teacher_course_settings.level_beginner"),
              },
              {
                value: "intermediate",
                label: t("teacher_course_settings.level_intermediate"),
              },
              {
                value: "advanced",
                label: t("teacher_course_settings.level_advanced"),
              },
            ]}
          />
        </div>
      )}

      {managerScope && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_course_settings.status")}
          </label>
          <Select
            value={status}
            onValueChange={(next) => setStatus(next)}
            options={[
              // Publishing is a one-way door: once a course is published
              // it can never revert to draft (its LOs are the graded
              // assessment scale). Hide the draft option after publish.
              ...(course?.status === "published"
                ? []
                : [
                    {
                      value: "draft",
                      label: t("teacher_course_settings.status_draft"),
                    },
                  ]),
              {
                value: "published",
                label: t("teacher_course_settings.status_published"),
              },
              {
                value: "archived",
                label: t("teacher_course_settings.status_archived"),
              },
            ]}
          />
        </div>
      )}

      {/* Estimated minutes — teacher-editable: it follows from the content
          they author, so they are the ones who know it. */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_course_settings.estimated_duration")}
        </label>
        <Input
          type="number"
          min={0}
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          placeholder={t(
            "teacher_course_settings.estimated_duration_placeholder",
          )}
        />
      </div>

      {managerScope && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_course_settings.enrollment_cap")}
          </label>
          <Input
            type="number"
            min={0}
            value={enrollmentCap}
            onChange={(e) => setEnrollmentCap(e.target.value)}
            placeholder={t("teacher_course_settings.enrollment_cap_placeholder")}
          />
        </div>
      )}

      {managerScope && (
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_course_settings.expected_completion")}
          </label>
          <Input
            type="number"
            min={0}
            value={completionDays}
            onChange={(e) => setCompletionDays(e.target.value)}
            placeholder={t(
              "teacher_course_settings.expected_completion_placeholder",
            )}
          />
        </div>
      )}
    </>
  );
}

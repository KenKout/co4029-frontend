import { DurationField } from "@/components/ui/duration-field";
import { Input } from "@/components/ui/input";
import type {
  CourseSettingsSetters,
  CourseSettingsValues,
  TranslateFn,
} from "./types";

/**
 * Delivery fields, split by who owns them.
 *
 * `scope="teacher"` renders only the study-time estimate. The enrollment cap
 * is manager-owned: the backend 403s a teacher PATCH that carries it, so
 * rendering it on the teacher surface would offer a control whose Save can
 * only fail. (Course level and expected-completion-days were removed from the
 * model entirely — see `course-settings-model.ts`.)
 *
 * Status is NOT rendered here at all (either scope) — lifecycle is driven by
 * the dedicated Publish/Archive buttons the dept course header renders
 * (`DeptCourseLifecycleActions`, manager surface). Status no longer travels
 * through the settings PATCH.
 *
 * `scope="manager"` renders the full set on the dept course page.
 */
export function CourseSettingsDeliveryFields({
  values,
  setters,
  t,
  scope = "manager",
}: {
  values: CourseSettingsValues;
  setters: CourseSettingsSetters;
  t: TranslateFn;
  scope?: "teacher" | "manager";
}) {
  const { estimatedMinutes, enrollmentCap } = values;
  const { setEstimatedMinutes, setEnrollmentCap } = setters;
  const managerScope = scope === "manager";

  return (
    <>
      {/* Estimated minutes — teacher-editable: it follows from the content
          they author, so they are the ones who know it. */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_course_settings.estimated_duration")}
        </label>
        <DurationField
          value={estimatedMinutes}
          onChange={setEstimatedMinutes}
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
    </>
  );
}

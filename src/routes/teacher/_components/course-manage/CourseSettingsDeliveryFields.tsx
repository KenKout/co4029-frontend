import { DurationField } from "@/components/ui/duration-field";
import type {
  CourseSettingsSetters,
  CourseSettingsValues,
  TranslateFn,
} from "./types";

/**
 * Delivery fields. Enrollment cap was removed from the product (enrollment is
 * always unlimited — no cap to set), so this renders only the study-time
 * estimate, which is teacher-owned (it follows from the content they author).
 *
 * Status is NOT rendered here — lifecycle is driven by the dedicated
 * Publish/Archive buttons the dept course header renders
 * (`DeptCourseLifecycleActions`, manager surface). Status no longer travels
 * through the settings PATCH.
 */
export function CourseSettingsDeliveryFields({
  values,
  setters,
  t,
}: {
  values: CourseSettingsValues;
  setters: CourseSettingsSetters;
  t: TranslateFn;
}) {
  const { estimatedMinutes } = values;
  const { setEstimatedMinutes } = setters;

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
    </>
  );
}

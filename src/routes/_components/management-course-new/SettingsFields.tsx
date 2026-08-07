import type { TFunction } from "i18next";
import { Input } from "@/components/ui/input";
import type { CourseFormController } from "./use-course-form";

/**
 * Delivery settings collected AT CREATION.
 *
 * These live on `CourseCreate` already, so gathering them here costs no extra
 * request — they ship inside the same POST that creates the course. The labels
 * reuse the existing `teacher_course_settings` keys so a field is worded
 * identically here and on the course settings panel.
 *
 * Contact details are deliberately ABSENT. They are the teacher's own email,
 * phone and links — the manager creating the course is usually not the person
 * students would contact, so asking them to fill it in at creation invites
 * either blank fields or the wrong person's details. The teacher owns those
 * four fields (they are among the six a teacher may patch) and fills them in
 * from the course settings panel afterwards.
 *
 * Numbers are plain text inputs held as strings so an empty field stays
 * distinguishable from a deliberate 0 (an enrollment cap of 0 means "closed",
 * which is not the same as "no cap set").
 */
export function CourseSettingsFields({
  controller,
  t,
}: {
  controller: CourseFormController;
  t: TFunction;
}) {
  const { form, setField } = controller;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-m3-on-surface-variant">
          {t("teacher_course_settings.expected_completion")}
        </span>
        <Input
          type="number"
          min={1}
          value={form.expected_completion_days}
          onChange={(e) => setField("expected_completion_days", e.target.value)}
          placeholder={t(
            "teacher_course_settings.expected_completion_placeholder",
          )}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-medium text-m3-on-surface-variant">
          {t("teacher_course_settings.enrollment_cap")}
        </span>
        <Input
          type="number"
          min={0}
          value={form.enrollment_cap}
          onChange={(e) => setField("enrollment_cap", e.target.value)}
          placeholder={t("teacher_course_settings.enrollment_cap_placeholder")}
        />
      </label>
    </div>
  );
}

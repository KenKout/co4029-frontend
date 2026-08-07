import type { TFunction } from "i18next";
import { Input } from "@/components/ui/input";
import type { CourseFormController } from "./use-course-form";

/**
 * Delivery settings and teacher contact details, collected AT CREATION.
 *
 * These used to be a second trip: create the course, land on the course page,
 * open Settings, fill them in, save. They all live on `CourseCreate` already,
 * so gathering them here costs no extra request — the whole section ships
 * inside the same POST.
 *
 * Every label reuses the existing `teacher_course_settings` keys, so the same
 * field is worded identically here and on the course settings panel.
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
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-m3-on-surface-variant">
            {t("teacher_course_settings.expected_completion")}
          </span>
          <Input
            type="number"
            min={1}
            value={form.expected_completion_days}
            onChange={(e) =>
              setField("expected_completion_days", e.target.value)
            }
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
            placeholder={t(
              "teacher_course_settings.enrollment_cap_placeholder",
            )}
          />
        </label>
      </div>

      <div>
        <h2 className="text-sm font-bold text-m3-on-surface">
          {t("teacher_course_settings.contact.section_title")}
        </h2>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {t("teacher_course_settings.contact.section_hint")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-m3-on-surface-variant">
            {t("teacher_course_settings.contact.email")}
          </span>
          <Input
            type="email"
            value={form.contact_email}
            onChange={(e) => setField("contact_email", e.target.value)}
            placeholder={t("teacher_course_settings.contact.email_placeholder")}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-m3-on-surface-variant">
            {t("teacher_course_settings.contact.phone")}
          </span>
          <Input
            value={form.contact_phone}
            onChange={(e) => setField("contact_phone", e.target.value)}
            placeholder={t("teacher_course_settings.contact.phone_placeholder")}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-m3-on-surface-variant">
            {t("teacher_course_settings.contact.website")}
          </span>
          <Input
            type="url"
            value={form.contact_website_url}
            onChange={(e) => setField("contact_website_url", e.target.value)}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-m3-on-surface-variant">
            {t("teacher_course_settings.contact.social")}
          </span>
          <Input
            type="url"
            value={form.contact_social_url}
            onChange={(e) => setField("contact_social_url", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

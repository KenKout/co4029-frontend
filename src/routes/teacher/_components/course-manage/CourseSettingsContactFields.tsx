import { Globe, Mail, Phone, Share2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import type {
  CourseSettingsSetters,
  CourseSettingsValues,
  TranslateFn,
} from "./types";

/**
 * Contact info — surfaced on the student landing page. Spans the full grid
 * width as its own titled sub-section so it reads as a distinct group from the
 * course meta above. Moved verbatim out of `CourseSettingsPanel`.
 */
export function CourseSettingsContactFields({
  values,
  setters,
  t,
}: {
  values: CourseSettingsValues;
  setters: CourseSettingsSetters;
  t: TranslateFn;
}) {
  const { contactEmail, contactPhone, contactWebsiteUrl, contactSocialUrl } =
    values;
  const {
    setContactEmail,
    setContactPhone,
    setContactWebsiteUrl,
    setContactSocialUrl,
  } = setters;

  return (
    <div className="sm:col-span-2 space-y-3 pt-2">
      <div className="flex items-center gap-2 border-t border-m3-outline-variant/15 pt-4">
        <Users className="h-4 w-4 text-m3-secondary" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_course_settings.contact.section_title")}
        </h4>
      </div>
      <p className="text-xs text-m3-on-surface-variant -mt-1">
        {t("teacher_course_settings.contact.section_hint")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact email — pre-filled from the teacher's account. */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            <Mail className="h-3.5 w-3.5" />
            {t("teacher_course_settings.contact.email")}
          </label>
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={t("teacher_course_settings.contact.email_placeholder")}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            <Phone className="h-3.5 w-3.5" />
            {t("teacher_course_settings.contact.phone")}
          </label>
          <Input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder={t("teacher_course_settings.contact.phone_placeholder")}
          />
        </div>

        {/* Website */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            <Globe className="h-3.5 w-3.5" />
            {t("teacher_course_settings.contact.website")}
          </label>
          <Input
            type="url"
            value={contactWebsiteUrl}
            onChange={(e) => setContactWebsiteUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        {/* Social media */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            <Share2 className="h-3.5 w-3.5" />
            {t("teacher_course_settings.contact.social")}
          </label>
          <Input
            type="url"
            value={contactSocialUrl}
            onChange={(e) => setContactSocialUrl(e.target.value)}
            placeholder="https://linkedin.com/in/…"
          />
        </div>
      </div>
    </div>
  );
}

import { Input } from "@/components/ui/input";
import type {
  CourseSettingsSetters,
  CourseSettingsValues,
  TranslateFn,
} from "./types";

/**
 * Title / slug / description fieldsets. Returns a fragment so each block stays
 * a direct child of the settings grid, exactly as when it was inline in
 * `CourseSettingsPanel`.
 */
export function CourseSettingsMetaFields({
  values,
  setters,
  t,
}: {
  values: CourseSettingsValues;
  setters: CourseSettingsSetters;
  t: TranslateFn;
}) {
  const { title, slug, description } = values;
  const { setTitle, setSlug, setDescription } = setters;

  return (
    <>
      {/* Title */}
      <div className="sm:col-span-2 space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_course_settings.course_title")}
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("teacher_course_settings.course_title_placeholder")}
        />
      </div>

      {/* Slug */}
      <div className="sm:col-span-2 space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_course_settings.course_slug")}
        </label>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t("teacher_course_settings.course_slug_placeholder")}
        />
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_course_settings.course_slug_help")}
        </p>
      </div>

      {/* Description */}
      <div className="sm:col-span-2 space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_course_settings.description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t("teacher_course_settings.description_placeholder")}
          className="w-full px-4 py-3 text-sm bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all placeholder:text-m3-on-surface-variant/40"
        />
      </div>
    </>
  );
}

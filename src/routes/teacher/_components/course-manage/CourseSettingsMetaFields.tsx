import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  CourseSettingsSetters,
  CourseSettingsValues,
  TranslateFn,
} from "./types";

/**
 * Identity + description fieldset.
 *
 * Title and slug are course IDENTITY and manager-owned: they render only for
 * `scope="manager"` (the dept course page). The teacher surface gets the
 * description alone — the backend rejects a teacher PATCH carrying title or
 * slug, so showing the inputs there would offer an edit that cannot save.
 *
 * Returns a fragment so each block stays a direct child of the settings grid.
 */
export function CourseSettingsMetaFields({
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
  const { title, slug, description } = values;
  const { setTitle, setSlug, setDescription } = setters;
  const managerScope = scope === "manager";

  return (
    <>
      {managerScope && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_course_settings.course_title")}
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("teacher_course_settings.course_title_placeholder")}
          />
        </div>
      )}

      {managerScope && (
        <div className="space-y-1.5">
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
      )}

      {/* Description */}
      <div className="sm:col-span-2 space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_course_settings.description")}
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t("teacher_course_settings.description_placeholder")}
          variant="lowest" className="px-4 py-3"
        />
      </div>
    </>
  );
}

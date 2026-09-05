import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  facultyOptions = [],
}: {
  values: CourseSettingsValues;
  setters: CourseSettingsSetters;
  t: TranslateFn;
  scope?: "teacher" | "manager";
  /** Assignable faculties; empty on the teacher surface, which hides the field. */
  facultyOptions?: { value: string; label: string }[];
}) {
  const { title, slug, description, facultyId } = values;
  const { setTitle, setSlug, setDescription, setFacultyId } = setters;
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

      {/*
        Owning faculty. Manager-only for the same reason as title and slug: the
        backend's teacher allow-list excludes `faculty_id`, so rendering this on
        the teacher surface would offer an edit whose Save could only 403.

        Before this existed a course's faculty was set once at creation and
        frozen, so every course predating the faculty feature was stuck
        unassigned with no route to fix it — and a faculty filter could never
        match it.
      */}
      {managerScope && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_course_settings.faculty")}
          </label>
          <Select
            value={facultyId}
            onValueChange={(value) => setFacultyId(value)}
            // The Select is never clearable, so "unassigned" has to be a real
            // option rather than an empty selection. "" is the sentinel the
            // save path turns into an explicit null.
            options={[
              {
                value: "",
                label: t("teacher_course_settings.faculty_unassigned"),
              },
              ...facultyOptions,
            ]}
            placeholder={t("teacher_course_settings.faculty_unassigned")}
          />
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_course_settings.faculty_help")}
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

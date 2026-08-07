import { useEffect, useState } from "react";
import { useSlugAvailability } from "@/lib/api/hooks/teacher-courses";

export type Level = "" | "beginner" | "intermediate" | "advanced";

export type CourseLevel = Exclude<Level, "">;

export interface CourseLevelOption {
  key: CourseLevel;
  label: string;
}

/**
 * Every field the wizard collects.
 *
 * `CourseCreate` already accepts the settings and contact columns, so all of
 * this lands in the SINGLE create request — only teachers, the cover image and
 * the career-path placement need follow-up calls, because they are
 * sub-resources of a course that does not exist yet.
 *
 * Numeric fields are held as strings: they come from text inputs, and an empty
 * input has to stay distinguishable from a deliberate 0.
 */
export interface CourseFormValues {
  title: string;
  slug: string;
  description: string;
  level: Level;
  estimated_minutes: string;
  expected_completion_days: string;
  enrollment_cap: string;
  contact_email: string;
  contact_phone: string;
  contact_website_url: string;
  contact_social_url: string;
  /** Chosen in the teacher picker; assigned after the course row exists. */
  teacherIds: string[];
}

export const EMPTY_COURSE_FORM: CourseFormValues = {
  title: "",
  slug: "",
  description: "",
  level: "beginner",
  estimated_minutes: "",
  expected_completion_days: "",
  enrollment_cap: "",
  contact_email: "",
  contact_phone: "",
  contact_website_url: "",
  contact_social_url: "",
  teacherIds: [],
};

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface CourseFormController {
  form: CourseFormValues;
  setForm: React.Dispatch<React.SetStateAction<CourseFormValues>>;
  slugManuallyEdited: boolean;
  slugAvailable: boolean;
  slugTaken: boolean;
  slugChecking: boolean;
  canSubmit: boolean;
  setField: <K extends keyof CourseFormValues>(
    key: K,
    value: CourseFormValues[K],
  ) => void;
  handleTitleChange: (title: string) => void;
  handleSlugChange: (slug: string) => void;
  resetSlugToAuto: () => void;
}

export function useCourseForm(
  isCreatePending: boolean,
  /**
   * Values recovered from a localStorage draft. Passed as the initial state
   * rather than applied via an effect so the form never renders empty first
   * and then visibly repopulates.
   */
  initialForm?: CourseFormValues,
): CourseFormController {
  const [form, setForm] = useState<CourseFormValues>(
    initialForm ?? EMPTY_COURSE_FORM,
  );
  // A restored draft's slug is whatever the manager last had; treat it as
  // hand-edited so retyping the title cannot silently overwrite it.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    initialForm !== undefined &&
      Boolean(initialForm.slug) &&
      initialForm.slug !== slugify(initialForm.title),
  );

  // Debounce the slug before hitting the availability endpoint so we don't
  // fire a request on every keystroke.
  const [debouncedSlug, setDebouncedSlug] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSlug(form.slug.trim()), 400);
    return () => window.clearTimeout(id);
  }, [form.slug]);

  const slugQuery = useSlugAvailability(debouncedSlug);
  // Only trust the result when the debounced value matches the current input
  // (avoids a stale ✓/✗ flashing while the user is still typing).
  const slugSettled =
    debouncedSlug === form.slug.trim() && debouncedSlug.length > 0;
  const slugAvailable = slugSettled && slugQuery.data?.available === true;
  const slugTaken = slugSettled && slugQuery.data?.available === false;
  const slugChecking =
    form.slug.trim().length > 0 && (!slugSettled || slugQuery.isFetching);

  function setField<K extends keyof CourseFormValues>(
    key: K,
    value: CourseFormValues[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: slugManuallyEdited ? f.slug : slugify(title),
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugManuallyEdited(true);
    setForm((f) => ({ ...f, slug }));
  }

  function resetSlugToAuto() {
    setSlugManuallyEdited(false);
    setForm((f) => ({ ...f, slug: slugify(f.title) }));
  }

  const canSubmit =
    !!form.title.trim() &&
    !!form.slug.trim() &&
    !slugTaken &&
    !slugChecking &&
    !isCreatePending;

  return {
    form,
    setForm,
    slugManuallyEdited,
    slugAvailable,
    slugTaken,
    slugChecking,
    canSubmit,
    setField,
    handleTitleChange,
    handleSlugChange,
    resetSlugToAuto,
  };
}

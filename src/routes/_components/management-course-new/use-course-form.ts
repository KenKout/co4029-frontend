import { useEffect, useRef, useState } from "react";
import { useSlugAvailability } from "@/lib/api/hooks/teacher-courses";
import type { CourseTeacherRole } from "@/lib/api/types";

/**
 * Every field the wizard collects.
 *
 * `CourseCreate` already accepts the settings columns, so all of this lands in
 * the SINGLE create request — only teachers, the cover image and the
 * career-path placement need follow-up calls, because they are sub-resources
 * of a course that does not exist yet.
 *
 * Contact details are not here: they belong to the teacher, who fills them in
 * from the course settings panel once assigned.
 *
 * Numeric fields are held as strings: they come from text inputs, and an empty
 * input has to stay distinguishable from a deliberate 0.
 */
export interface CourseFormValues {
  title: string;
  slug: string;
  description: string;
  estimated_minutes: string;
  /** Chosen in the teacher picker; assigned after the course row exists. */
  teacherIds: string[];
  /** Course-scoped title per selected teacher id (CI vs TA). Persisted in the
   *  draft so a resumed submission re-assigns with the same titles. */
  teacherRoles?: Record<string, CourseTeacherRole>;
}

export const EMPTY_COURSE_FORM: CourseFormValues = {
  title: "",
  slug: "",
  description: "",
  estimated_minutes: "",
  teacherIds: [],
  teacherRoles: {},
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
   * Values recovered from a localStorage draft.
   *
   * Applied via an effect keyed on identity, NOT as useState's initial value:
   * React reads that initialiser once, on the first render, and the restore
   * decision is a button the manager presses afterwards. Seeding state with it
   * meant the recovered values were computed, handed over, and silently
   * dropped — the Restore button did nothing at all.
   */
  restoredForm?: CourseFormValues,
): CourseFormController {
  const [form, setForm] = useState<CourseFormValues>(EMPTY_COURSE_FORM);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Adopt a restored draft when one arrives. Keyed on the object's identity so
  // it runs once per restore: re-running on every render would fight the
  // manager's typing, resetting each keystroke back to the draft.
  const appliedRef = useRef<CourseFormValues | null>(null);
  useEffect(() => {
    if (!restoredForm || appliedRef.current === restoredForm) return;
    appliedRef.current = restoredForm;
    setForm(restoredForm);
    // The restored slug is whatever the manager last had. Treat it as
    // hand-edited whenever it is non-empty, so retyping the title cannot
    // silently overwrite it — including the case where it happens to equal
    // slugify(title), since it was still deliberately carried over.
    setSlugManuallyEdited(Boolean(restoredForm.slug.trim()));
  }, [restoredForm]);

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

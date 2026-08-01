import { useEffect, useState } from "react";
import { useSlugAvailability } from "@/lib/api/hooks/teacher-courses";

export type Level = "" | "beginner" | "intermediate" | "advanced";

export type CourseLevel = Exclude<Level, "">;

export interface CourseLevelOption {
  key: CourseLevel;
  label: string;
}

export interface CourseFormValues {
  title: string;
  slug: string;
  description: string;
  level: Level;
  estimated_minutes: string;
}

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
  handleTitleChange: (title: string) => void;
  handleSlugChange: (slug: string) => void;
  resetSlugToAuto: () => void;
}

export function useCourseForm(isCreatePending: boolean): CourseFormController {
  const [form, setForm] = useState<CourseFormValues>({
    title: "",
    slug: "",
    description: "",
    level: "beginner" as Level,
    estimated_minutes: "",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

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
    handleTitleChange,
    handleSlugChange,
    resetSlugToAuto,
  };
}

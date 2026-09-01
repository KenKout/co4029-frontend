import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useTeacherCourseById,
  useUpdateCourse,
  useUploadCourseThumbnail,
} from "@/lib/api/hooks/teacher-courses";
import { useFileDrop } from "@/lib/use-file-drop";
import {
  buildCourseUpdatePayload,
  buildManagerCourseUpdatePayload,
  initialCourseSettings,
  isCourseSettingsDirty,
  savedCourseSettings,
} from "./course-settings-model";
import type { TranslateFn } from "./types";
import { useCourseSettingsFields } from "./use-course-settings-fields";

// Client-side guardrails mirroring the backend (JPEG/PNG/WebP/GIF, ≤ 5 MiB).
export const THUMB_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const THUMB_MAX_BYTES = 5 * 1024 * 1024;

/**
 * All of `CourseSettingsPanel`'s state: the buffered fields, the staged
 * thumbnail, the one-shot initialisation from the loaded course, the dirty
 * check and the Save action.
 *
 * Extracted from the former 550-line / complexity-48 panel. The hook calls keep
 * their original order (`useTeacherCourseById`, `useUpdateCourse`, the field
 * states + `useMe`, the two refs, `useUploadCourseThumbnail`, the staged-image
 * states, `useFileDrop`, the revoke effect, the save-indicator states, the
 * contact-email backfill effect, the dirty memo) and every effect dependency
 * array is unchanged.
 */
export function useCourseSettingsDraft(options: {
  courseId: string;
  t: TranslateFn;
  /**
   * Which surface is rendering. Decides what Save sends: the teacher payload
   * carries only teacher-owned fields, because the backend 403s the WHOLE
   * PATCH if a manager-only field appears — even unchanged.
   */
  scope?: "teacher" | "manager";
  /** Start expanded. True where this panel is the surface's main content. */
  defaultOpen?: boolean;
}) {
  const { courseId, t, scope = "teacher", defaultOpen = false } = options;
  const { data: course } = useTeacherCourseById(courseId);
  const updateCourse = useUpdateCourse(courseId);
  const fields = useCourseSettingsFields(defaultOpen);
  const { values, me } = fields;
  const initialized = useRef(false);
  const uploadThumbnail = useUploadCourseThumbnail(courseId);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  // Thumbnail is STAGED locally (with an object-URL preview) and only sent to
  // the server when the user presses Save — so the image change is applied to
  // the database on Save, in step with the other settings fields.
  const [stagedThumbnail, setStagedThumbnail] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);

  function stageThumbnailFile(file: File) {
    if (!file) return;
    if (!THUMB_ACCEPT.split(",").includes(file.type)) {
      toast.error(t("teacher_course_settings.thumbnail.invalid_type"));
      return;
    }
    if (file.size > THUMB_MAX_BYTES) {
      toast.error(t("teacher_course_settings.thumbnail.too_large"));
      return;
    }
    // Revoke any previous preview URL before replacing it (avoid a leak).
    setStagedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setStagedThumbnail(file);
  }

  function handleThumbnailFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (file) stageThumbnailFile(file);
  }

  // Drag-and-drop onto the thumbnail tile — same flicker-proof lifecycle as
  // every other upload surface; keeps the live image preview.
  useFileDrop({
    onFile: stageThumbnailFile,
    disabled: uploadThumbnail.isPending,
  });

  // Clean up the object URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    };
  }, [stagedPreview]);

  // Briefly true right after a successful save so the header can show a
  // transient "Saved" confirmation (cleared once edits resume or the timer
  // elapses) — mirrors the interview-config save UX.
  const [justSaved, setJustSaved] = useState(false);
  // Timestamp of the last successful save, seeded from the course's updated_at
  // so the "Last saved" indicator is populated on first load.
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  if (course && !initialized.current) {
    initialized.current = true;
    const init = initialCourseSettings(course, me?.primary_email);
    fields.applyInitial(init);
    setLastSaved(init.lastSaved);
  }

  // Backfill the contact email from the teacher's account once useMe resolves,
  // in case the course initialized before that query landed. Only fills when
  // the field is still empty AND the course has no saved contact_email, so it
  // never clobbers a teacher's typed value or a saved custom address.
  useEffect(() => {
    if (!me?.primary_email) return;
    if (!course || course.contact_email) return;
    fields.setContactEmail((cur) => cur || me.primary_email);
  }, [me?.primary_email, course]);

  const {
    title,
    slug,
    description,
    estimatedMinutes,
    contactEmail,
    contactPhone,
    contactWebsiteUrl,
    contactSocialUrl,
  } = values;

  // Compare the current form against the saved course so the button can show
  // Saving… / Unsaved changes / Saved and disable itself when there's nothing
  // to save (matches the interview-config settings behaviour).
  const settingsDirty = useMemo(() => {
    if (!course) return false;
    return isCourseSettingsDirty({
      draft: values,
      saved: savedCourseSettings(course),
      stagedThumbnail,
      scope,
    });
  }, [
    course,
    stagedThumbnail,
    title,
    slug,
    description,
    estimatedMinutes,
    contactEmail,
    contactPhone,
    contactWebsiteUrl,
    contactSocialUrl,
  ]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateCourse.mutateAsync(
        scope === "manager"
          ? buildManagerCourseUpdatePayload(values)
          : buildCourseUpdatePayload(values),
      );
      // Upload the staged thumbnail (if any) as part of the same Save action,
      // so the image change is persisted to the DB only on Save.
      if (stagedThumbnail) {
        await uploadThumbnail.mutateAsync(stagedThumbnail);
        setStagedThumbnail(null);
        setStagedPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
      setJustSaved(true);
      setLastSaved(new Date().toISOString());
      window.setTimeout(() => setJustSaved(false), 2500);
      toast.success(t("teacher_course_settings.saved"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_course_settings.save_failed"),
      );
    }
  }

  return {
    ...fields,
    course,
    updateCourse,
    uploadThumbnail,
    thumbnailInputRef,
    stagedPreview,
    handleThumbnailFile,
    settingsDirty,
    justSaved,
    lastSaved,
    handleSave,
  };
}

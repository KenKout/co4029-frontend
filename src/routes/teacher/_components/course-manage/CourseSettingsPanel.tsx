import { useState, useRef, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Loader2,
  Check,
  Users,
  Settings,
  Save,
  ImageIcon,
  Camera,
  Clock,
  Mail,
  Phone,
  Globe,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  useTeacherCourseById,
  useUpdateCourse,
  useUploadCourseThumbnail,
} from "@/lib/api/hooks/teacher-courses";
import { useMe } from "@/lib/api/hooks/auth";
import { useFileDrop } from "@/lib/use-file-drop";
import { cn } from "@/lib/utils";

/**
 * Collapsible "Course Settings" panel: title/slug/description/level/status,
 * duration + enrolment caps, teacher contact info, and a staged thumbnail
 * upload. All fields are buffered locally and persisted on Save (including the
 * thumbnail, which is only uploaded when the form is submitted).
 */
export function CourseSettingsPanel({ courseId }: { courseId: string }) {
  const { t, i18n } = useTranslation();
  const { data: course } = useTeacherCourseById(courseId);
  const updateCourse = useUpdateCourse(courseId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [enrollmentCap, setEnrollmentCap] = useState("");
  const [completionDays, setCompletionDays] = useState("");
  // Teacher contact info shown on the student landing page. contactEmail is
  // pre-filled from the teacher's account email (useMe) on first load when the
  // course has none saved yet — but stays fully editable (a teacher may want a
  // different public address than their login).
  const { data: me } = useMe();
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWebsiteUrl, setContactWebsiteUrl] = useState("");
  const [contactSocialUrl, setContactSocialUrl] = useState("");
  const initialized = useRef(false);
  const uploadThumbnail = useUploadCourseThumbnail(courseId);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  // Thumbnail is STAGED locally (with an object-URL preview) and only sent to
  // the server when the user presses Save — so the image change is applied to
  // the database on Save, in step with the other settings fields.
  const [stagedThumbnail, setStagedThumbnail] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);

  // Client-side guardrails mirroring the backend (JPEG/PNG/WebP/GIF, ≤ 5 MiB).
  const THUMB_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
  const THUMB_MAX_BYTES = 5 * 1024 * 1024;

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
    setTitle(course.title ?? "");
    setSlug(course.slug ?? "");
    setDescription(course.description ?? "");
    setLevel(course.level ?? "");
    setStatus(course.status ?? "draft");
    setEstimatedMinutes(course.estimated_minutes?.toString() ?? "");
    setEnrollmentCap(course.enrollment_cap?.toString() ?? "");
    setCompletionDays(course.expected_completion_days?.toString() ?? "");
    // Contact email autofills from the teacher's account email when the course
    // has none saved yet; the other contact fields start from whatever's saved.
    setContactEmail(course.contact_email ?? me?.primary_email ?? "");
    setContactPhone(course.contact_phone ?? "");
    setContactWebsiteUrl(course.contact_website_url ?? "");
    setContactSocialUrl(course.contact_social_url ?? "");
    setLastSaved(course.updated_at ?? null);
  }

  // Backfill the contact email from the teacher's account once useMe resolves,
  // in case the course initialized before that query landed. Only fills when
  // the field is still empty AND the course has no saved contact_email, so it
  // never clobbers a teacher's typed value or a saved custom address.
  useEffect(() => {
    if (!me?.primary_email) return;
    if (!course || course.contact_email) return;
    setContactEmail((cur) => cur || me.primary_email);
  }, [me?.primary_email, course]);

  // Compare the current form against the saved course so the button can show
  // Saving… / Unsaved changes / Saved and disable itself when there's nothing
  // to save (matches the interview-config settings behaviour).
  const settingsDirty = useMemo(() => {
    if (!course) return false;
    return (
      stagedThumbnail !== null ||
      title.trim() !== (course.title ?? "") ||
      slug.trim() !== (course.slug ?? "") ||
      description.trim() !== (course.description ?? "") ||
      level !== (course.level ?? "") ||
      status !== (course.status ?? "draft") ||
      estimatedMinutes !== (course.estimated_minutes?.toString() ?? "") ||
      enrollmentCap !== (course.enrollment_cap?.toString() ?? "") ||
      completionDays !== (course.expected_completion_days?.toString() ?? "") ||
      contactEmail.trim() !== (course.contact_email ?? "") ||
      contactPhone.trim() !== (course.contact_phone ?? "") ||
      contactWebsiteUrl.trim() !== (course.contact_website_url ?? "") ||
      contactSocialUrl.trim() !== (course.contact_social_url ?? "")
    );
  }, [
    course,
    stagedThumbnail,
    title,
    slug,
    description,
    level,
    status,
    estimatedMinutes,
    enrollmentCap,
    completionDays,
    contactEmail,
    contactPhone,
    contactWebsiteUrl,
    contactSocialUrl,
  ]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateCourse.mutateAsync({
        slug: slug.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        level: (level || undefined) as
          | "beginner"
          | "intermediate"
          | "advanced"
          | undefined,
        status: (status || undefined) as
          | "draft"
          | "published"
          | "archived"
          | undefined,
        estimated_minutes: estimatedMinutes
          ? Number(estimatedMinutes)
          : undefined,
        enrollment_cap: enrollmentCap ? Number(enrollmentCap) : undefined,
        expected_completion_days: completionDays
          ? Number(completionDays)
          : undefined,
        // Contact fields: send trimmed value or null so clearing a field in
        // the form actually blanks the column (backend also normalises "" →
        // null as a belt-and-braces guard).
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_website_url: contactWebsiteUrl.trim() || null,
        contact_social_url: contactSocialUrl.trim() || null,
      });
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

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 border-m3-outline-variant/20 overflow-hidden transition-colors",
        open ? "border-l-m3-primary" : "border-l-m3-outline-variant",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer transition-colors",
          open
            ? "bg-m3-surface-container-low hover:bg-m3-surface-container"
            : "hover:bg-m3-primary/5",
        )}
      >
        <Settings className="h-4 w-4 text-m3-secondary shrink-0" />
        <span className="flex-1 text-sm font-bold text-m3-on-surface transition-colors group-hover:text-m3-primary">
          {t("teacher_course_settings.title")}
        </span>
        <span className="text-xs text-m3-on-surface-variant mr-2 hidden sm:block">
          {course?.status === "published"
            ? t("teacher_course_settings.status_summary_published")
            : t("teacher_course_settings.status_summary_draft")}{" "}
          ·{" "}
          {course?.level
            ? t(`teacher_course_settings.level_${course.level}`)
            : t("teacher_course_settings.no_level")}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-m3-on-surface-variant transition-transform duration-300",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden min-h-0">
          <form
            onSubmit={handleSave}
            className="p-5 border-t border-m3-outline-variant/10 bg-m3-surface space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Thumbnail — the image representing this course on cards.
                  Click the banner (or the button) to upload a new one. */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_course_settings.thumbnail.label")}
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={uploadThumbnail.isPending}
                    aria-label={t("teacher_course_settings.thumbnail.change")}
                    className="group relative aspect-video w-40 shrink-0 cursor-pointer overflow-hidden rounded-lg ghost-border transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                  >
                    {(stagedPreview ?? course?.thumbnail_url) ? (
                      <img
                        src={stagedPreview ?? course?.thumbnail_url ?? ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 via-blue-700 to-blue-800">
                        <ImageIcon className="h-6 w-6 text-white/70" />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      {uploadThumbnail.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                    </span>
                  </button>
                  <div className="min-w-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadThumbnail.isPending}
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      {uploadThumbnail.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                      {t("teacher_course_settings.thumbnail.change")}
                    </Button>
                    <p className="mt-1 text-xs text-m3-on-surface-variant">
                      {t("teacher_course_settings.thumbnail.hint")}
                    </p>
                  </div>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept={THUMB_ACCEPT}
                    onChange={handleThumbnailFile}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_course_settings.course_title")}
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    "teacher_course_settings.course_title_placeholder",
                  )}
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
                  placeholder={t(
                    "teacher_course_settings.course_slug_placeholder",
                  )}
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
                  placeholder={t(
                    "teacher_course_settings.description_placeholder",
                  )}
                  className="w-full px-4 py-3 text-sm bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all placeholder:text-m3-on-surface-variant/40"
                />
              </div>

              {/* Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_course_settings.level")}
                </label>
                <Select
                  value={level}
                  onValueChange={(next) => setLevel(next)}
                  options={[
                    {
                      value: "",
                      label: t("teacher_course_settings.level_not_set"),
                    },
                    {
                      value: "beginner",
                      label: t("teacher_course_settings.level_beginner"),
                    },
                    {
                      value: "intermediate",
                      label: t("teacher_course_settings.level_intermediate"),
                    },
                    {
                      value: "advanced",
                      label: t("teacher_course_settings.level_advanced"),
                    },
                  ]}
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_course_settings.status")}
                </label>
                <Select
                  value={status}
                  onValueChange={(next) => setStatus(next)}
                  options={[
                    // Publishing is a one-way door: once a course is published
                    // it can never revert to draft (its LOs are the graded
                    // assessment scale). Hide the draft option after publish.
                    ...(course?.status === "published"
                      ? []
                      : [
                          {
                            value: "draft",
                            label: t("teacher_course_settings.status_draft"),
                          },
                        ]),
                    {
                      value: "published",
                      label: t("teacher_course_settings.status_published"),
                    },
                    {
                      value: "archived",
                      label: t("teacher_course_settings.status_archived"),
                    },
                  ]}
                />
              </div>

              {/* Estimated minutes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_course_settings.estimated_duration")}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder={t(
                    "teacher_course_settings.estimated_duration_placeholder",
                  )}
                />
              </div>

              {/* Enrollment cap */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_course_settings.enrollment_cap")}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={enrollmentCap}
                  onChange={(e) => setEnrollmentCap(e.target.value)}
                  placeholder={t(
                    "teacher_course_settings.enrollment_cap_placeholder",
                  )}
                />
              </div>

              {/* Completion days */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_course_settings.expected_completion")}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={completionDays}
                  onChange={(e) => setCompletionDays(e.target.value)}
                  placeholder={t(
                    "teacher_course_settings.expected_completion_placeholder",
                  )}
                />
              </div>

              {/* Contact info — surfaced on the student landing page. Spans the
                  full grid width as its own titled sub-section so it reads as a
                  distinct group from the course meta above. */}
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
                      placeholder={t(
                        "teacher_course_settings.contact.email_placeholder",
                      )}
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
                      placeholder={t(
                        "teacher_course_settings.contact.phone_placeholder",
                      )}
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
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              {/* Save-state indicator beside the button — Saving… / Unsaved
                  changes / Saved — so the teacher always knows whether their
                  edits are persisted (mirrors the interview-config save UX). */}
              {updateCourse.isPending ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-m3-on-surface-variant"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {t("teacher_course_settings.save_status.saving")}
                </span>
              ) : settingsDirty ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700"
                >
                  <span
                    className="h-2 w-2 rounded-full bg-amber-500"
                    aria-hidden
                  />
                  {t("teacher_course_settings.save_status.unsaved")}
                </span>
              ) : justSaved ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {t("teacher_course_settings.save_status.saved")}
                </span>
              ) : lastSaved ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {t("teacher_course_settings.save_status.last_saved", {
                    when: new Date(lastSaved).toLocaleString(
                      i18n.language?.startsWith("vi") ? "vi-VN" : "en-US",
                      { dateStyle: "medium", timeStyle: "short" },
                    ),
                  })}
                </span>
              ) : null}
              <Button
                type="submit"
                size="sm"
                disabled={updateCourse.isPending || !settingsDirty}
                className="gap-2 gradient-primary text-white border-0 shadow-sm"
              >
                {updateCourse.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("teacher_course_settings.save")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

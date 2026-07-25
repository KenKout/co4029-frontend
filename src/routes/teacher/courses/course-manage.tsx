import { useState, useRef, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { apiPatch, apiPost } from "@/lib/api/client";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  Video,
  BookOpen,
  GripVertical,
  HelpCircle,
  Mic,
  Pencil,
  Loader2,
  ArrowRight,
  Check,
  Users,
  UserPlus,
  Activity,
  Settings,
  Save,
  ExternalLink,
  Brain,
  ClipboardList,
  CornerDownRight,
  ListChecks,
  Trash2,
  X,
  Library,
  ImageIcon,
  Camera,
  Clock,
  CheckCheck,
  CircleDot,
  Mail,
  Phone,
  Globe,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
  useCreateModule,
  useCreateLesson,
  useUpdateModule,
  useUpdateCourse,
  useUploadCourseThumbnail,
  useDeleteTeacherCourse,
  useReorderModuleItems,
  useReorderModules,
  useUpdateLesson,
} from "@/lib/api/hooks/teacher-courses";
import { usePublishQuiz } from "@/lib/api/hooks/quizzes";
import { usePublishInterviewConfig } from "@/lib/api/hooks/interviews";
import { useMe } from "@/lib/api/hooks/auth";
import {
  useTeacherCourseOutcomes,
  useCreateCourseOutcome,
  useUpdateCourseOutcome,
  useDeleteCourseOutcome,
} from "@/lib/api/hooks/courses";
import { useCreateQuiz } from "@/lib/api/hooks/quizzes";
import { useCreateInterviewConfig } from "@/lib/api/hooks/interviews";
import type {
  CourseContentItem,
  CourseContentModule,
} from "@/lib/api/types/common";
import { useFileDrop } from "@/lib/use-file-drop";
import { cn } from "@/lib/utils";

const LESSON_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }
> = {
  video: {
    label: "teacher_common.video_label",
    icon: Video,
    badge: "bg-blue-50 text-blue-700",
  },
  reading: {
    label: "teacher_common.reading_label",
    icon: BookOpen,
    badge: "bg-emerald-50 text-emerald-700",
  },
};

const QUIZ_ITEM_CONFIG = {
  label: "teacher_common.quiz_label",
  icon: HelpCircle,
  badge: "bg-blue-50 text-blue-800",
};
const INTERVIEW_ITEM_CONFIG = {
  label: "teacher_common.interview_label",
  icon: Mic,
  badge: "bg-slate-50 text-slate-600",
};

const ADD_PILL_CLS =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-m3-on-surface-variant " +
  "bg-m3-surface-container-lowest border border-m3-outline-variant/20 " +
  "hover:bg-m3-primary-fixed hover:text-m3-primary hover:border-m3-primary/20 transition-colors cursor-pointer";

function CourseSettingsPanel({ courseId }: { courseId: string }) {
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
  const { dragging: thumbDragging, dropProps: thumbDropProps } = useFileDrop({
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
                    {stagedPreview ?? course?.thumbnail_url ? (
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
                  className="text-sm"
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
                  className="text-sm"
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
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="">
                    {t("teacher_course_settings.level_not_set")}
                  </option>
                  <option value="beginner">
                    {t("teacher_course_settings.level_beginner")}
                  </option>
                  <option value="intermediate">
                    {t("teacher_course_settings.level_intermediate")}
                  </option>
                  <option value="advanced">
                    {t("teacher_course_settings.level_advanced")}
                  </option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_course_settings.status")}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="draft">
                    {t("teacher_course_settings.status_draft")}
                  </option>
                  <option value="published">
                    {t("teacher_course_settings.status_published")}
                  </option>
                  <option value="archived">
                    {t("teacher_course_settings.status_archived")}
                  </option>
                </select>
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
                  className="text-sm"
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
                  className="text-sm"
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
                  className="text-sm"
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
                      className="text-sm"
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
                      className="text-sm"
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
                      className="text-sm"
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
                      className="text-sm"
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

function LearningOutcomesPanel({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: outcomes = [] } = useTeacherCourseOutcomes(courseId);
  const createOutcome = useCreateCourseOutcome(courseId);
  const updateOutcome = useUpdateCourseOutcome(courseId);
  const deleteOutcome = useDeleteCourseOutcome(courseId);

  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Inline "add child" state: the parent whose child-input is open + its text.
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
  const [childText, setChildText] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;
    try {
      await createOutcome.mutateAsync({ outcome_text: text });
      setNewText("");
      toast.success(t("teacher_outcomes.added", "Learning outcome added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.add_failed", "Failed to add outcome"),
      );
    }
  }

  function startAddChild(parentId: string) {
    setAddChildParentId(parentId);
    setChildText("");
  }
  function cancelAddChild() {
    setAddChildParentId(null);
    setChildText("");
  }
  async function handleAddChild(parentId: string) {
    const text = childText.trim();
    if (!text) return;
    try {
      await createOutcome.mutateAsync({ outcome_text: text, parent_id: parentId });
      cancelAddChild();
      toast.success(t("teacher_outcomes.child_added", "Sub-outcome added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.add_failed", "Failed to add outcome"),
      );
    }
  }

  function startEdit(id: string, text: string) {
    setEditingId(id);
    setEditText(text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function handleSaveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    try {
      await updateOutcome.mutateAsync({ outcomeId: id, outcome_text: text });
      cancelEdit();
      toast.success(t("teacher_outcomes.updated", "Learning outcome updated"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.update_failed", "Failed to update outcome"),
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteOutcome.mutateAsync(id);
      setPendingDeleteId(null);
      toast.success(t("teacher_outcomes.deleted", "Learning outcome deleted"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.delete_failed", "Failed to delete outcome"),
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
        <ListChecks className="h-4 w-4 text-m3-secondary shrink-0" />
        <span className="flex-1 text-sm font-bold text-m3-on-surface transition-colors group-hover:text-m3-primary">
          {t("teacher_outcomes.title", "Learning Outcomes")}
        </span>
        <span className="text-xs text-m3-on-surface-variant mr-2 hidden sm:block">
          {t("teacher_outcomes.count", "{{count}} defined", {
            count: outcomes.length,
          })}
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
          <div className="p-5 border-t border-m3-outline-variant/10 bg-m3-surface space-y-4">
            {outcomes.length === 0 ? (
              <p className="text-sm text-m3-on-surface-variant">
                {t(
                  "teacher_outcomes.empty",
                  "No learning outcomes yet. Add one to describe what students will achieve.",
                )}
              </p>
            ) : (
              <ul className="space-y-2">
                {outcomes.map((outcome) => {
                  // Dotted hierarchy code is derived server-side (e.g. "1.2.1"
                  // → "L.O.1.2.1"); depth drives left indentation so the tree
                  // reads as nested. Fallback to position if code is absent.
                  const depth = outcome.depth ?? 0;
                  const code = t("teacher_outcomes.code", "L.O.{{n}}", {
                    n: outcome.code ?? outcome.position,
                  });
                  const isEditing = editingId === outcome.id;
                  const isAddingChild = addChildParentId === outcome.id;
                  return (
                    <li
                      key={outcome.id}
                      className="flex flex-col gap-2 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5"
                      style={{ marginLeft: `${depth * 1.5}rem` }}
                    >
                    <div className="flex items-start gap-3">
                      <Badge className="mt-0.5 shrink-0 bg-violet-100 text-violet-700 border-transparent">
                        {code}
                      </Badge>
                      {isEditing ? (
                        <>
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleSaveEdit(outcome.id);
                              } else if (e.key === "Escape") {
                                cancelEdit();
                              }
                            }}
                            autoFocus
                            className="flex-1 text-sm"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              disabled={
                                updateOutcome.isPending || !editText.trim()
                              }
                              onClick={() => void handleSaveEdit(outcome.id)}
                              aria-label={t("teacher_outcomes.save", "Save")}
                            >
                              {updateOutcome.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 text-m3-primary" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              aria-label={t(
                                "teacher_outcomes.cancel",
                                "Cancel",
                              )}
                            >
                              <X className="h-4 w-4 text-m3-on-surface-variant" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-m3-on-surface leading-relaxed">
                            {outcome.outcome_text}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              onClick={() =>
                                startEdit(outcome.id, outcome.outcome_text)
                              }
                              aria-label={t("teacher_outcomes.edit", "Edit")}
                            >
                              <Pencil className="h-4 w-4 text-m3-on-surface-variant" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => startAddChild(outcome.id)}
                              aria-label={t(
                                "teacher_outcomes.add_child",
                                "Add sub-outcome",
                              )}
                              title={t(
                                "teacher_outcomes.add_child",
                                "Add sub-outcome",
                              )}
                            >
                              <CornerDownRight className="h-4 w-4 text-m3-on-surface-variant" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setPendingDeleteId(outcome.id)}
                              aria-label={t(
                                "teacher_outcomes.delete",
                                "Delete",
                              )}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                      {/* Inline sub-outcome input — nests a child under this
                          outcome (parent_id). Enter submits, Escape cancels. */}
                      {isAddingChild && (
                        <div className="flex items-center gap-2 pl-6">
                          <CornerDownRight className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
                          <Input
                            value={childText}
                            onChange={(e) => setChildText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleAddChild(outcome.id);
                              } else if (e.key === "Escape") {
                                cancelAddChild();
                              }
                            }}
                            autoFocus
                            placeholder={t(
                              "teacher_outcomes.add_child_placeholder",
                              "Sub-outcome statement…",
                            )}
                            className="flex-1 text-sm"
                          />
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={
                              createOutcome.isPending || !childText.trim()
                            }
                            onClick={() => void handleAddChild(outcome.id)}
                            aria-label={t("teacher_outcomes.save", "Save")}
                          >
                            {createOutcome.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-m3-primary" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={cancelAddChild}
                            aria-label={t("teacher_outcomes.cancel", "Cancel")}
                          >
                            <X className="h-4 w-4 text-m3-on-surface-variant" />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder={t(
                  "teacher_outcomes.add_placeholder",
                  "e.g. Explain the core principles of…",
                )}
                className="flex-1 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={createOutcome.isPending || !newText.trim()}
                className="gap-2 shrink-0"
              >
                {createOutcome.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("teacher_outcomes.add", "Add outcome")}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <PromptDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
        title={t("teacher_outcomes.delete_title", "Delete learning outcome?")}
        description={t(
          "teacher_outcomes.delete_description",
          "The remaining outcomes will be renumbered automatically.",
        )}
        confirmLabel={t("teacher_outcomes.delete", "Delete")}
        isPending={deleteOutcome.isPending}
        onConfirm={() => {
          if (pendingDeleteId) void handleDelete(pendingDeleteId);
        }}
      />
    </div>
  );
}

function AddLessonPills({
  moduleId,
  courseId,
  nextPosition,
  itemCount,
}: {
  moduleId: string;
  courseId: string;
  nextPosition: number;
  itemCount: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createLesson = useCreateLesson(moduleId, courseId);
  const createQuiz = useCreateQuiz(courseId);
  const createInterview = useCreateInterviewConfig(courseId);
  const [adding, setAdding] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");

  function slugify(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleAdd(lessonType: string) {
    if (adding) return;
    const labelKey = LESSON_TYPE_CONFIG[lessonType]?.label;
    const label = labelKey ? t(labelKey) : lessonType;
    const title = t("teacher_common.new_item_title", { label });
    setAdding(true);
    try {
      await createLesson.mutateAsync({
        title,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        lesson_type: lessonType as "video" | "reading",
      });
      toast.success(t("teacher_common.lesson_added", { label }));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_common.add_lesson_failed"),
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleAddQuiz() {
    if (adding) return;
    setAdding(true);
    try {
      const quiz = await createQuiz.mutateAsync({
        module_id: moduleId,
        title: t("teacher_common.new_quiz_title", { number: itemCount + 1 }),
        description: t("teacher_common.new_quiz_description"),
      });
      void navigate({
        to: "/teacher/courses/$courseId/quizzes/$quizId",
        params: { courseId, quizId: quiz.id },
      });
      toast.success(t("teacher_common.quiz_added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_common.add_quiz_failed"),
      );
    } finally {
      setAdding(false);
    }
  }

  function handleAddInterview() {
    setInterviewTitle("");
    setInterviewModalOpen(true);
  }

  async function handleCreateInterview() {
    if (!interviewTitle.trim()) {
      toast.error(t("teacher_interview_config_new.errors.title_required"));
      return;
    }
    try {
      const config = await createInterview.mutateAsync({
        course_id: courseId,
        module_id: moduleId,
        title: interviewTitle.trim(),
        supported_modes: "hybrid",
        lock_quiz_ef_until_pass: false,
        security_response_policy: "warn_and_continue",
        security_max_consecutive_attempts: 3,
        security_incident_summary_enabled: true,
      });
      setInterviewModalOpen(false);
      toast.success(t("teacher_interview_config_new.success.created"));
      void navigate({
        to: "/teacher/courses/$courseId/interview-configs/$configId",
        params: { courseId, configId: config.id },
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config_new.errors.create_failed"),
      );
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-m3-outline-variant/10">
      {Object.entries(LESSON_TYPE_CONFIG).map(([type, cfg]) => {
        const Icon = cfg.icon;
        return (
          <button
            key={type}
            type="button"
            disabled={adding}
            onClick={() => handleAdd(type)}
            className={ADD_PILL_CLS}
          >
            <Icon className="h-3.5 w-3.5" />
            <Plus className="h-3 w-3 -ml-0.5" />
            {t(cfg.label)}
          </button>
        );
      })}
      <button
        type="button"
        disabled={adding}
        onClick={handleAddQuiz}
        className={ADD_PILL_CLS}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
        {t("teacher_common.add_quiz_pill")}
      </button>
      <button
        type="button"
        disabled={adding}
        onClick={handleAddInterview}
        className={ADD_PILL_CLS}
      >
        <Mic className="h-3.5 w-3.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
        {t("teacher_common.add_interview_pill")}
      </button>

      <PromptDialog
        open={interviewModalOpen}
        onOpenChange={setInterviewModalOpen}
        title={t("teacher_interview_config_new.modal_title")}
        description={t("teacher_interview_config_new.modal_description")}
        confirmLabel={
          createInterview.isPending
            ? t("teacher_interview_config_new.submitting")
            : t("teacher_interview_config_new.submit")
        }
        isPending={createInterview.isPending}
        onConfirm={handleCreateInterview}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            {t("teacher_interview_config_new.fields.title")} *
          </label>
          <Input
            autoFocus
            required
            placeholder={t(
              "teacher_interview_config_new.fields.title_placeholder",
            )}
            value={interviewTitle}
            onChange={(e) => setInterviewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateInterview();
              }
            }}
          />
        </div>
      </PromptDialog>
    </div>
  );
}

function ModuleItemRow({
  item,
  courseId,
  isDragOver,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  item: CourseContentItem;
  courseId: string;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const { t } = useTranslation();
  const lesson = item.lesson;
  const quiz = item.quiz;
  const interview = item.interview;
  // Dragging is armed only while the grip handle is held (see the handle
  // button below) so the row's title link + buttons remain clickable.
  const [dragEnabled, setDragEnabled] = useState(false);
  // Inline publish (T#2): publish a draft item without opening it. Publishing
  // is the stated pain point and every item type supports it; unpublish is not
  // uniformly exposed (quizzes have no unpublish route), so the inline control
  // is publish-only — a published item shows a static status badge.
  const publishLesson = useUpdateLesson(item.lesson_id ?? "", courseId);
  const publishQuiz = usePublishQuiz(item.quiz_id ?? undefined);
  const publishInterview = usePublishInterviewConfig(
    item.interview_config_id ?? undefined,
  );
  const lessonType = item.target?.lesson_type ?? lesson?.lesson_type ?? "video";
  const cfg =
    item.item_type === "lesson"
      ? (LESSON_TYPE_CONFIG[lessonType] ?? LESSON_TYPE_CONFIG["video"])
      : item.item_type === "quiz"
        ? QUIZ_ITEM_CONFIG
        : INTERVIEW_ITEM_CONFIG;
  const Icon = cfg?.icon ?? BookOpen;
  const rawLabel = cfg?.label ?? item.item_type;
  const label = rawLabel.startsWith("teacher_common.")
    ? t(rawLabel)
    : item.item_type === "lesson"
      ? t("teacher_common.lesson_fallback")
      : rawLabel;
  const title =
    item.target?.title ??
    lesson?.title ??
    quiz?.title ??
    interview?.title ??
    label;
  // Status lives on `item.target` in the teacher content payload (the
  // `item.lesson/quiz/interview` fields are only populated on the public/learner
  // payload). Reading the wrong field left `status` undefined, so the inline
  // publish control never rendered — the \"no quick publish\" bug.
  const status =
    item.target?.status ??
    lesson?.status ??
    quiz?.status ??
    interview?.status;
  const publishing =
    publishLesson.isPending ||
    publishQuiz.isPending ||
    publishInterview.isPending;

  function handlePublish(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const onError = (err: unknown) =>
      toast.error(
        (err as Error).message || t("teacher_common.publish_failed"),
      );
    const onSuccess = () =>
      toast.success(t("teacher_common.item_published", { title }));
    if (item.item_type === "lesson" && item.lesson_id) {
      publishLesson.mutate({ status: "published" }, { onSuccess, onError });
    } else if (item.item_type === "quiz" && item.quiz_id) {
      publishQuiz.mutate(undefined, { onSuccess, onError });
    } else if (item.item_type === "interview" && item.interview_config_id) {
      publishInterview.mutate(undefined, { onSuccess, onError });
    }
  }

  return (
    <div
      draggable={dragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        setDragEnabled(false);
        onDragEnd();
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group select-none",
        isDragging ? "opacity-40" : "",
        isDragOver
          ? "ring-2 ring-m3-primary/40 bg-m3-primary-fixed shadow-sm"
          : "bg-m3-surface hover:bg-m3-surface-container",
      )}
    >
      {/* Drag handle: dragging is enabled ONLY while grabbing this grip, so the
          title link + action buttons stay clickable. Previously the whole row
          was draggable but the title <Link draggable={false}> covered most of
          it and swallowed drag-starts — the \"item drag doesn't work\" bug. */}
      <button
        type="button"
        aria-label={t("teacher_common.drag_to_reorder")}
        onMouseDown={() => setDragEnabled(true)}
        onMouseUp={() => setDragEnabled(false)}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 text-m3-outline-variant hover:text-m3-on-surface-variant"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          cfg?.badge ?? "bg-slate-50 text-slate-500",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      {item.item_type === "lesson" && item.lesson_id ? (
        <Link
          to="/teacher/courses/$courseId/lessons/$lessonId"
          params={{ courseId, lessonId: item.lesson_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : item.item_type === "quiz" && item.quiz_id ? (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId: item.quiz_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : item.item_type === "interview" && item.interview_config_id ? (
        <Link
          to="/teacher/courses/$courseId/interview-configs/$configId"
          params={{ courseId, configId: item.interview_config_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : (
        <span className="flex-1 text-xs font-medium text-m3-on-surface truncate">
          {title}
        </span>
      )}
      <Badge
        className={cn(
          "text-[10px] border-0 shrink-0",
          cfg?.badge ?? "bg-slate-100 text-slate-500",
        )}
      >
        {label}
      </Badge>
      {status &&
        (status === "published" ? (
          <Badge className="text-[10px] border-0 shrink-0 bg-emerald-100 text-emerald-700">
            {status}
          </Badge>
        ) : (
          // Inline publish (T#2): a draft/archived item can be published right
          // here without opening it. Stops propagation so it doesn't trigger
          // the row's drag / link behaviour.
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            title={t("teacher_common.publish_item")}
            className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <CircleDot className="h-2.5 w-2.5" />
            )}
            {t("teacher_common.publish_item")}
          </button>
        ))}
      <div className="flex items-center gap-1 text-m3-on-surface-variant">
        {item.item_type === "lesson" && item.lesson_id && (
          <Link
            to="/teacher/courses/$courseId/lessons/$lessonId"
            params={{ courseId, lessonId: item.lesson_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-m3-on-surface"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </Link>
        )}
        {item.item_type === "quiz" && item.quiz_id && (
          <Link
            to="/teacher/courses/$courseId/quizzes/$quizId"
            params={{ courseId, quizId: item.quiz_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-m3-on-surface"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </Link>
        )}
        {item.item_type === "interview" && item.interview_config_id && (
          <Link
            to="/teacher/courses/$courseId/interview-configs/$configId"
            params={{ courseId, configId: item.interview_config_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-m3-on-surface"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function ModuleAccordion({
  module,
  courseId,
  open,
  onToggle,
  registerRef,
  isDragOver,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  module: CourseContentModule;
  courseId: string;
  open: boolean;
  onToggle: () => void;
  /** Registers this module's DOM node so the quick-nav rail can scroll to it. */
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const { t } = useTranslation();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(module.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const updateModule = useUpdateModule(module.id, courseId);
  const reorderItems = useReorderModuleItems(module.id, courseId);
  const qc = useQueryClient();

  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Module dragging is armed only while the header grip is held so the title
  // edit / edit-link / publish controls in the header stay clickable.
  const [moduleDragEnabled, setModuleDragEnabled] = useState(false);

  const allItemsSorted = [...(module.items ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const lessonCount = (module.items ?? []).filter(
    (i) => i.item_type === "lesson",
  ).length;
  const quizCount = (module.items ?? []).filter(
    (i) => i.item_type === "quiz",
  ).length;
  const interviewCount = (module.items ?? []).filter(
    (i) => i.item_type === "interview",
  ).length;

  // Publish progress (T#2 + #1): how many items are live. Drives the header
  // "N/M published" chip and the "Publish all" action. An item's status lives
  // on its target (lesson/quiz/interview); items with no status are ignored.
  function itemStatus(i: CourseContentItem): string | undefined {
    // Teacher payload carries status on `target`; the typed lesson/quiz/
    // interview fields are learner-payload-only. Check target first.
    return (
      i.target?.status ??
      i.lesson?.status ??
      i.quiz?.status ??
      i.interview?.status
    );
  }
  const statusedItems = (module.items ?? []).filter(
    (i) => itemStatus(i) !== undefined,
  );
  const publishedCount = statusedItems.filter(
    (i) => itemStatus(i) === "published",
  ).length;
  const draftItems = statusedItems.filter(
    (i) => itemStatus(i) !== "published",
  );
  const allPublished =
    statusedItems.length > 0 && publishedCount === statusedItems.length;

  function handleDrop(dropIdx: number) {
    if (dragSourceIdx === null || dragSourceIdx === dropIdx) {
      setDragSourceIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...allItemsSorted];
    const [moved] = newOrder.splice(dragSourceIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    const allIds = newOrder.map((item) => item.id);
    reorderItems.mutate(allIds, {
      onError: (err) =>
        toast.error(
          (err as Error).message || t("teacher_common.reorder_failed"),
        ),
    });
    setDragSourceIdx(null);
    setDragOverIdx(null);
  }

  function startEditTitle(e: React.MouseEvent) {
    e.stopPropagation();
    setTitleDraft(module.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== module.title) {
      updateModule.mutate(
        { title: trimmed },
        {
          onError: (err) => toast.error((err as Error).message),
        },
      );
    }
  }

  function toggleStatus(e: React.MouseEvent) {
    e.stopPropagation();
    const next = module.status === "published" ? "draft" : "published";
    updateModule.mutate(
      { status: next },
      {
        onSuccess: () =>
          toast.success(
            t("teacher_common.module_status_set", {
              status: t(`teacher_dashboard.status.${next}`),
            }),
          ),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  // Publish-all (T#2): fire a publish for every draft item in this module in
  // parallel. Each item type has its own route, so we branch per item. The
  // per-row hooks can't be reused here (hooks can't live in a loop), so we PATCH
  // /POST directly via the same endpoints those hooks call. Best-effort with a
  // summary toast; the content query is invalidated once at the end.
  const [publishingAll, setPublishingAll] = useState(false);
  async function handlePublishAll(e: React.MouseEvent) {
    e.stopPropagation();
    if (draftItems.length === 0 || publishingAll) return;
    setPublishingAll(true);
    const results = await Promise.allSettled(
      draftItems.map((i) => {
        if (i.item_type === "lesson" && i.lesson_id) {
          return apiPatch(`/teacher/lessons/${i.lesson_id}`, {
            status: "published",
          });
        }
        if (i.item_type === "quiz" && i.quiz_id) {
          return apiPost(`/teacher/quizzes/${i.quiz_id}/publish`);
        }
        if (i.item_type === "interview" && i.interview_config_id) {
          return apiPost(
            `/teacher/interview-configs/${i.interview_config_id}/publish`,
          );
        }
        return Promise.reject(new Error("unpublishable item"));
      }),
    );
    setPublishingAll(false);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    void qc.invalidateQueries({
      queryKey: ["teacher", "courses", courseId, "content"],
    });
    if (failed > 0) {
      toast.warning(
        t("teacher_common.publish_all_partial", { ok, failed }),
      );
    } else {
      toast.success(t("teacher_common.publish_all_done", { count: ok }));
    }
  }

  return (
    <div
      ref={(el) => registerRef(module.id, el)}
      id={`module-${module.id}`}
      draggable={moduleDragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        setModuleDragEnabled(false);
        onDragEnd();
      }}
      className={cn(
        "flex flex-col rounded-xl border-l-4 overflow-hidden scroll-mt-24 transition-all",
        isDragging ? "opacity-40" : "",
        isDragOver
          ? "ring-2 ring-m3-primary/40 shadow-sm"
          : "",
        open ? "border-m3-primary" : "border-m3-outline-variant",
      )}
    >
      {/* Header row */}
      <div
        className={cn(
          "group w-full flex items-center gap-3 p-4 text-left cursor-pointer transition-colors",
          "bg-m3-surface-container-low hover:bg-m3-surface-container",
        )}
        onClick={() => !editingTitle && onToggle()}
      >
        {/* Drag handle — dragging armed only while grabbing this grip so the
            title / edit / publish controls in the header stay clickable. */}
        <button
          type="button"
          aria-label={t("teacher_common.drag_to_reorder")}
          onMouseDown={() => setModuleDragEnabled(true)}
          onMouseUp={() => setModuleDragEnabled(false)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 text-m3-outline-variant hover:text-m3-on-surface-variant"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Title — editable inline */}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setEditingTitle(false);
                setTitleDraft(module.title);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 font-headline font-semibold text-sm text-m3-on-surface bg-transparent border-b border-m3-secondary outline-none py-0.5"
          />
        ) : (
          <span className="flex-1 font-headline font-semibold text-sm text-m3-on-surface transition-colors group-hover:text-m3-primary">
            {updateModule.isPending &&
            updateModule.variables &&
            "title" in updateModule.variables
              ? ((updateModule.variables as { title?: string }).title ??
                module.title)
              : module.title}
          </span>
        )}

        <Link
          to="/teacher/courses/$courseId/modules/$moduleId"
          params={{ courseId, moduleId: module.id }}
          title={t("teacher_common.edit_module")}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 px-2.5 text-xs border-m3-outline-variant/30"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">
              {t("teacher_common.edit_button")}
            </span>
          </Button>
        </Link>

        {/* Status badge — click to toggle */}
        <button
          type="button"
          title={t("teacher_common.mark_module_as", {
            status: t(
              `teacher_dashboard.status.${module.status === "published" ? "draft" : "published"}`,
            ),
          })}
          onClick={toggleStatus}
          disabled={updateModule.isPending}
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border-0 transition-colors cursor-pointer",
            module.status === "published"
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100",
          )}
        >
          {updateModule.isPending
            ? "…"
            : module.status
              ? t(`teacher_dashboard.status.${module.status}`)
              : module.status}
        </button>

        {/* Publish progress chip (T#1 + #2): fills the wasted middle space with
            useful signal — how many items are live. Green when all published. */}
        {statusedItems.length > 0 && (
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
              allPublished
                ? "bg-emerald-100 text-emerald-700"
                : "bg-m3-surface-container-high text-m3-on-surface-variant",
            )}
            title={t("teacher_common.publish_progress", {
              published: publishedCount,
              total: statusedItems.length,
            })}
          >
            {allPublished ? (
              <CheckCheck className="h-2.5 w-2.5" />
            ) : (
              <CircleDot className="h-2.5 w-2.5" />
            )}
            {publishedCount}/{statusedItems.length}
          </span>
        )}

        {/* Publish-all (T#2): one click publishes every draft item in the
            module. Only shown when there's at least one draft to publish. */}
        {draftItems.length > 0 && (
          <button
            type="button"
            onClick={handlePublishAll}
            disabled={publishingAll}
            title={t("teacher_common.publish_all", {
              count: draftItems.length,
            })}
            className="shrink-0 hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {publishingAll ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <CheckCheck className="h-2.5 w-2.5" />
            )}
            {t("teacher_common.publish_all", { count: draftItems.length })}
          </button>
        )}

        {/* Meta counts */}
        <span className="text-[11px] text-m3-on-surface-variant hidden md:block shrink-0">
          {lessonCount}L{quizCount > 0 && ` · ${quizCount}Q`}
          {interviewCount > 0 && ` · ${interviewCount}I`}
        </span>

        {/* Pencil to edit title */}
        <button
          type="button"
          title={t("teacher_common.rename_module")}
          onClick={startEditTitle}
          className="shrink-0 p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary transition-colors"
        >
          {editingTitle ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Pencil className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Chevron expand */}
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-m3-on-surface-variant transition-transform duration-300",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div className="border-t border-m3-outline-variant bg-card">
            <div className="p-4 flex flex-col gap-1">
              {allItemsSorted.length === 0 && (
                <p className="text-xs text-m3-on-surface-variant py-2 pl-1">
                  {t("teacher_common.no_items_yet")}
                </p>
              )}
              {allItemsSorted.map((item, idx) => (
                <ModuleItemRow
                  key={item.id}
                  item={item}
                  courseId={courseId}
                  isDragOver={dragOverIdx === idx}
                  isDragging={dragSourceIdx === idx}
                  onDragStart={(e) => {
                    setDragSourceIdx(idx);
                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    e.dataTransfer.setDragImage(
                      el,
                      e.clientX - rect.left,
                      e.clientY - rect.top,
                    );
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIdx(idx);
                  }}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => {
                    setDragSourceIdx(null);
                    setDragOverIdx(null);
                  }}
                />
              ))}
              <AddLessonPills
                moduleId={module.id}
                courseId={courseId}
                nextPosition={(module.items ?? []).length + 1}
                itemCount={(module.items ?? []).length}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddModuleForm({
  courseId,
  nextPosition,
  onDone,
}: {
  courseId: string;
  nextPosition: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const createModule = useCreateModule(courseId);
  const [title, setTitle] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createModule.mutateAsync({ title, position: nextPosition });
      toast.success(t("teacher_common.module_created"));
      onDone();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_common.create_module_failed"),
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 p-4 bg-m3-surface-container rounded-xl"
    >
      <Input
        autoFocus
        required
        placeholder={t("teacher_common.module_title_placeholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 text-sm"
      />
      <Button type="submit" size="sm" disabled={createModule.isPending}>
        {createModule.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          t("common.create")
        )}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        {t("common.cancel")}
      </Button>
    </form>
  );
}

export default function CourseManagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useTeacherCourseById(courseId);
  const { data: content, isLoading } = useTeacherCourseContent(courseId);
  const [addingModule, setAddingModule] = useState(false);
  const deleteCourse = useDeleteTeacherCourse(courseId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const modules = content?.modules ?? [];

  // Per-course open/closed state, persisted to localStorage (T#: "remember what
  // I last had open"). Keyed by module id. A module absent from the map falls
  // back to closed. Seeded once from storage; every toggle writes back.
  const storageKey = `co4029:course-manage:open:${courseId}`;
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(openMap));
    } catch {
      /* storage full / unavailable — non-fatal, state still works in-memory */
    }
  }, [openMap, storageKey]);
  function toggleModule(id: string) {
    setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  }
  function setAllModules(open: boolean) {
    setOpenMap(Object.fromEntries(modules.map((m) => [m.id, open])));
  }

  // Ref registry so the quick-nav rail can scroll a module into view (T#3/#4).
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function registerModuleRef(id: string, el: HTMLDivElement | null) {
    moduleRefs.current[id] = el;
  }

  // Module drag-reorder. dragEnabled is armed only while the module grip is
  // held (same pattern as item rows) so the header's title/buttons stay usable.
  const reorderModules = useReorderModules(courseId);
  const [modDragIdx, setModDragIdx] = useState<number | null>(null);
  const [modDragOverIdx, setModDragOverIdx] = useState<number | null>(null);
  function handleModuleDrop(dropIdx: number) {
    if (modDragIdx === null || modDragIdx === dropIdx) {
      setModDragIdx(null);
      setModDragOverIdx(null);
      return;
    }
    const newOrder = [...modules];
    const [moved] = newOrder.splice(modDragIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    reorderModules.mutate(
      newOrder.map((m) => m.id),
      {
        onError: (err) =>
          toast.error(
            (err as Error).message || t("teacher_common.reorder_failed"),
          ),
      },
    );
    setModDragIdx(null);
    setModDragOverIdx(null);
  }
  function scrollToModule(id: string) {
    // Ensure it's open before scrolling so the target has its full height.
    setOpenMap((m) => (m[id] ? m : { ...m, [id]: true }));
    requestAnimationFrame(() => {
      moduleRefs.current[id]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function handleDeleteCourse() {
    try {
      await deleteCourse.mutateAsync();
      toast.success(t("teacher_course_settings.delete.deleted"));
      setConfirmDelete(false);
      void navigate({ to: "/teacher/courses" });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_course_settings.delete.failed"),
      );
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/teacher/courses">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-0.5">
            <Link
              to="/teacher/courses"
              className="hover:text-m3-primary transition-colors"
            >
              {t("teacher_courses_list.title")}
            </Link>
            <ArrowRight className="h-3 w-3" />
            <span className="truncate">{course?.title ?? "…"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 flex-1 text-xl font-headline font-bold text-m3-on-surface truncate">
              {course?.title ?? t("teacher_common.curriculum_fallback_title")}
            </h1>
            {/* Delete — destructive, pushed to the right of the course name.
                Red hover fill + subtle lift; press-down on click. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteCourse.isPending}
              className="shrink-0 gap-2 border-destructive/40 text-destructive transition-all hover:-translate-y-0.5 hover:bg-destructive hover:text-white hover:shadow-md active:translate-y-0 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              {t("teacher_course_settings.delete.button")}
            </Button>
          </div>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t("teacher_common.module_count", { count: modules.length })}
            {modules.length > 0 &&
              t("teacher_common.lesson_count_suffix", {
                count: modules.reduce(
                  (acc, m) =>
                    acc +
                    (m.items ?? []).filter((i) => i.item_type === "lesson")
                      .length,
                  0,
                ),
              })}
          </p>

          {/* Course navigation — moved below the course name so the header
              stays clean and the nav wraps as its own row. */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Link
              to="/teacher/courses/$courseId/students"
              params={{ courseId }}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-m3-outline-variant/30 shrink-0"
              >
                <Users className="h-4 w-4 text-m3-secondary" />
                <span className="hidden sm:inline">
                  {t("teacher_common.nav_students")}
                </span>
              </Button>
            </Link>
            <Link
              to="/teacher/courses/$courseId/progress"
              params={{ courseId }}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-m3-outline-variant/30 shrink-0"
              >
                <Activity className="h-4 w-4 text-m3-secondary" />
                <span className="hidden sm:inline">
                  {t("teacher_common.nav_progress")}
                </span>
              </Button>
            </Link>
            <Link
              to="/teacher/courses/$courseId/assessments"
              params={{ courseId }}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-m3-outline-variant/30 shrink-0"
              >
                <ClipboardList className="h-4 w-4 text-m3-secondary" />
                <span className="hidden sm:inline">
                  {t("teacher_common.nav_assessments")}
                </span>
              </Button>
            </Link>
            <Link
              to="/teacher/courses/$courseId/question-bank"
              params={{ courseId }}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-m3-outline-variant/30 shrink-0"
              >
                <Library className="h-4 w-4 text-m3-secondary" />
                <span className="hidden sm:inline">
                  {t("teacher_common.nav_question_bank")}
                </span>
              </Button>
            </Link>
            <Link
              to="/teacher/courses/$courseId/sr-cohort"
              params={{ courseId }}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-m3-outline-variant/30 shrink-0"
              >
                <Brain className="h-4 w-4 text-m3-secondary" />
                <span className="hidden sm:inline">
                  {t("teacher_common.nav_retention")}
                </span>
              </Button>
            </Link>
            <Link
              to="/management/courses/$courseId/enrollments"
              params={{ courseId }}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-m3-outline-variant/30 shrink-0"
              >
                <UserPlus className="h-4 w-4 text-m3-secondary" />
                <span className="hidden sm:inline">
                  {t("teacher_common.nav_manage_enrollments")}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Course Settings — the panel carries its own titled, collapsible
          header (icon + "Course Settings" + status summary), so an outer
          <h2> here just duplicated that title. Panel stands alone. */}
      <CourseSettingsPanel courseId={courseId} />

      {/* Learning Outcomes — same story: LearningOutcomesPanel self-titles,
          so no redundant section header. */}
      <LearningOutcomesPanel courseId={courseId} />

      {/* Curriculum */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-m3-primary" />
            <h2 className="text-base font-headline font-bold text-m3-primary">
              {t("teacher_common.section_curriculum")}
            </h2>
          </div>
          {/* Expand/collapse all (T#1/#3): fast way to open or compact every
              module at once. */}
          {modules.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAllModules(true)}
                className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors cursor-pointer px-2 py-1"
              >
                {t("teacher_common.expand_all")}
              </button>
              <span className="text-m3-outline-variant">·</span>
              <button
                type="button"
                onClick={() => setAllModules(false)}
                className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors cursor-pointer px-2 py-1"
              >
                {t("teacher_common.collapse_all")}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 bg-m3-surface-container animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Horizontal quick-nav bar (T#3/#4): jump to any module + see its
                publish progress at a glance. Was a 220px left rail that squeezed
                the module cards; now a full-width horizontal chip row that
                scrolls on overflow, so modules get the full width. */}
            {modules.length > 1 && (
              <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-m3-outline-variant/40 pb-2">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant/70">
                  {t("teacher_common.jump_to")}
                </span>
                {modules.map((module) => {
                  const st = (i: CourseContentItem) =>
                    i.target?.status ??
                    i.lesson?.status ??
                    i.quiz?.status ??
                    i.interview?.status;
                  const items = (module.items ?? []).filter(
                    (i) => st(i) !== undefined,
                  );
                  const pub = items.filter(
                    (i) => st(i) === "published",
                  ).length;
                  const done = items.length > 0 && pub === items.length;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => scrollToModule(module.id)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-m3-outline-variant/60 px-3 py-1 text-left text-xs text-m3-on-surface hover:border-m3-primary hover:bg-m3-surface-container transition-colors cursor-pointer group"
                    >
                      {done ? (
                        <CheckCheck className="h-3 w-3 shrink-0 text-emerald-600" />
                      ) : (
                        <CircleDot className="h-3 w-3 shrink-0 text-m3-outline-variant group-hover:text-m3-primary" />
                      )}
                      <span className="max-w-[12rem] truncate group-hover:text-m3-primary transition-colors">
                        {module.title}
                      </span>
                      {items.length > 0 && (
                        <span className="text-[10px] text-m3-on-surface-variant shrink-0">
                          {pub}/{items.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="space-y-3 min-w-0">
              {modules.map((module, idx) => (
                <ModuleAccordion
                  key={module.id}
                  module={module}
                  courseId={courseId}
                  open={!!openMap[module.id]}
                  onToggle={() => toggleModule(module.id)}
                  registerRef={registerModuleRef}
                  isDragOver={modDragOverIdx === idx}
                  isDragging={modDragIdx === idx}
                  onDragStart={(e) => {
                    setModDragIdx(idx);
                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    e.dataTransfer.setDragImage(
                      el,
                      e.clientX - rect.left,
                      e.clientY - rect.top,
                    );
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setModDragOverIdx(idx);
                  }}
                  onDrop={() => handleModuleDrop(idx)}
                  onDragEnd={() => {
                    setModDragIdx(null);
                    setModDragOverIdx(null);
                  }}
                />
              ))}

              {addingModule ? (
                <AddModuleForm
                  courseId={courseId}
                  nextPosition={modules.length + 1}
                  onDone={() => setAddingModule(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-sm"
                  onClick={() => setAddingModule(true)}
                >
                  <Plus className="h-4 w-4" />
                  {t("teacher_common.add_module")}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("teacher_course_settings.delete.title")}
        description={t("teacher_course_settings.delete.body", {
          title: course?.title ?? "",
        })}
        confirmLabel={t("teacher_course_settings.delete.button")}
        cancelLabel={t("common.cancel", "Cancel")}
        confirmVariant="destructive"
        onConfirm={handleDeleteCourse}
        isPending={deleteCourse.isPending}
      />
      {/* Long page (settings + outcomes + every module) — floating jump back
          to the top once scrolled down. */}
      <ScrollToTop />
    </div>
  );
}

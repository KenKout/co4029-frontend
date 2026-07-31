import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  Loader2,
  X,
  GraduationCap,
  Sparkles,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { cn } from "@/lib/utils";
import {
  useCreateCourse,
  useSlugAvailability,
} from "@/lib/api/hooks/teacher-courses";
import { useMe } from "@/lib/api/hooks/auth";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";

type Level = "" | "beginner" | "intermediate" | "advanced";

const DESCRIPTION_MAX = 500;

export default function ManagementCourseNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const createCourse = useCreateCourse();

  // Course creation is a manager capability (backend gates POST /teacher/courses
  // on `course.create`, held by manager/admin only). Guard the screen so a user
  // without the permission is bounced instead of hitting a 403 on submit.
  const permissions = usePermissions();
  const canCreate = permissions.has("course.create");

  useRequirePermission(canCreate, {
    messageKey: "dept_courses.no_permission",
    redirectTo: "/dept",
  });

  const [form, setForm] = useState({
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

  function slugify(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
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
    !createCourse.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !canSubmit) return;

    try {
      const course = await createCourse.mutateAsync({
        title: form.title,
        slug: form.slug || slugify(form.title),
        description: form.description || undefined,
        level: (form.level || undefined) as
          | "beginner"
          | "intermediate"
          | "advanced"
          | undefined,
        estimated_minutes: form.estimated_minutes
          ? parseInt(form.estimated_minutes)
          : undefined,
      });
      toast.success(t("teacher_course_new.created"));
      navigate({
        to: "/dept/courses/$courseId",
        params: { courseId: course.id },
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_course_new.create_failed"),
      );
    }
  }

  const levelOptions = useMemo(
    () =>
      (["beginner", "intermediate", "advanced"] as const).map((lvl) => ({
        key: lvl,
        label: t(`teacher_dashboard.level.${lvl}`, { defaultValue: lvl }),
      })),
    [t],
  );

  if (permissions.isLoading || !canCreate) {
    return null;
  }

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("dept_courses.title"), to: "/dept" },
          { label: t("teacher_course_new.title") },
        ]}
      />

      <div className="flex items-center gap-3">
        <Link to="/dept">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-headline font-bold text-m3-primary">
          {t("teacher_course_new.title")}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-card ghost-border shadow-editorial rounded-xl p-6 space-y-6"
        >
          {/* Section: Basics */}
          <div className="space-y-4">
            <h2 className="text-sm font-headline font-bold text-m3-on-surface">
              {t("teacher_course_new.section_basics")}
            </h2>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-m3-on-surface">
                {t("teacher_course_new.field_title")} *
              </label>
              <Input
                required
                autoFocus
                placeholder={t("teacher_course_new.title_placeholder")}
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-m3-on-surface">
                {t("teacher_course_new.field_slug")} *
              </label>
              <div className="relative">
                <Input
                  required
                  placeholder="intro-to-algorithms"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className={cn(
                    "pr-9",
                    slugTaken && "border-danger focus:ring-danger/30",
                    slugAvailable && "border-success focus:ring-success/30",
                  )}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {slugChecking && (
                    <Loader2 className="h-4 w-4 animate-spin text-m3-on-surface-variant" />
                  )}
                  {!slugChecking && slugAvailable && (
                    <Check className="h-4 w-4 text-success" />
                  )}
                  {!slugChecking && slugTaken && (
                    <X className="h-4 w-4 text-danger" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-[11px]",
                    slugTaken
                      ? "text-danger"
                      : slugAvailable
                        ? "text-success"
                        : "text-m3-on-surface-variant",
                  )}
                >
                  {slugTaken
                    ? t("teacher_course_new.slug_taken")
                    : slugAvailable
                      ? t("teacher_course_new.slug_available")
                      : t("teacher_course_new.slug_hint", {
                          slug: form.slug || "your-course",
                        })}
                </p>
                {slugManuallyEdited && form.title.trim() && (
                  <button
                    type="button"
                    onClick={resetSlugToAuto}
                    className="shrink-0 text-[11px] font-medium text-m3-primary hover:underline"
                  >
                    {t("teacher_course_new.slug_reset")}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-m3-on-surface">
                {t("teacher_course_new.field_description")}
              </label>
              <textarea
                className="w-full min-h-[90px] rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("teacher_course_new.description_placeholder")}
                maxLength={DESCRIPTION_MAX}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
              <div className="flex justify-end">
                <span className="text-[11px] text-m3-on-surface-variant tabular-nums">
                  {form.description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Details */}
          <div className="space-y-4 border-t border-m3-outline-variant/15 pt-5">
            <h2 className="text-sm font-headline font-bold text-m3-on-surface">
              {t("teacher_course_new.section_details")}
            </h2>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-m3-on-surface">
                {t("teacher_course_new.field_level")}
              </label>
              <div>
                <SegmentedFilter
                  ariaLabel={t("teacher_course_new.field_level")}
                  value={
                    (form.level || "beginner") as
                      | "beginner"
                      | "intermediate"
                      | "advanced"
                  }
                  onChange={(lvl) => setForm((f) => ({ ...f, level: lvl }))}
                  options={levelOptions}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-m3-on-surface">
                {t("teacher_course_new.field_duration")}
              </label>
              <div className="relative max-w-[200px]">
                <Input
                  type="number"
                  min="0"
                  placeholder="120"
                  value={form.estimated_minutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estimated_minutes: e.target.value,
                    }))
                  }
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-m3-on-surface-variant">
                  {t("teacher_course_new.minutes_suffix")}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-m3-outline-variant/15 pt-5">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="gap-2 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              {createCourse.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {createCourse.isPending
                ? t("teacher_course_new.creating")
                : t("teacher_course_new.create")}
            </Button>
            <Link to="/dept">
              <Button type="button" variant="outline">
                {t("common.cancel", "Cancel")}
              </Button>
            </Link>
          </div>
        </form>

        {/* Live card preview — shows what the course card will look like as
            the manager fills the form, so the abstract form becomes concrete. */}
        <div className="hidden lg:block">
          <div className="sticky top-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-m3-on-surface-variant">
              {t("teacher_course_new.preview_label")}
            </p>
            <div className="flex flex-col bg-card rounded-xl overflow-hidden shadow-editorial ghost-border">
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-blue-500 via-blue-700 to-blue-800">
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <GraduationCap className="h-16 w-16 text-white" />
                </div>
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm border border-white/20">
                    <Sparkles className="h-2.5 w-2.5" />
                    {t("courses_list.ai_boost")}
                  </span>
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    {t("teacher_dashboard.status.draft")}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-2 leading-snug">
                    {form.title.trim() ||
                      t("teacher_course_new.preview_title_placeholder")}
                  </h3>
                  <p className="text-xs text-m3-on-surface-variant mt-1 line-clamp-2 leading-relaxed min-h-[2rem]">
                    {form.description.trim() ||
                      t("teacher_course_new.preview_desc_placeholder")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-m3-on-surface-variant">
                  {form.level && (
                    <span className="px-1.5 py-0.5 bg-m3-surface-container rounded-md font-medium">
                      {t(`teacher_dashboard.level.${form.level}`, {
                        defaultValue: form.level,
                      })}
                    </span>
                  )}
                  {form.estimated_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(Number(form.estimated_minutes) / 60)}h
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

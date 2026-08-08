import { Check, Loader2, X } from "lucide-react";
import type { TFunction } from "i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CourseFormController } from "./use-course-form";

export const DESCRIPTION_MAX = 500;

function SlugStatusIcon({
  slugChecking,
  slugAvailable,
  slugTaken,
}: {
  slugChecking: boolean;
  slugAvailable: boolean;
  slugTaken: boolean;
}) {
  return (
    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
      {slugChecking && (
        <Loader2 className="h-4 w-4 animate-spin text-m3-on-surface-variant" />
      )}
      {!slugChecking && slugAvailable && (
        <Check className="h-4 w-4 text-success" />
      )}
      {!slugChecking && slugTaken && <X className="h-4 w-4 text-danger" />}
    </div>
  );
}

function slugHintClass(slugTaken: boolean, slugAvailable: boolean): string {
  return slugTaken
    ? "text-danger"
    : slugAvailable
      ? "text-success"
      : "text-m3-on-surface-variant";
}

function SlugHint({
  controller,
  t,
}: {
  controller: CourseFormController;
  t: TFunction;
}) {
  const { form, slugTaken, slugAvailable } = controller;
  return (
    <p className={cn("text-[11px]", slugHintClass(slugTaken, slugAvailable))}>
      {slugTaken
        ? t("teacher_course_new.slug_taken")
        : slugAvailable
          ? t("teacher_course_new.slug_available")
          : t("teacher_course_new.slug_hint", {
              slug: form.slug || "your-course",
            })}
    </p>
  );
}

function SlugField({
  controller,
  t,
}: {
  controller: CourseFormController;
  t: TFunction;
}) {
  const {
    form,
    slugTaken,
    slugAvailable,
    slugChecking,
    slugManuallyEdited,
    handleSlugChange,
    resetSlugToAuto,
  } = controller;
  return (
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
        <SlugStatusIcon
          slugChecking={slugChecking}
          slugAvailable={slugAvailable}
          slugTaken={slugTaken}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <SlugHint controller={controller} t={t} />
        {slugManuallyEdited && form.title.trim() && (
          <Button variant="link"
            type="button"
            onClick={resetSlugToAuto}
            className="shrink-0 text-[11px] font-medium text-m3-primary hover:underline"
          >
            {t("teacher_course_new.slug_reset")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function CourseBasicsSection({
  controller,
  t,
}: {
  controller: CourseFormController;
  t: TFunction;
}) {
  const { form, setForm, handleTitleChange } = controller;
  return (
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

      <SlugField controller={controller} t={t} />

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
  );
}

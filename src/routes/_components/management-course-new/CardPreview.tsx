import { Clock, GraduationCap, Sparkles } from "lucide-react";
import type { TFunction } from "i18next";
import type { CourseFormValues } from "./use-course-form";

/**
 * Live card preview — shows what the course card will look like as
 * the manager fills the form, so the abstract form becomes concrete.
 */
export function CourseCardPreview({
  form,
  thumbnailUrl,
  t,
}: {
  form: CourseFormValues;
  /** Blob URL of the picked cover image, or null while none is chosen. */
  thumbnailUrl?: string | null;
  t: TFunction;
}) {
  return (
    /* Hidden on narrow screens (the form matters more than the preview
       there), but the column itself still renders because the teacher picker
       lives in it and must never disappear. Stickiness belongs to the column
       now, not to this card. */
    <div className="hidden lg:block">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-m3-on-surface-variant">
          {t("teacher_course_new.preview_label")}
        </p>
        <div className="flex flex-col bg-card rounded-xl overflow-hidden shadow-editorial ghost-border">
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-blue-500 via-blue-700 to-blue-800">
            {/* The chosen cover replaces the gradient placeholder. This is the
                only place the manager sees the image in the context it will
                actually appear in — the picker shows the file, this shows the
                card. */}
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            {!thumbnailUrl && (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <GraduationCap className="h-16 w-16 text-white" />
              </div>
            )}
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
  );
}

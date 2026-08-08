import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TeacherCourse, TranslateFn } from "./types";
import { THUMB_ACCEPT } from "./use-course-settings-draft";

/**
 * Thumbnail fieldset — the image representing this course on cards. Click the
 * banner (or the button) to upload a new one; the file is staged locally and
 * only persisted when the form is saved. Moved verbatim out of
 * `CourseSettingsPanel`.
 */
export function CourseSettingsThumbnailField({
  course,
  stagedPreview,
  isPending,
  inputRef,
  onFileChange,
  t,
}: {
  course: TeacherCourse | undefined;
  stagedPreview: string | null;
  isPending: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: TranslateFn;
}) {
  return (
    <div className="sm:col-span-2 space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_course_settings.thumbnail.label")}
      </label>
      <div className="flex items-center gap-4">
        <Button variant="ghost"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
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
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </span>
        </Button>
        <div className="min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            {isPending ? (
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
          ref={inputRef}
          type="file"
          accept={THUMB_ACCEPT}
          onChange={onFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

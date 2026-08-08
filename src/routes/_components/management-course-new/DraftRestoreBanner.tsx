import type { TFunction } from "i18next";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import type { CourseDraft } from "@/lib/course-draft";

/**
 * Offers a recovered draft back to the manager.
 *
 * Two genuinely different situations share this banner, and conflating them
 * would be the bug:
 *
 *  - **Nothing was submitted.** Typed values were recovered; restoring is
 *    convenience. Discarding is harmless.
 *
 *  - **A course was already created** (`courseId` present) and a later step —
 *    a teacher, the cover image, the stage placement — did not finish. The
 *    course EXISTS. Discarding here does not undo it; it only forgets the
 *    unfinished work, and re-filling the form would create a second course.
 *    That is spelled out rather than implied, because "Discard" reads as
 *    "cancel" and here it is not.
 */
export function DraftRestoreBanner({
  draft,
  onRestore,
  onDiscard,
  t,
}: {
  draft: CourseDraft;
  onRestore: () => void;
  onDiscard: () => void;
  t: TFunction;
}) {
  const partiallyCreated = Boolean(draft.courseId);

  return (
    <div
      className={
        partiallyCreated
          ? "rounded-xl border border-m3-error/30 bg-m3-error/5 p-4 space-y-3"
          : "rounded-xl border border-m3-outline-variant/25 bg-surface-muted p-4 space-y-3"
      }
    >
      <div className="flex items-start gap-2.5">
        {partiallyCreated ? (
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-m3-error" />
        ) : (
          <RotateCcw className="h-4 w-4 shrink-0 mt-0.5 text-m3-on-surface-variant" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-m3-on-surface">
            {partiallyCreated
              ? t("teacher_course_new.draft_partial_title")
              : t("teacher_course_new.draft_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant">
            {partiallyCreated
              ? t("teacher_course_new.draft_partial_help")
              : t("teacher_course_new.draft_help")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-6">
        <button
          type="button"
          onClick={onRestore}
          className="h-8 px-3 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold cursor-pointer"
        >
          {partiallyCreated
            ? t("teacher_course_new.draft_resume")
            : t("teacher_course_new.draft_restore")}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="h-8 px-3 rounded-full text-xs font-semibold text-m3-on-surface-variant hover:bg-m3-surface-container cursor-pointer inline-flex items-center gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          {t("teacher_course_new.draft_discard")}
        </button>
      </div>
    </div>
  );
}

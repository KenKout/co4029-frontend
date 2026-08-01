import { useTranslation } from "react-i18next";
import { ChevronDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { CourseSettingsContactFields } from "./CourseSettingsContactFields";
import { CourseSettingsDeliveryFields } from "./CourseSettingsDeliveryFields";
import { CourseSettingsMetaFields } from "./CourseSettingsMetaFields";
import { CourseSettingsSaveBar } from "./CourseSettingsSaveBar";
import { CourseSettingsThumbnailField } from "./CourseSettingsThumbnailField";
import { useCourseSettingsDraft } from "./use-course-settings-draft";

/**
 * Collapsible "Course Settings" panel: title/slug/description/level/status,
 * duration + enrolment caps, teacher contact info, and a staged thumbnail
 * upload. All fields are buffered locally and persisted on Save (including the
 * thumbnail, which is only uploaded when the form is submitted).
 *
 * Previously a single 550-line / complexity-48 function. The buffered state,
 * the dirty check and the Save action now live in `use-course-settings-draft.ts`
 * (over `course-settings-model.ts` for the pure field chains) and each fieldset
 * is its own component; every expression is carried over unchanged.
 */
export function CourseSettingsPanel({ courseId }: { courseId: string }) {
  const { t, i18n } = useTranslation();
  const {
    course,
    updateCourse,
    uploadThumbnail,
    open,
    setOpen,
    values,
    setters,
    thumbnailInputRef,
    stagedPreview,
    handleThumbnailFile,
    settingsDirty,
    justSaved,
    lastSaved,
    handleSave,
  } = useCourseSettingsDraft({ courseId, t });

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
              <CourseSettingsThumbnailField
                course={course}
                stagedPreview={stagedPreview}
                isPending={uploadThumbnail.isPending}
                inputRef={thumbnailInputRef}
                onFileChange={handleThumbnailFile}
                t={t}
              />
              <CourseSettingsMetaFields
                values={values}
                setters={setters}
                t={t}
              />
              <CourseSettingsDeliveryFields
                course={course}
                values={values}
                setters={setters}
                t={t}
              />
              <CourseSettingsContactFields
                values={values}
                setters={setters}
                t={t}
              />
            </div>

            <CourseSettingsSaveBar
              isPending={updateCourse.isPending}
              settingsDirty={settingsDirty}
              justSaved={justSaved}
              lastSaved={lastSaved}
              t={t}
              i18n={i18n}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

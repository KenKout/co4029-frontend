import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { LESSON_TYPE_OPTIONS } from "./_components/lesson-manage/constants";
import { LessonActionBar } from "./_components/lesson-manage/LessonActionBar";
import { LessonSettingsSidebar } from "./_components/lesson-manage/LessonSettingsSidebar";
import { LessonBreadcrumbs } from "./_components/lesson-manage/LessonBreadcrumbs";
import { LessonEditorMain } from "./_components/lesson-manage/LessonEditorMain";
import { LessonFeedbackToast } from "./_components/lesson-manage/LessonFeedbackToast";
import { useLessonManageData } from "./_components/lesson-manage/use-lesson-manage-data";
import { useLessonEditorState } from "./_components/lesson-manage/use-lesson-editor-state";
import { useLessonManageActions } from "./_components/lesson-manage/use-lesson-manage-actions";
import { useLessonAiTwins } from "./_components/lesson-manage/use-lesson-ai-twins";
import { useLessonVideoUpload } from "./_components/lesson-manage/use-lesson-video-upload";
import { useLessonResourceUpload } from "./_components/lesson-manage/use-lesson-resource-upload";

/**
 * Teacher lesson editor. Owns the lesson's editable state (title/summary/type/
 * status/difficulty/duration/notes/prerequisites), the save/archive/delete
 * flows, video + resource upload, and AI-twin correlation. The heavy UI lives
 * in `_components/lesson-manage/*`; this file wires state to those views and
 * lays out the editor grid.
 */
export default function LessonManagePage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as {
    courseId: string;
    lessonId: string;
  };
  const { courseId, lessonId } = params;

  const data = useLessonManageData(courseId, lessonId);
  const editor = useLessonEditorState({
    lesson: data.lesson,
    moduleItem: data.moduleItem,
  });
  const actions = useLessonManageActions({ t, data, editor });
  const twins = useLessonAiTwins({
    t,
    data,
    showFeedback: actions.showFeedback,
  });
  const videoUpload = useLessonVideoUpload({ t, data, editor });
  const resourceUpload = useLessonResourceUpload({
    t,
    data,
    editor,
    showFeedback: actions.showFeedback,
    claimPrimaryIfEmpty: twins.claimPrimaryIfEmpty,
  });

  const { moduleId, courseModule, lesson } = data;
  const { leaveGuard } = editor;

  if (data.lessonLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  const typeLabel =
    LESSON_TYPE_OPTIONS.find((o) => o.value === editor.lessonType)?.label ??
    t("teacher_common.lesson_fallback");

  return (
    <div className="max-w-[1800px] mx-auto pb-20">
      <div className="pt-4 pb-2">
        <LessonBreadcrumbs
          courseId={courseId}
          moduleId={moduleId}
          courseTitle={data.course?.title}
          courseModule={courseModule}
          title={editor.title}
          lessonTitle={lesson?.title}
        />
      </div>

      {/* Sticky action bar: Back · Archive · Delete · Publish/Unpublish · Save. */}
      <LessonActionBar
        courseId={courseId}
        moduleId={moduleId}
        isDirty={editor.isDirty}
        onBackWhileDirty={() => leaveGuard.run(actions.goBack)}
        archiveConfirm={editor.archiveConfirm}
        onArchive={actions.handleArchive}
        onArchiveBlur={() => editor.setArchiveConfirm(false)}
        deleteConfirm={editor.deleteConfirm}
        onDelete={actions.handleDelete}
        onDeleteBlur={() => editor.setDeleteConfirm(false)}
        status={editor.status}
        onToggleStatus={() =>
          editor.setStatus((s) => (s === "published" ? "draft" : "published"))
        }
        saving={editor.saving}
        saved={editor.saved}
        onSave={actions.handleSave}
      />

      {/* ── 12-col grid ── */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Main editor — 8 cols */}
        <LessonEditorMain
          data={data}
          editor={editor}
          twins={twins}
          videoUpload={videoUpload}
          resourceUpload={resourceUpload}
          typeLabel={typeLabel}
        />

        {/* Sidebar — 4 cols, sticky */}
        <LessonSettingsSidebar
          estimatedMinutes={editor.estimatedMinutes}
          onEstimatedMinutesChange={editor.setEstimatedMinutes}
          difficulty={editor.difficulty}
          onDifficultyChange={editor.setDifficulty}
          prerequisites={editor.prerequisites}
          allLessons={data.allLessons}
          onTogglePrerequisite={actions.togglePrerequisite}
        />
      </div>

      {/* ── Feedback toast bar ── */}
      <LessonFeedbackToast feedback={editor.feedback} />

      {/* "Are you sure you want to quit?" for the back link while dirty. */}
      {leaveGuard.dialog}
    </div>
  );
}

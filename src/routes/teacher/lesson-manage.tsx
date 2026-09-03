import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCreateQuiz } from "@/lib/api/hooks/quizzes";
import { LESSON_TYPE_OPTIONS } from "./_components/lesson-manage/constants";
import { LessonActionBar } from "./_components/lesson-manage/LessonActionBar";
import { LessonSettingsSidebar } from "./_components/lesson-manage/LessonSettingsSidebar";
import { LessonBreadcrumbs } from "./_components/lesson-manage/LessonBreadcrumbs";
import { LessonEditorMain } from "./_components/lesson-manage/LessonEditorMain";
import { LessonFeedbackToast } from "./_components/lesson-manage/LessonFeedbackToast";
import { LessonDiscussionPanel } from "@/routes/courses/_components/LessonDiscussionPanel";
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
  const navigate = useNavigate();
  const createQuiz = useCreateQuiz(courseId);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

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

  // One-click next step for the "materials ready for quiz generation"
  // review items: create a draft quiz for THIS lesson and land straight on
  // the generator screen, where the lesson is picked as the source.
  const hasIngestedMaterials = (data.aiMaterials ?? []).length > 0;
  async function handleGenerateQuiz() {
    if (generatingQuiz || !lesson || !moduleId) return;
    setGeneratingQuiz(true);
    try {
      const quiz = await createQuiz.mutateAsync({
        module_id: moduleId,
        title: `Quiz: ${lesson.title}`,
        description: "Draft quiz generated from this lesson's material.",
        reminders_enabled: true,
      });
      void navigate({
        to: "/teacher/courses/$courseId/quizzes/$quizId/generate",
        params: { courseId, quizId: quiz.id },
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_quiz_new.errors.create_failed"),
      );
      setGeneratingQuiz(false);
    }
  }

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
        isDirty={editor.isDirty}
        onBackWhileDirty={() => leaveGuard.run(actions.goBack)}
        archiveConfirm={editor.archiveConfirm}
        onArchive={actions.handleArchive}
        onArchiveBlur={() => editor.setArchiveConfirm(false)}
        deleteConfirm={editor.deleteConfirm}
        onDelete={actions.handleDelete}
        onDeleteBlur={() => editor.setDeleteConfirm(false)}
        status={editor.status}
        onPublish={actions.handlePublish}
        saving={editor.saving}
        saved={editor.saved}
        onSave={actions.handleSave}
      />

      {/* Quiz-generation next step: shown when this lesson has ingested
          material that no quiz has been generated from yet. */}
      {hasIngestedMaterials && (
        <GenerateQuizBanner
          generating={generatingQuiz}
          onGenerate={() => void handleGenerateQuiz()}
          t={t}
        />
      )}

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

      {/* Discussion topics for this lesson — same panel the students see.
          New topic / edit / close / delete show because the teacher holds
          can_manage; composing topics at the lesson they belong to beats
          detouring through the student view. */}
      {lessonId ? (
        <div className="mt-8">
          <LessonDiscussionPanel lessonId={lessonId} />
        </div>
      ) : null}

      {/* ── Feedback toast bar ── */}
      <LessonFeedbackToast feedback={editor.feedback} />

      {/* "Are you sure you want to quit?" for the back link while dirty. */}
      {leaveGuard.dialog}
    </div>
  );
}

/**
 * One-click next step banner. Shown when this lesson's materials have been
 * ingested but no quiz has been generated from them: create a draft quiz
 * for THIS lesson and land straight on the generator screen.
 */
function GenerateQuizBanner({
  generating,
  onGenerate,
  t,
}: {
  generating: boolean;
  onGenerate: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <div className="mt-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-card p-4 shadow-editorial ghost-border">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-text-strong">
          <Sparkles className="h-4 w-4 shrink-0 text-m3-primary" />
          {t("teacher_common.generate_quiz_from_material")}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {t("teacher_common.generate_quiz_from_material_hint")}
        </p>
      </div>
      <Button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="rounded-xl bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {generating
          ? t("teacher_common.generating_quiz")
          : t("teacher_common.generate_quiz_from_material")}
      </Button>
    </div>
  );
}

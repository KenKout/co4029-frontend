import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCreateInterviewConfig } from "@/lib/api/hooks/interviews";
import { useCreateQuiz } from "@/lib/api/hooks/quizzes";
import { useCreateLesson } from "@/lib/api/hooks/teacher-courses";
import { LESSON_TYPE_CONFIG } from "./constants";
import { slugify } from "./helpers";
import type { TranslateFn } from "./types";

/**
 * The create-item mutations behind the add pills plus the interview-title
 * modal state. Lessons are created inline; quiz/interview creation navigates to
 * the new item's editor.
 *
 * Extracted from the former 174-line `AddLessonPills`. The hook calls keep their
 * original order (`useNavigate`, `useCreateLesson`, `useCreateQuiz`,
 * `useCreateInterviewConfig`, then the three `useState`s) so the pill row's hook
 * slots are unchanged, and every expression is carried over
 * character-for-character.
 */
export function useAddLessonItems(options: {
  moduleId: string;
  courseId: string;
  itemCount: number;
  t: TranslateFn;
}) {
  const { moduleId, courseId, itemCount, t } = options;
  const navigate = useNavigate();
  const createLesson = useCreateLesson(moduleId, courseId);
  const createQuiz = useCreateQuiz(courseId);
  const createInterview = useCreateInterviewConfig(courseId);
  const [adding, setAdding] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");

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
        // Reminders (SR due-card pings) default ON for new quizzes — the
        // teacher can turn them off per quiz in Settings.
        reminders_enabled: true,
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

  return {
    createInterview,
    adding,
    interviewModalOpen,
    setInterviewModalOpen,
    interviewTitle,
    setInterviewTitle,
    handleAdd,
    handleAddQuiz,
    handleAddInterview,
    handleCreateInterview,
  };
}

export type AddLessonItemsController = ReturnType<typeof useAddLessonItems>;

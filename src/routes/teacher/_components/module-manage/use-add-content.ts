import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCreateLesson } from "@/lib/api/hooks/teacher-courses";
import { useCreateQuiz } from "@/lib/api/hooks/quizzes";
import { useCreateInterviewConfig } from "@/lib/api/hooks/interviews";
import { LESSON_TYPE_CONFIG } from "./constants";
import { slugify } from "./helpers";
import type { TranslateFn } from "./types";

/**
 * Add-content controller for a module: the three create mutations plus the
 * draft state of the quiz / interview title prompts.
 *
 * Extracted from the former 211-line `AddContentPills` in `module-manage.tsx`.
 * Hook call order is preserved exactly — `useNavigate`, the three create
 * mutations, then the five `useState`s — because the caller already ran
 * `useTranslation()` first and passes `t` in.
 */
export function useAddContent(options: {
  moduleId: string;
  courseId: string;
  t: TranslateFn;
}) {
  const { moduleId, courseId, t } = options;
  const navigate = useNavigate();
  const createLesson = useCreateLesson(moduleId, courseId);
  const createQuiz = useCreateQuiz(courseId);
  const createInterview = useCreateInterviewConfig(courseId);
  const [adding, setAdding] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");

  async function handleAdd(lessonType: string) {
    if (adding) return;
    const label = LESSON_TYPE_CONFIG[lessonType]?.label ?? lessonType;
    const title = `New ${label}`;
    setAdding(true);
    try {
      await createLesson.mutateAsync({
        title,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        lesson_type: lessonType as "video" | "reading",
      });
      toast.success(`${label} added`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add lesson");
    } finally {
      setAdding(false);
    }
  }

  function handleAddQuiz() {
    setQuizTitle("");
    setQuizModalOpen(true);
  }

  async function handleCreateQuiz() {
    if (!quizTitle.trim()) {
      toast.error(t("teacher_quiz_new.errors.title_required"));
      return;
    }
    try {
      const quiz = await createQuiz.mutateAsync({
        module_id: moduleId,
        title: quizTitle.trim(),
        description: "Draft quiz for this module.",
        // Reminders (SR due-card pings) default ON for new quizzes — the
        // teacher can turn them off per quiz in Settings.
        reminders_enabled: true,
      });
      setQuizModalOpen(false);
      toast.success(t("teacher_quiz_new.success.created"));
      void navigate({
        to: "/teacher/courses/$courseId/quizzes/$quizId",
        params: { courseId, quizId: quiz.id },
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_quiz_new.errors.create_failed"),
      );
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
    createQuiz,
    createInterview,
    adding,
    interviewModalOpen,
    setInterviewModalOpen,
    interviewTitle,
    setInterviewTitle,
    quizModalOpen,
    setQuizModalOpen,
    quizTitle,
    setQuizTitle,
    handleAdd,
    handleAddQuiz,
    handleCreateQuiz,
    handleAddInterview,
    handleCreateInterview,
  };
}

export type AddContentController = ReturnType<typeof useAddContent>;

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, HelpCircle, Mic } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { useCreateLesson } from "@/lib/api/hooks/teacher-courses";
import { useCreateQuiz } from "@/lib/api/hooks/quizzes";
import { useCreateInterviewConfig } from "@/lib/api/hooks/interviews";
import { LESSON_TYPE_CONFIG, ADD_PILL_CLS } from "./constants";

/**
 * The row of "add" pills under a module's item list: one per lesson type plus
 * quiz and interview. Lessons are created inline; quiz/interview creation
 * navigates to the new item's editor. Interview creation first prompts for a
 * title via a modal.
 */
export function AddLessonPills({
  moduleId,
  courseId,
  itemCount,
}: {
  moduleId: string;
  courseId: string;
  itemCount: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createLesson = useCreateLesson(moduleId, courseId);
  const createQuiz = useCreateQuiz(courseId);
  const createInterview = useCreateInterviewConfig(courseId);
  const [adding, setAdding] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");

  function slugify(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

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
        supported_modes: "hybrid",
        lock_quiz_ef_until_pass: false,
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

  return (
    <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-m3-outline-variant/10">
      {Object.entries(LESSON_TYPE_CONFIG).map(([type, cfg]) => {
        const Icon = cfg.icon;
        return (
          <button
            key={type}
            type="button"
            disabled={adding}
            onClick={() => handleAdd(type)}
            className={ADD_PILL_CLS}
          >
            <Icon className="h-3.5 w-3.5" />
            <Plus className="h-3 w-3 -ml-0.5" />
            {t(cfg.label)}
          </button>
        );
      })}
      <button
        type="button"
        disabled={adding}
        onClick={handleAddQuiz}
        className={ADD_PILL_CLS}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
        {t("teacher_common.add_quiz_pill")}
      </button>
      <button
        type="button"
        disabled={adding}
        onClick={handleAddInterview}
        className={ADD_PILL_CLS}
      >
        <Mic className="h-3.5 w-3.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
        {t("teacher_common.add_interview_pill")}
      </button>

      <PromptDialog
        open={interviewModalOpen}
        onOpenChange={setInterviewModalOpen}
        title={t("teacher_interview_config_new.modal_title")}
        description={t("teacher_interview_config_new.modal_description")}
        confirmLabel={
          createInterview.isPending
            ? t("teacher_interview_config_new.submitting")
            : t("teacher_interview_config_new.submit")
        }
        isPending={createInterview.isPending}
        onConfirm={handleCreateInterview}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            {t("teacher_interview_config_new.fields.title")} *
          </label>
          <Input
            autoFocus
            required
            placeholder={t(
              "teacher_interview_config_new.fields.title_placeholder",
            )}
            value={interviewTitle}
            onChange={(e) => setInterviewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateInterview();
              }
            }}
          />
        </div>
      </PromptDialog>
    </div>
  );
}

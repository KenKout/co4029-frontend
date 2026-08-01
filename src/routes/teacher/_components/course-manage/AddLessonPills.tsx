import { useTranslation } from "react-i18next";
import { HelpCircle, Mic, Plus } from "lucide-react";
import { AddInterviewDialog } from "./AddInterviewDialog";
import { ADD_PILL_CLS, LESSON_TYPE_CONFIG } from "./constants";
import { useAddLessonItems } from "./use-add-lesson-items";

/**
 * The row of "add" pills under a module's item list: one per lesson type plus
 * quiz and interview. Lessons are created inline; quiz/interview creation
 * navigates to the new item's editor. Interview creation first prompts for a
 * title via a modal.
 *
 * Previously a single 174-line function. The create mutations and the modal
 * state now live in `use-add-lesson-items.ts` and the prompt is its own
 * component; every expression is carried over unchanged.
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
  const ctl = useAddLessonItems({ moduleId, courseId, itemCount, t });
  const { adding, handleAdd, handleAddQuiz, handleAddInterview } = ctl;

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

      <AddInterviewDialog ctl={ctl} t={t} />
    </div>
  );
}

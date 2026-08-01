import { useTranslation } from "react-i18next";
import { HelpCircle, Mic, Plus } from "lucide-react";
import { ADD_PILL_CLS, LESSON_TYPE_CONFIG } from "./constants";
import { AddContentDialogs } from "./AddContentDialogs";
import { useAddContent } from "./use-add-content";

/**
 * The "Add Content" pill row under a module's curriculum list: one pill per
 * lesson type plus quiz and interview, with their title prompts.
 *
 * Extracted from the former 887-line `module-manage.tsx`, where this was a
 * single 211-line function. All create logic now lives in `useAddContent`; the
 * markup and the pill handlers are carried over unchanged.
 */
export function AddContentPills({
  moduleId,
  courseId,
}: {
  moduleId: string;
  courseId: string;
}) {
  const { t } = useTranslation();
  const ctl = useAddContent({ moduleId, courseId, t });
  const { adding, handleAdd, handleAddQuiz, handleAddInterview } = ctl;

  return (
    <div className="flex flex-wrap gap-2 mt-1 pt-4 border-t border-m3-outline-variant/10">
      <span className="w-full text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant mb-1">
        Add Content
      </span>
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
            {cfg.label}
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
        Quiz
      </button>
      <button
        type="button"
        disabled={adding}
        onClick={handleAddInterview}
        className={ADD_PILL_CLS}
      >
        <Mic className="h-3.5 w-3.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
        Interview
      </button>

      <AddContentDialogs ctl={ctl} t={t} />
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { X, BookOpen } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LESSON_TYPE_OPTIONS } from "./constants";

interface LessonOption {
  id: string;
  title: string;
  lesson_type: string;
}

/**
 * Right-hand sidebar of the lesson editor: lesson settings (estimated duration,
 * difficulty) and the prerequisites picker (a list of selected lessons plus an
 * "add" dropdown of the remaining lessons in the course). All state is lifted
 * to the page; this component is presentational.
 */
export function LessonSettingsSidebar({
  estimatedMinutes,
  onEstimatedMinutesChange,
  difficulty,
  onDifficultyChange,
  prerequisites,
  allLessons,
  onTogglePrerequisite,
}: {
  estimatedMinutes: string;
  onEstimatedMinutesChange: (v: string) => void;
  difficulty: string;
  onDifficultyChange: (v: string) => void;
  prerequisites: string[];
  allLessons: LessonOption[];
  onTogglePrerequisite: (id: string) => void;
}) {
  const { t } = useTranslation();
  const available = allLessons.filter((l) => !prerequisites.includes(l.id));

  return (
    <aside className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-32 self-start">
      {/* ── Lesson Settings ── */}
      <div className="bg-m3-surface-container-low rounded-xl p-6 space-y-6 shadow-sm">
        <div>
          <h3 className="font-headline font-bold text-xl text-m3-primary">
            {t("teacher_lesson_manage.settings.title")}
          </h3>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t("teacher_lesson_manage.settings.subtitle")}
          </p>
        </div>

        {/* Visibility (published/draft) moved to the sticky action bar as
            the Publish/Unpublish toggle. Lesson Type selector removed —
            type is fixed at lesson creation (reading/video). */}

        {/* Estimated duration */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_lesson_manage.settings.duration_label")}
          </label>
          <input
            type="number"
            min={0}
            value={estimatedMinutes}
            onChange={(e) => onEstimatedMinutesChange(e.target.value)}
            className="w-full bg-surface-elev border border-m3-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all"
            placeholder={t(
              "teacher_lesson_manage.settings.duration_placeholder",
            )}
          />
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_lesson_manage.settings.difficulty_label")}
          </label>
          <Select
            aria-label={t("teacher_lesson_manage.settings.difficulty_label")}
            value={difficulty}
            onValueChange={onDifficultyChange}
            options={[
              {
                value: "beginner",
                label: t("teacher_lesson_manage.settings.difficulty_beginner"),
              },
              {
                value: "intermediate",
                label: t(
                  "teacher_lesson_manage.settings.difficulty_intermediate",
                ),
              },
              {
                value: "advanced",
                label: t("teacher_lesson_manage.settings.difficulty_advanced"),
              },
            ]}
            className="bg-surface-elev font-medium"
          />
        </div>
      </div>

      {/* ── Prerequisites ── */}
      <div className="bg-m3-surface-container-low rounded-xl p-6 space-y-6 shadow-sm">
        <div>
          <h3 className="font-headline font-bold text-xl text-m3-primary">
            {t("teacher_lesson_manage.prerequisites.title")}
          </h3>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t("teacher_lesson_manage.prerequisites.subtitle")}
          </p>
        </div>

        {/* Selected */}
        {prerequisites.length === 0 && (
          <p className="text-sm text-m3-on-surface-variant/60 text-center py-2">
            {t("teacher_lesson_manage.prerequisites.empty")}
          </p>
        )}
        {prerequisites.map((id) => {
          const l = allLessons.find((x) => x.id === id);
          if (!l) return null;
          const TypeIcon =
            LESSON_TYPE_OPTIONS.find((o) => o.value === l.lesson_type)?.icon ??
            BookOpen;
          return (
            <div
              key={id}
              className="flex items-center justify-between gap-2 bg-m3-primary-fixed text-m3-primary px-3 py-2.5 rounded-xl text-sm font-medium"
            >
              <div className="flex items-center gap-2 min-w-0">
                <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{l.title}</span>
              </div>
              <Button variant="ghost"
                type="button"
                onClick={() => onTogglePrerequisite(id)}
                className="shrink-0 p-0.5 rounded-md hover:bg-m3-primary/10 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}

        {/* Lesson selector — pick a lesson to add as a prerequisite.
            Already-selected lessons are filtered out of the options so the
            dropdown only offers additions. Resets to the placeholder after
            each pick (it's an "add" action, not a bound value). */}
        <Select
          aria-label="Add a prerequisite lesson"
          // Action picker, not a value holder: it always shows the prompt, and
          // choosing an entry performs the add then resets. value="" preserves
          // that behaviour.
          value=""
          disabled={available.length === 0}
          onValueChange={(next) => {
            if (next) onTogglePrerequisite(next);
          }}
          options={[
            {
              value: "",
              label:
                allLessons.length === 0
                  ? "No other lessons in this course"
                  : available.length === 0
                    ? "All lessons added"
                    : "Add a prerequisite lesson…",
            },
            ...available.map((l) => ({ value: l.id, label: l.title })),
          ]}
          className="bg-surface-elev font-medium"
        />
      </div>

      {/* AI Material Hub teaser + danger zone removed: material management
          now lives inline as "Material history" in the main column, and
          Archive/Delete moved to the sticky action bar at the top. */}
    </aside>
  );
}

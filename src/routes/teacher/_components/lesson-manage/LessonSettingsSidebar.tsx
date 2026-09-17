import { useTranslation } from "react-i18next";
import { X, BookOpen, Info } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DurationField } from "@/components/ui/duration-field";
import { LESSON_TYPE_OPTIONS } from "./constants";

interface LessonOption {
  id: string;
  title: string;
  lesson_type: string;
}

function CompletionRules() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-m3-primary/15 bg-m3-primary-fixed/40 p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-m3-primary" />
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-m3-primary">
            {t("teacher_lesson_manage.settings.completion_title")}
          </h4>
          <p className="text-xs leading-relaxed text-m3-on-surface-variant">
            {t("teacher_lesson_manage.settings.completion_auto")}
          </p>
          <p className="text-xs leading-relaxed text-m3-on-surface-variant">
            {t("teacher_lesson_manage.settings.completion_manual")}
          </p>
        </div>
      </div>
    </div>
  );
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
      <div className="bg-m3-surface-container-low rounded-xl p-6 space-y-6 shadow-sm">
        <div>
          <h3 className="font-headline font-bold text-xl text-m3-primary">
            {t("teacher_lesson_manage.settings.title")}
          </h3>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t("teacher_lesson_manage.settings.subtitle")}
          </p>
        </div>

        {/* Estimated duration */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_lesson_manage.settings.duration_label")}
          </label>
          <DurationField
            value={estimatedMinutes}
            onChange={onEstimatedMinutesChange}
            initialUnit="minutes"
            placeholder={t(
              "teacher_lesson_manage.settings.duration_placeholder",
            )}
          />
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_lesson_manage.settings.duration_help")}
          </p>
        </div>

        <CompletionRules />

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
              <Button
                variant="ghost"
                type="button"
                onClick={() => onTogglePrerequisite(id)}
                className="shrink-0 p-0.5 rounded-md hover:bg-m3-primary/10 transition-colors cursor-pointer h-auto whitespace-normal"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}

        <Select
          aria-label={t("teacher_lesson_manage.prerequisites.add_label")}
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
                  ? t("teacher_lesson_manage.prerequisites.no_other_lessons")
                  : available.length === 0
                    ? t("teacher_lesson_manage.prerequisites.all_added")
                    : t("teacher_lesson_manage.prerequisites.add_prompt"),
            },
            ...available.map((l) => ({ value: l.id, label: l.title })),
          ]}
          className="bg-surface-elev font-medium"
        />
      </div>
    </aside>
  );
}

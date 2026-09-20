import type { LessonAuthoring } from "@/lib/api/types";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Source-lesson picker: which lessons in the quiz's parent module the
 * generator pulls material from. Left column, top.
 */
export function SourceLessonsPicker({
  lessons,
  selectedLessonIds,
  onToggleLesson,
  onSelectAll,
}: {
  lessons: LessonAuthoring[];
  selectedLessonIds: string[];
  onToggleLesson: (lessonId: string) => void;
  onSelectAll: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("quiz_generation.sources.label")}
        </label>
        <Button
          variant="ghost"
          type="button"
          disabled={lessons.length === 0}
          onClick={onSelectAll}
          className="text-xs font-semibold text-m3-secondary hover:text-m3-primary disabled:text-m3-on-surface-variant/50 disabled:cursor-not-allowed cursor-pointer"
        >
          {t("quiz_generation.sources.select_all")}
        </Button>
      </div>
      <div className="space-y-2">
        {lessons.length === 0 ? (
          <div className="rounded-xl bg-m3-surface p-4 text-sm text-m3-on-surface-variant text-center">
            {t("quiz_generation.sources.empty")}
          </div>
        ) : (
          lessons.map((lesson) => {
            const checked = selectedLessonIds.includes(lesson.id);
            return (
              <label
                key={lesson.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all",
                  checked
                    ? "border-m3-secondary bg-m3-secondary-fixed/30"
                    : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggleLesson(lesson.id)}
                />
                <span className="flex-1 text-sm font-semibold text-m3-on-surface truncate">
                  {lesson.title}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

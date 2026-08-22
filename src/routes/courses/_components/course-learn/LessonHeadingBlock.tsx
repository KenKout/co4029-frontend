import { useTranslation } from "react-i18next";
import { Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMarkLessonComplete,
  useUnmarkLessonComplete,
} from "@/lib/api/hooks/progress";
import { cn } from "@/lib/utils";

/** Title + module name + the mark-complete toggle for the open lesson. */
export function LessonHeadingBlock({
  title,
  moduleTitle,
  activeLessonId,
  courseId,
  lessonStatusMap,
}: {
  title: string | undefined;
  moduleTitle: string;
  activeLessonId: string | undefined;
  courseId: string;
  lessonStatusMap: Map<string, string>;
}) {
  return (
    <div className="space-y-3">
      <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-none">
        {title}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-m3-on-surface-variant">
          {moduleTitle}
        </span>
        {activeLessonId && (
          <MarkCompleteButton
            lessonId={activeLessonId}
            courseId={courseId}
            isCompleted={lessonStatusMap.get(activeLessonId) === "completed"}
          />
        )}
      </div>
    </div>
  );
}

function MarkCompleteButton({
  lessonId,
  courseId,
  isCompleted,
}: {
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
}) {
  const { t } = useTranslation();
  const markMut = useMarkLessonComplete({ lessonId, courseId });
  const unmarkMut = useUnmarkLessonComplete({ lessonId, courseId });
  const pending = markMut.isPending || unmarkMut.isPending;

  function handleClick() {
    if (isCompleted) unmarkMut.mutate(lessonId);
    else markMut.mutate(lessonId);
  }

  return (
    <Button
      size="sm"
      variant={isCompleted ? "outline" : "default"}
      disabled={pending}
      onClick={handleClick}
      className={cn(
        "rounded-xl gap-2 text-xs font-bold",
        isCompleted
          ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
          : "gradient-primary text-white hover:opacity-95",
      )}
    >
      {isCompleted ? (
        <>
          <CheckCircle2 className="h-4 w-4 fill-emerald-100" />
          {t("course_learn.mark_complete.completed")}
        </>
      ) : (
        <>
          <Check className="h-4 w-4" />
          {t("course_learn.mark_complete.mark_done")}
        </>
      )}
    </Button>
  );
}

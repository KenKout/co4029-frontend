import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntroState } from "./helpers";

/** One scheduling row: a clock icon plus the localised when-label. */
function ScheduleRow({
  iconClass,
  children,
}: {
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
      <Clock className={iconClass} />
      <span>{children}</span>
    </div>
  );
}

/**
 * Scheduling window (backend migration 0032). NULL columns = no bound.
 * available_from → not open yet; available_until → closed. `due_at` is a
 * soft deadline: never blocks, only surfaces a "due" label / late warning.
 */
export function IntroScheduleList({ intro }: { intro: IntroState }) {
  const { t } = useTranslation();
  const { openAt, closeAt, dueAt, notYetOpen, windowClosed, pastDue } = intro;

  if (!openAt && !closeAt && !dueAt) return null;

  return (
    <div className="mb-8 flex flex-col gap-2 text-left">
      {openAt && (
        <ScheduleRow iconClass="h-4 w-4 shrink-0 text-m3-primary">
          {t(
            notYetOpen
              ? "course_quiz.schedule.opens_at"
              : "course_quiz.schedule.opened_at",
            { when: openAt.toLocaleString() },
          )}
        </ScheduleRow>
      )}
      {closeAt && (
        <ScheduleRow iconClass="h-4 w-4 shrink-0 text-amber-600">
          {t(
            windowClosed
              ? "course_quiz.schedule.closed_at"
              : "course_quiz.schedule.closes_at",
            { when: closeAt.toLocaleString() },
          )}
        </ScheduleRow>
      )}
      {dueAt && (
        <div
          className={cn(
            "flex items-center gap-2 text-sm",
            pastDue
              ? "text-amber-700 font-medium"
              : "text-m3-on-surface-variant",
          )}
        >
          <Flag className="h-4 w-4 shrink-0" />
          <span>
            {t(
              pastDue
                ? "course_quiz.schedule.was_due"
                : "course_quiz.schedule.due_by",
              { when: dueAt.toLocaleString() },
            )}
          </span>
        </div>
      )}
    </div>
  );
}

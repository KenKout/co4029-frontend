import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import type { LessonOverviewItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { STATUS_META } from "./constants";

/** One lesson's SR status: icon chip, title, kR/due line and status badge. */
function SrLessonRow({ lesson }: { lesson: LessonOverviewItem }) {
  const { t } = useTranslation();
  const meta = STATUS_META[lesson.status];
  const StatusIcon = meta.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          meta.iconBg,
        )}
      >
        <StatusIcon className={cn("h-4 w-4", meta.iconFg)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-m3-on-surface truncate">
          {lesson.lesson_title}
        </p>
        <p className="text-xs text-m3-on-surface-variant">
          {t("sr_dashboard.kr_due", {
            kr: Math.round(lesson.kr_estimate * 100),
            due: lesson.due_count,
          })}
        </p>
      </div>
      <span
        className={cn(
          "text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0",
          meta.badge,
        )}
      >
        {t(meta.i18nKey)}
      </span>
    </div>
  );
}

/** The expanded panel: skeletons while loading, then the lesson rows. */
export function SrLessonList({
  overview,
  isLoading,
}: {
  overview: LessonOverviewItem[] | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-m3-outline-variant/20 px-5 py-4 space-y-2">
      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      )}
      {!isLoading && overview && overview.length === 0 && (
        <p className="text-sm text-m3-on-surface-variant py-3 text-center">
          {t("sr_dashboard.no_lessons")}
        </p>
      )}
      {!isLoading &&
        overview?.map((lesson) => (
          <SrLessonRow key={lesson.lesson_id} lesson={lesson} />
        ))}
    </div>
  );
}

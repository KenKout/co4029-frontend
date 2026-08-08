import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useCourseSrOverview } from "@/lib/api/hooks/spaced-repetition";
import type { Course } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { SrLessonList } from "./SrLessonList";

/**
 * One enrolled course, expandable into its per-lesson SR overview. The
 * overview query only runs once expanded.
 */
export function CourseSrCard({ course }: { course: Course }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data: overview, isLoading } = useCourseSrOverview(
    expanded ? course.id : undefined,
  );

  const totalDue = overview?.reduce((acc, l) => acc + l.due_count, 0) ?? 0;
  const matureCount =
    overview?.filter((l) => l.status === "mature").length ?? 0;

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      <Button variant="ghost"
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-m3-surface-container-low transition-colors cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="w-11 h-11 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-m3-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-m3-on-surface text-base leading-snug truncate">
            {course.title}
          </h3>
          {expanded && overview ? (
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {t("sr_dashboard.card_summary", {
                lessons: overview.length,
                mature: matureCount,
                due: totalDue,
              })}
            </p>
          ) : (
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {t("sr_dashboard.card_intro")}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
        )}
      </Button>

      {expanded && <SrLessonList overview={overview} isLoading={isLoading} />}
    </div>
  );
}

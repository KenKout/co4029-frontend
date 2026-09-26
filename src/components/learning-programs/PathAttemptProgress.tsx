import { useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GradientProgress } from "@/components/ui/gradient-progress";
import type { PathExitSnapshot } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface PathAttemptProgressProps {
  snapshot: PathExitSnapshot | null | undefined;
  progressPercent: number;
  completedCourses: number;
  totalCourses: number;
}

/** Current attempt progress or the immutable exit state for a closed attempt. */
export function PathAttemptProgress({
  snapshot,
  progressPercent,
  completedCourses,
  totalCourses,
}: PathAttemptProgressProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const frozen = snapshot !== null && snapshot !== undefined;
  const courses = snapshot?.courses ?? [];
  const percent = frozen ? snapshot.overall_percent : progressPercent;
  const done = frozen ? snapshot.completed_courses : completedCourses;
  const total = frozen ? snapshot.total_courses : totalCourses;

  return (
    <div
      className="min-w-[190px] space-y-1.5"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-m3-on-surface-variant">
          {t(
            frozen
              ? "path_attempt_progress.at_exit"
              : "path_attempt_progress.current",
          )}
        </span>
        <span className="whitespace-nowrap font-semibold tabular-nums text-text-strong">
          {Math.round(percent)}% · {done}/{total}
        </span>
      </div>
      <GradientProgress value={percent} size="sm" />

      {frozen && courses.length > 0 ? (
        <Collapsible.Root open={open} onOpenChange={setOpen}>
          <Collapsible.Trigger className="flex h-auto w-full cursor-pointer items-center justify-between gap-2 rounded-md py-1 text-left text-[11px] font-semibold text-m3-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-m3-primary/40">
            <span>
              {t("path_attempt_progress.course_breakdown", {
                count: courses.length,
              })}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform",
                open && "rotate-180",
              )}
            />
          </Collapsible.Trigger>
          <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 data-[ending-style]:h-0 data-[starting-style]:h-0">
            <div className="mt-1 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-m3-outline-variant/30 bg-m3-surface-container-low p-2.5">
              {courses.map((course) => (
                <div key={course.course_id} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium text-text-strong">
                      {course.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : null}
                      <span className="truncate">{course.title}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-text-muted">
                      {Math.round(course.progress_percent)}%
                    </span>
                  </div>
                  <GradientProgress
                    value={course.progress_percent}
                    size="sm"
                    variant={course.completed ? "success" : "primary"}
                  />
                </div>
              ))}
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      ) : frozen && snapshot.schema_version < 2 ? (
        <p className="text-[11px] text-text-muted">
          {t("path_attempt_progress.legacy_breakdown_unavailable")}
        </p>
      ) : null}
    </div>
  );
}

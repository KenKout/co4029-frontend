import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Route } from "lucide-react";
import { CareerPathStatusBadge } from "@/components/ui/status-badges";
import { useCourseReadiness } from "@/lib/api/hooks/dept";
import type { CoursePathPlacement } from "@/lib/api/types-dept";

/**
 * Where this course sits in the curriculum.
 *
 * This used to be a single red-X row on the readiness checklist ("not on a
 * career path"), which was wrong twice over: it is not a publish gate, and one
 * joined string could not say WHICH stage of WHICH path — the thing a manager
 * actually needs in order to go look. Each placement is now its own row that
 * links straight to the stage it names.
 *
 * Placement is genuinely optional: a course on no path is not broken, it is
 * simply not yet part of a pathway, so the empty state is neutral rather than
 * an error.
 */
export function DeptCareerPathsTab({
  active,
  courseId,
}: {
  active: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useCourseReadiness(active ? courseId : undefined);

  if (!active) return null;

  if (isLoading || !data) {
    return <div className="h-24 bg-surface-muted animate-pulse rounded-xl" />;
  }

  const placements = data.career_paths;

  if (placements.length === 0) {
    return (
      <div className="text-center py-10">
        <Route className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
        <p className="text-sm font-medium text-text-strong">
          {t("dept_course_detail.career_paths.empty_title")}
        </p>
        <p className="mt-1 text-xs text-m3-on-surface-variant">
          {t("dept_course_detail.career_paths.empty_hint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-m3-on-surface-variant">
        {t("dept_course_detail.career_paths.summary", {
          n: placements.length,
        })}
      </p>
      <ul className="space-y-2">
        {placements.map((placement) => (
          <li key={`${placement.career_path_id}:${placement.stage_id}`}>
            <PlacementRow placement={placement} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One (path, stage) placement.
 *
 * The link carries `?tab=courses&stage=<id>` so the path detail page opens on
 * the Courses tab already scrolled to the named stage — landing on the path's
 * General tab would leave the manager to hunt for the stage this row just told
 * them about.
 */
function PlacementRow({ placement }: { placement: CoursePathPlacement }) {
  const { t } = useTranslation();

  return (
    <Link
      to="/management/career-paths/$id"
      params={{ id: placement.career_path_id }}
      search={{ tab: "courses", stage: placement.stage_id }}
      className="flex items-center gap-3 rounded-xl bg-m3-surface-container p-3 transition-colors hover:bg-m3-surface-container-high"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed font-headline text-xs font-bold text-m3-primary">
        {placement.stage_position}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-m3-on-surface">
            {placement.career_path_name}
          </p>
          <CareerPathStatusBadge status={placement.career_path_status} />
          <span
            className={
              placement.is_required
                ? "rounded-full bg-m3-primary-fixed px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-m3-primary"
                : "rounded-full bg-m3-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant"
            }
          >
            {placement.is_required
              ? t("dept_course_detail.career_paths.required")
              : t("dept_course_detail.career_paths.optional")}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-m3-on-surface-variant">
          {t("dept_course_detail.career_paths.stage_line", {
            position: placement.stage_position,
            stage:
              placement.stage_title ??
              t("dept_course_detail.career_paths.untitled_stage"),
          })}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-m3-primary" />
    </Link>
  );
}

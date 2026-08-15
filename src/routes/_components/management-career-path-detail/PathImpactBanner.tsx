import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { usePathImpact } from "@/lib/api/hooks/career-paths";
import type { CareerPathImpactRead } from "@/lib/api/types";

/**
 * Gap 3 §2.1 — "warn at the point of edit".
 *
 * Shown on the management detail page for a PUBLISHED path with active
 * enrollments: tells the manager who is walking the path before they edit
 * it, so a silent change becomes an informed one. Per-stage counts come
 * from GET /management/career-paths/{id}/impact.
 */
export function PathImpactBanner({ id }: { id: string }) {
  const { t } = useTranslation();
  const impact = usePathImpact(id);

  if (impact.isLoading || impact.isError || !impact.data) {
    return null;
  }
  const data: CareerPathImpactRead = impact.data;
  if (data.active_enrollments === 0) {
    return null;
  }

  const affected = data.stages.filter((s) => s.students_not_completed > 0);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-amber-800">
            {t("management_career_path_detail.impact.title", {
              count: data.active_enrollments,
            })}
          </p>
          <p className="mt-0.5 text-amber-700">
            {t("management_career_path_detail.impact.body")}
          </p>
          {affected.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
              {affected.map((s) => (
                <li key={s.stage_id}>
                  {t("management_career_path_detail.impact.stage_line", {
                    stage: s.title ?? t("management_career_path_detail.impact.stage_unnamed", {
                      position: s.position,
                    }),
                    count: s.students_not_completed,
                    inStage: s.students_in_stage,
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

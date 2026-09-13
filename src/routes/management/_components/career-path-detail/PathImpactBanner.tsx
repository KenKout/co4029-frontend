import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { usePathImpact } from "@/lib/api/hooks/career-paths";
import type { CareerPathImpactRead } from "@/lib/api/types";

/**
 * Gap 3 §2.1 — "warn at the point of edit", corrected for version pinning.
 *
 * Shows the manager how many students are walking the path before they edit
 * it. What it must NOT claim is that the edit reaches them: this banner only
 * renders while a draft exists (`editable` requires `hasDraft`), and
 * `publish_path` keeps existing enrollments pinned to the version they
 * started on. A draft — published or not — changes the route only for
 * students who enrol afterwards.
 *
 * The per-stage breakdown the impact endpoint returns is deliberately NOT
 * rendered. Forking clones stages into new rows, while student progress
 * latches reference the source version's stage ids, so no latch can match a
 * draft stage: the numbers collapse to "every student still has every stage
 * ahead, and they are all on stage 1" whatever the students have actually
 * done. Restoring the list means resolving each draft stage back to the
 * published stage it was cloned from, server-side.
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
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";

import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { Select } from "@/components/ui/select";
import { useFormatDateTime } from "@/lib/format/date";

import type { AdminStatsController } from "./types";
import { WINDOW_OPTIONS } from "./use-admin-stats-page";

/**
 * Dashboard header: title, the window / tenant controls, and the as-of stamp.
 *
 * The as-of line is not decoration. Every windowed number on the page was
 * evaluated against one server timestamp, and printing it is half of what
 * makes the metrics auditable — the other half being that the window control
 * moves all of them together, so no two tiles can end up describing different
 * spans of time (ADM-004, ADM-005).
 *
 * Rendered with no controller during loading and error states, where the
 * filters would have nothing to filter.
 */
export function PageHeading({ c }: { c?: AdminStatsController }) {
  const { t } = useTranslation();
  const formatDateTime = useFormatDateTime();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.stats.title_overview")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {t("admin.dashboard.subtitle")}
        </p>
      </div>

      {c && (
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedFilter
            ariaLabel={t("admin.dashboard.window.aria")}
            value={String(c.scope.windowDays)}
            onChange={(value) => c.scope.setWindowDays(Number(value))}
            options={WINDOW_OPTIONS.map((days) => ({
              key: String(days),
              label: t("admin.dashboard.window.option", { days }),
            }))}
          />

          {c.scope.canFilterOrganization && (
            <Select
              aria-label={t("admin.dashboard.org_filter.aria")}
              size="sm"
              className="w-56"
              value={c.scope.organizationId ?? ""}
              onValueChange={(value) =>
                c.scope.setOrganizationId(value || null)
              }
              options={[
                { value: "", label: t("admin.dashboard.org_filter.all") },
                ...c.scope.organizations.map((org) => ({
                  value: org.id,
                  label: org.name,
                })),
              ]}
            />
          )}

          {c.asOf && (
            <p className="text-xs text-text-muted">
              {t("admin.dashboard.as_of", { at: formatDateTime(c.asOf) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

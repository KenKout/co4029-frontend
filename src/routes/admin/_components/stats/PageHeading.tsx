import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { Select } from "@/components/ui/select";
import { useFormatDateTime } from "@/lib/format/date";

import { DateRangePicker } from "./DateRangePicker";
import type { AdminStatsController } from "./types";

/**
 * Dashboard header: title on the left, the window / tenant controls and the
 * as-of stamp on the right, one sticky row while the tiles scroll under it.
 *
 * The as-of line is not decoration. Every windowed number on the page was
 * evaluated against one server timestamp, and printing it is half of what
 * makes the metrics auditable — the other half being that the window control
 * moves all of them together, so no two tiles can end up describing different
 * spans of time (ADM-004, ADM-005).
 *
 * Sticky layer follows the app convention (AGENTS.md): `top-16` clears the
 * global ContentTopBar (z-20), `z-10` stays under it, the negative margins
 * bleed the bar across the padded main column, and the blurred white
 * background keeps scrolled content from showing through.
 *
 * Rendered with no controller during loading and error states, where the
 * filters would have nothing to filter.
 */
export const PageHeading = forwardRef<HTMLDivElement, { c?: AdminStatsController }>(
  function PageHeading({ c }, ref) {
  const { t } = useTranslation();
  const formatDateTime = useFormatDateTime();

  return (
    <div
      ref={ref}
      className="sticky top-16 z-10 -mx-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-m3-outline-variant/15 bg-white/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.stats.title_overview")}
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">
          {t("admin.dashboard.subtitle")}
        </p>
      </div>

      {c && (
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            range={c.scope.range}
            onChange={c.scope.setRange}
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
});
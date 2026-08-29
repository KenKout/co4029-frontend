import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAdminDashboard } from "@/lib/api/hooks/admin";
import { useOrganizations } from "@/lib/api/hooks/admin-organizations";
import { useSecuritySummary } from "@/lib/api/hooks/admin-security";
import { useDeepHealth } from "@/lib/api/hooks/infra";
import {
  SUPERUSER_PERMISSION,
  usePermissions,
} from "@/lib/auth/use-permissions";

import {
  buildAlerts,
  buildCost,
  buildCurrentStatus,
  buildReliability,
  buildTenant,
} from "./helpers";
import type { AdminStatsController } from "./types";
import { useFormatters } from "./use-formatters";

/** Windows offered in the dashboard filter, in days. */
export const WINDOW_OPTIONS = [1, 7, 30] as const;
export const DEFAULT_WINDOW_DAYS = 7;

/**
 * Resolves everything the operator overview renders.
 *
 * The dashboard is assembled from two independent queries — the metric rollup
 * and the dependency probe — and neither is allowed to take the page down with
 * it (ADM-015). So this hook never throws or short-circuits on error: it
 * reports each source's state and lets the sections decide what to draw.
 */
export function useAdminStatsPage(): AdminStatsController {
  const { t } = useTranslation();
  const f = useFormatters();

  const permissions = usePermissions();
  const canFilterOrganization = permissions.has(SUPERUSER_PERMISSION);

  const [windowDays, setWindowDays] = useState<number>(DEFAULT_WINDOW_DAYS);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // The organization filter is the IT admin's only; a manager is already
  // pinned server-side, so we do not even fetch the tenant list for them.
  const orgs = useOrganizations({ limit: 200, enabled: canFilterOrganization });

  const { data, isLoading, isError } = useAdminDashboard({
    windowDays,
    organizationId,
  });
  const health = useDeepHealth();
  const security = useSecuritySummary(windowDays, organizationId);

  const currentStatus = useMemo(
    () =>
      buildCurrentStatus(t, health.data, {
        isLoading: health.isLoading,
        isError: health.isError,
      }),
    [t, health.data, health.isLoading, health.isError],
  );

  const reliability = useMemo(() => buildReliability(data), [data]);
  const cost = useMemo(() => buildCost(data), [data]);
  const tenant = useMemo(() => buildTenant(data), [data]);

  const alerts = useMemo(
    () =>
      buildAlerts(t, f, reliability, cost, tenant, currentStatus, windowDays),
    [t, f, reliability, cost, tenant, currentStatus, windowDays],
  );

  return {
    t,
    f,
    data,
    deepHealth: health.data,
    isLoading,
    isError,
    asOf: data?.as_of,
    scope: {
      windowDays,
      setWindowDays,
      organizationId,
      setOrganizationId,
      canFilterOrganization,
      organizations: (orgs.items ?? []).map((o) => ({
        id: o.id,
        name: o.name,
      })),
    },
    currentStatus,
    security: {
      data: security.data,
      isLoading: security.isLoading,
      isError: security.isError,
    },
    alerts,
    reliability,
    cost,
    tenant,
  };
}

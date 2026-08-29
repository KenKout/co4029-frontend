import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Activity, AlertTriangle, Server } from "lucide-react";

import { PermissionDenied } from "@/components/ui/permission-denied";
import { Tabs, type TabDef } from "@/components/ui/tabs";

import { FailuresTab } from "./_components/operations/FailuresTab";
import { JobsQueuesTab } from "./_components/operations/JobsQueuesTab";
import { ServicesTab } from "./_components/operations/ServicesTab";
import {
  parseOperationsTab,
  type OperationsTab,
} from "./_components/operations/types";
import { useAdminProcessing } from "./_components/processing/use-admin-processing";

/**
 * Operations & Reliability (PRD ADM-010).
 *
 * Replaces three routes that each answered part of "is the platform working":
 * `/admin/health` (opaque probe cards), `/admin/stats/health` (three job
 * counters on a fourth, incompatible definition of "failed job") and
 * `/admin/processing`. The stats-health counters are gone rather than ported —
 * the dashboard's Reliability row computes the same numbers off the shared job
 * contract, and porting the old query would have preserved the disagreement.
 *
 * The active tab lives in `?tab=`, so an alert can land on the tab that
 * explains it (ADM-021) and the back button works.
 */
export default function AdminOperationsPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    tab?: string;
    status?: string;
  };

  // The processing controller owns the job filters and already seeds itself
  // from `?status=`. One instance serves both job tabs so switching between
  // them keeps the time range and search the operator already set.
  const c = useAdminProcessing();

  const [tab, setTab] = useState<OperationsTab>(() =>
    parseOperationsTab(search.tab),
  );

  // Landing directly on ?tab=failures must arrive already filtered. Runs once:
  // an explicit ?status= in the URL has already seeded the controller and is
  // left alone, and after mount the operator owns the filter.
  const pinnedOnMount = useRef(false);
  useEffect(() => {
    if (pinnedOnMount.current) return;
    pinnedOnMount.current = true;
    if (tab === "failures" && !search.status) c.setStatusFilter("failed");
  }, [tab, search.status, c]);

  /**
   * Switching tabs sets the filter the tab promises — Failures shows failures,
   * Jobs shows everything. Doing it here rather than in an effect keeps it a
   * response to the click: within a tab the operator stays free to filter
   * however they like, and nothing snaps back underneath them.
   */
  const selectTab = (next: OperationsTab) => {
    setTab(next);
    if (next === "failures") c.setStatusFilter("failed");
    else if (next === "jobs") c.setStatusFilter("");
    void navigate({
      to: "/admin/operations",
      search: { tab: next },
      replace: true,
    });
  };

  if (c.permissionsLoading) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    );
  }

  if (!c.canAdmin) {
    return <PermissionDenied />;
  }

  const tabs: TabDef<OperationsTab>[] = [
    {
      key: "services",
      label: c.t("admin.operations.tabs.services"),
      icon: Server,
    },
    {
      key: "jobs",
      label: c.t("admin.operations.tabs.jobs"),
      icon: Activity,
      count: c.counts?.total,
    },
    {
      key: "failures",
      label: c.t("admin.operations.tabs.failures"),
      icon: AlertTriangle,
      count: c.counts?.failed,
    },
  ];

  return (
    <div className="space-y-4 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {c.t("admin.operations.title")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {c.t("admin.operations.subtitle")}
        </p>
      </div>

      <Tabs
        tabs={tabs}
        value={tab}
        onChange={selectTab}
        ariaLabel={c.t("admin.operations.title")}
      />

      {tab === "services" && <ServicesTab />}
      {tab === "jobs" && <JobsQueuesTab c={c} />}
      {tab === "failures" && <FailuresTab c={c} />}
    </div>
  );
}

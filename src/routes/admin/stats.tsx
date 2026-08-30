import { CostCapacityRow } from "./_components/stats/CostCapacityRow";
import { CurrentStatusRow } from "./_components/stats/CurrentStatusRow";
import { LatencyTrendSection } from "./_components/stats/LatencyTrendSection";
import { NeedsActionSection } from "./_components/stats/NeedsActionSection";
import { PageHeading } from "./_components/stats/PageHeading";
import { ReliabilityRow } from "./_components/stats/ReliabilityRow";
import { SecurityAccessRow } from "./_components/stats/SecurityAccessRow";
import { StatsSkeleton } from "./_components/stats/StatsStates";
import { TenantAnomaliesRow } from "./_components/stats/TenantAnomaliesRow";
import { useAdminStatsPage } from "./_components/stats/use-admin-stats-page";
import { UsageCapacitySection } from "./_components/stats/UsageCapacitySection";
import { SectionNav, type SectionNavItem } from "@/components/ui/section-nav";

/**
 * Admin Operations overview.
 *
 * Row order is the priority order an operator reads in: is it up, what must I
 * do, how is it trending, what is it costing, which tenants look odd. Academic
 * signals are deliberately absent — interview pass rates and content-review
 * backlogs are Manager work and used to sit in the system administrator's
 * priority area (PRD ADM-003).
 *
 * A failed rollup no longer blanks the page: Current Status runs off its own
 * probe and each metric row renders its own error box, so one bad endpoint
 * costs one panel (ADM-015).
 */
export default function AdminStatsPage() {
  const c = useAdminStatsPage();

  // Only the very first load shows a skeleton. Once data exists, changing the
  // window or tenant refetches underneath the current numbers rather than
  // dropping the operator back to a blank page.
  if (c.isLoading && !c.data) {
    return <StatsSkeleton />;
  }

  const sections: SectionNavItem[] = [
    { id: "admin-current-status", label: c.t("admin.dashboard.nav.status") },
    { id: "admin-needs-action", label: c.t("admin.dashboard.nav.actions") },
    { id: "admin-reliability", label: c.t("admin.dashboard.nav.reliability") },
    { id: "admin-usage-capacity", label: c.t("admin.dashboard.nav.usage") },
    { id: "admin-security", label: c.t("admin.dashboard.nav.security") },
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeading c={c} />

      <SectionNav
        items={sections}
        ariaLabel={c.t("admin.dashboard.nav.label")}
        topOffset={72}
      />

      <CurrentStatusRow c={c} />
      <NeedsActionSection c={c} />
      <ReliabilityRow c={c} />
      <LatencyTrendSection range={c.scope.range} />
      <CostCapacityRow c={c} />
      <UsageCapacitySection c={c} />
      <SecurityAccessRow c={c} />
      <TenantAnomaliesRow c={c} />
    </div>
  );
}

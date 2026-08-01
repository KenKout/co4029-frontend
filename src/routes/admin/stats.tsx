import { ActivityRow } from "./_components/stats/ActivityRow";
import { AttentionSection } from "./_components/stats/AttentionSection";
import { CostSnapshotRow } from "./_components/stats/CostSnapshotRow";
import { NeedsActionRow } from "./_components/stats/NeedsActionRow";
import { PageHeading } from "./_components/stats/PageHeading";
import { StatsLoadError, StatsSkeleton } from "./_components/stats/StatsStates";
import { useAdminStatsPage } from "./_components/stats/use-admin-stats-page";

export default function AdminStatsPage() {
  const c = useAdminStatsPage();

  if (c.isError) {
    return <StatsLoadError message={c.t("admin.stats.load_failed")} />;
  }

  if (c.isLoading) {
    return <StatsSkeleton />;
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeading />

      {/* ---- Row 1: needs action ------------------------------------------ */}
      <NeedsActionRow c={c} />

      {/* ---- Row 2: cost snapshot ----------------------------------------- */}
      <CostSnapshotRow c={c} />

      {/* ---- Row 3: platform activity ------------------------------------- */}
      <ActivityRow c={c} />

      {/* ---- Row 4: needs attention --------------------------------------- */}
      <AttentionSection c={c} />
    </div>
  );
}

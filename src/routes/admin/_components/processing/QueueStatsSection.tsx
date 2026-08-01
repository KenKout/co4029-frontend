import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
} from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";

import { formatNumber } from "./helpers";
import type { AdminProcessingController } from "./use-admin-processing";

/** Error / loading / loaded switch for the six queue counters. */
export function QueueStatsSection({ c }: { c: AdminProcessingController }) {
  const { t, locale, queue } = c;

  if (queue.isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("admin.processing.queue_load_failed")}
        </p>
      </div>
    );
  }

  if (queue.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 bg-surface-muted animate-pulse rounded-xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        label={t("admin.processing.stats.total")}
        value={formatNumber(queue.data?.total, locale)}
        icon={Activity}
      />
      <StatCard
        label={t("admin.processing.stats.pending")}
        value={formatNumber(queue.data?.pending, locale)}
        icon={Clock}
      />
      <StatCard
        label={t("admin.processing.stats.running")}
        value={formatNumber(queue.data?.running, locale)}
        icon={PlayCircle}
      />
      <StatCard
        label={t("admin.processing.stats.completed")}
        value={formatNumber(queue.data?.completed, locale)}
        icon={CheckCircle2}
      />
      <StatCard
        label={t("admin.processing.stats.failed")}
        value={formatNumber(queue.data?.failed, locale)}
        icon={AlertTriangle}
      />
      <StatCard
        label={t("admin.processing.stats.cancelled")}
        value={formatNumber(queue.data?.cancelled, locale)}
        icon={XCircle}
      />
    </div>
  );
}

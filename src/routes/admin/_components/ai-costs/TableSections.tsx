import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { downloadCsv } from "@/lib/csv-export";
import type {
  AiCostsByModel as AiCostsByModelRow,
  AiCostsByPipeline as AiCostsByPipelineRow,
  AiCostsByUser as AiCostsByUserRow,
  AiCostsRecentCall,
} from "@/lib/api/types";
import { ModelEfficiencyTable } from "./ModelEfficiencyTable";
import { PipelineTable } from "./PipelineTable";
import { RecentCallsTable } from "./RecentCallsTable";
import { SectionErrorBox } from "@/components/ui/section-error-box";
import { TopUsersTable } from "./TopUsersTable";
import { MODEL_CSV_COLUMNS } from "./constants";
import type { SectionQuery } from "./types";

/**
 * The four table-backed sections of the dashboard. Each owns its own
 * error / loading / data branch so the page shell stays a pure composition.
 */

export function TopUsersSection({
  byUser,
}: {
  byUser: SectionQuery<AiCostsByUserRow[]>;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-headline font-bold text-text-strong">
        {t("admin.ai_costs.sections.top_users")}
      </h2>
      {byUser.isError ? (
        <SectionErrorBox messageKey="admin.ai_costs.users_load_failed" />
      ) : byUser.isLoading ? (
        <PageSkeleton
          rows={3}
          height="h-12"
          rounded="rounded-lg"
          bg="bg-surface-muted"
          gap="space-y-2"
        />
      ) : (
        <TopUsersTable rows={byUser.data ?? []} />
      )}
    </section>
  );
}

export function TopPipelinesSection({
  byPipeline,
  onRowClick,
}: {
  byPipeline: SectionQuery<AiCostsByPipelineRow[]>;
  onRowClick: (row: AiCostsByPipelineRow) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-headline font-bold text-text-strong">
        {t("admin.ai_costs.sections.top_pipelines")}
      </h2>
      {byPipeline.isError ? (
        <SectionErrorBox messageKey="admin.ai_costs.pipelines_load_failed" />
      ) : byPipeline.isLoading ? (
        <PageSkeleton
          rows={3}
          height="h-12"
          rounded="rounded-lg"
          bg="bg-surface-muted"
          gap="space-y-2"
        />
      ) : (
        <PipelineTable rows={byPipeline.data ?? []} onRowClick={onRowClick} />
      )}
    </section>
  );
}

export function ModelEfficiencySection({
  byModel,
}: {
  byModel: SectionQuery<AiCostsByModelRow[]>;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.by_model")}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={(byModel.data ?? []).length === 0}
          onClick={() =>
            downloadCsv(
              "ai-costs-by-model",
              byModel.data ?? [],
              MODEL_CSV_COLUMNS,
            )
          }
        >
          <Download className="h-4 w-4 mr-1" />
          {t("admin.ai_costs.export_csv")}
        </Button>
      </div>
      {byModel.isError ? (
        <SectionErrorBox messageKey="admin.ai_costs.model_load_failed" />
      ) : byModel.isLoading ? (
        <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
      ) : (
        <ModelEfficiencyTable rows={byModel.data ?? []} />
      )}
    </section>
  );
}

export function RecentCallsSection({
  recent,
}: {
  recent: SectionQuery<AiCostsRecentCall[]>;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-headline font-bold text-text-strong">
        {t("admin.ai_costs.sections.recent_calls")}
      </h2>
      {recent.isError ? (
        <SectionErrorBox messageKey="admin.ai_costs.recent_load_failed" />
      ) : recent.isLoading ? (
        <PageSkeleton
          rows={5}
          height="h-12"
          rounded="rounded-lg"
          bg="bg-surface-muted"
          gap="space-y-2"
        />
      ) : (
        <RecentCallsTable rows={recent.data ?? []} />
      )}
    </section>
  );
}

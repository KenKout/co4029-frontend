import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import type { AiCostsByPipeline as AiCostsByPipelineRow } from "@/lib/api/types";
import { useFormatters } from "./use-formatters";

/** Per-pipeline-run drilldown: header totals plus the stage cost breakdown. */
export function PipelineDrilldownSheet({
  pipeline,
  onOpenChange,
}: {
  pipeline: AiCostsByPipelineRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  return (
    <Sheet open={Boolean(pipeline)} onOpenChange={onOpenChange}>
      <SheetContent className="p-6 overflow-y-auto">
        <h2 className="font-headline text-lg font-bold text-text-strong">
          {t("admin.ai_costs.drilldown.title")}
        </h2>
        {pipeline ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-text-muted">
                  {t("admin.ai_costs.cols.pipeline")}
                </p>
                <p className="font-mono text-xs text-text-strong break-all">
                  {pipeline.pipeline_run_id}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">
                  {t("admin.ai_costs.cols.type")}
                </p>
                <p className="text-text-strong">
                  {pipeline.generation_type ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">
                  {t("admin.ai_costs.cols.cost")}
                </p>
                <p className="tabular-nums text-text-strong">
                  {fmt.usd.format(pipeline.total_usd ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">
                  {t("admin.ai_costs.cols.calls")}
                </p>
                <p className="tabular-nums text-text-strong">
                  {fmt.number.format(pipeline.call_count ?? 0)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-text-muted mb-2">
                {t("admin.ai_costs.drilldown.stages")}
              </p>
              <div className="space-y-1.5">
                {pipeline.stages_breakdown.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    {t("admin.ai_costs.drilldown.no_stages")}
                  </p>
                ) : (
                  pipeline.stages_breakdown.map((s) => (
                    <div
                      key={s.stage_name}
                      className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2"
                    >
                      <span className="text-sm text-text-strong">
                        {s.stage_name}
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="tabular-nums text-xs text-text-muted">
                          {fmt.number.format(s.tokens)} tok
                        </span>
                        <span className="tabular-nums text-sm text-text-strong">
                          {fmt.usd.format(s.usd)}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <SheetClose render={<Button variant="ghost" className="w-full" />}>
              {t("admin.ai_costs.drilldown.close")}
            </SheetClose>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

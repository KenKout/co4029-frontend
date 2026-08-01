import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { IntegrityRisk } from "./types";

const RISK_META = {
  low: {
    icon: ShieldCheck,
    wrap: "border-emerald-200 bg-emerald-50/60",
    iconBg: "bg-emerald-100 text-emerald-700",
    title: "text-emerald-800",
    body: "text-emerald-700/80",
  },
  moderate: {
    icon: AlertTriangle,
    wrap: "border-amber-200 bg-amber-50/60",
    iconBg: "bg-amber-100 text-amber-700",
    title: "text-amber-800",
    body: "text-amber-700/80",
  },
  high: {
    icon: ShieldAlert,
    wrap: "border-red-200 bg-red-50/60",
    iconBg: "bg-red-100 text-red-700",
    title: "text-red-800",
    body: "text-red-700/80",
  },
} as const;

/** Risk banner: overall read graded off warning-level signals. */
export function IntegrityRiskBanner({
  risk,
  warningCount,
}: {
  risk: IntegrityRisk;
  warningCount: number;
}) {
  const { t } = useTranslation();
  const riskMeta = RISK_META[risk];
  const RiskIcon = riskMeta.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        riskMeta.wrap,
      )}
    >
      <div className={cn("shrink-0 rounded-lg p-2", riskMeta.iconBg)}>
        <RiskIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cn("font-headline text-sm font-bold", riskMeta.title)}>
            {t(`teacher_interview_gap_report.integrity.risk.${risk}_title`)}
          </h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              riskMeta.iconBg,
            )}
          >
            {t(`teacher_interview_gap_report.integrity.risk.${risk}_badge`)}
          </span>
        </div>
        <p className={cn("mt-1 text-xs", riskMeta.body)}>
          {t(`teacher_interview_gap_report.integrity.risk.${risk}_body`, {
            count: warningCount,
          })}
        </p>
      </div>
    </div>
  );
}

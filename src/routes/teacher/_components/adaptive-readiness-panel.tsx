import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleHelp, Loader2, TriangleAlert } from "lucide-react";

import { useAdaptiveReadiness } from "@/lib/api/hooks/interviews";
import type { AdaptiveReadinessWarning } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Adaptive Readiness panel (Slice 5).
 *
 * Advisory-only surface for the interview authoring workspace: it tells the
 * teacher whether the adaptive interviewer has enough structured material
 * (outcome links, difficulty labels, coverage) to adapt well, and which input
 * modes currently run the adaptive brain. It NEVER blocks publishing — the hard
 * publish gates (>=1 approved question, >=1 outcome) live on the backend
 * /publish endpoint. Warning copy is localized from the machine `code`.
 */
export function AdaptiveReadinessPanel({ configId }: { configId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useAdaptiveReadiness(configId);

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-m3-on-surface">
          {t("teacher_interview_config.readiness.title")}
        </h3>
      </div>
      <p className="mt-1 text-sm text-m3-on-surface-variant">
        {t("teacher_interview_config.readiness.subtitle")}
      </p>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-m3-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("teacher_interview_config.readiness.loading")}
        </div>
      ) : isError ? (
        <p className="mt-4 text-sm text-m3-on-surface-variant">
          {t("teacher_interview_config.readiness.error")}
        </p>
      ) : data ? (
        <>
          <ReadinessWarnings warnings={data.warnings} />
          <RolloutStatus rollout={data.rollout} />
        </>
      ) : null}
    </div>
  );
}

function ReadinessWarnings({
  warnings,
}: {
  warnings: AdaptiveReadinessWarning[];
}) {
  const { t } = useTranslation();

  if (warnings.length === 0) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t("teacher_interview_config.readiness.all_clear")}</span>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {warnings.map((w) => {
        const isWarning = w.level === "warning";
        return (
          <li
            key={w.code}
            className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-sm",
              isWarning
                ? "border-amber-300 bg-amber-50/70 text-amber-900"
                : "border-sky-200 bg-sky-50/70 text-sky-900",
            )}
          >
            {isWarning ? (
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>
              {t(`teacher_interview_config.readiness.warnings.${w.code}`, {
                count: w.count,
                defaultValue: t("teacher_interview_config.readiness.warnings.generic", {
                  count: w.count,
                }),
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RolloutStatus({
  rollout,
}: {
  rollout: { text: boolean; hybrid: boolean; voice: boolean };
}) {
  const { t } = useTranslation();
  const modes: { key: keyof typeof rollout; label: string }[] = [
    { key: "text", label: t("teacher_interview_config.readiness.modes.text") },
    { key: "hybrid", label: t("teacher_interview_config.readiness.modes.hybrid") },
    { key: "voice", label: t("teacher_interview_config.readiness.modes.voice") },
  ];

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-sm font-medium text-m3-on-surface">
        {t("teacher_interview_config.readiness.rollout_title")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {modes.map((m) => {
          const on = rollout[m.key];
          return (
            <span
              key={m.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                on
                  ? "bg-violet-50 text-violet-700"
                  : "bg-m3-surface-container text-m3-on-surface-variant",
              )}
            >
              {m.label}:{" "}
              {on
                ? t("teacher_interview_config.readiness.rollout_on")
                : t("teacher_interview_config.readiness.rollout_off")}
            </span>
          );
        })}
      </div>
    </div>
  );
}

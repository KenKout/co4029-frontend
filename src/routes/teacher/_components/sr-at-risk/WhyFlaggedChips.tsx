import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";

import type { AtRiskStudent } from "@/lib/api/types";

import { FLAG_ICONS, FLAG_LABEL_KEYS } from "./constants";
import { activeFlagsOf } from "./helpers";

export function WhyFlaggedChips({ student }: { student: AtRiskStudent }) {
  const { t } = useTranslation();
  const flags = activeFlagsOf(student);
  if (flags.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("teacher_sr_at_risk.none_short")}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((key) => {
        const Icon = FLAG_ICONS[key];
        const meta = FLAG_LABEL_KEYS[key];
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700"
            title={`${t(meta.label)} — ${t(meta.desc)}`}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {t(meta.short)}
          </span>
        );
      })}
    </div>
  );
}

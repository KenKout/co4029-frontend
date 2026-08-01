import { useTranslation } from "react-i18next";

import { criterionLabel, scoreBand } from "./helpers";

/** One rubric criterion: score bar plus the judge's qualitative notes. */
export function CriterionRow({
  criterionKey,
  score,
  weight,
  good,
  bad,
}: {
  criterionKey: string;
  score: number;
  weight: number | undefined;
  good: string[];
  bad: string[];
}) {
  const { t } = useTranslation();
  const band = scoreBand(score);
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  return (
    <li className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-m3-on-surface leading-snug">
          {criterionLabel(criterionKey, t)}
          {typeof weight === "number" && weight > 0 && (
            <span className="ml-2 text-[10px] font-medium text-m3-on-surface-variant">
              {t("teacher_interview_gap_report.labels.weight", {
                pct: Math.round(weight * 100),
              })}
            </span>
          )}
        </p>
        <span
          className={`shrink-0 text-sm font-extrabold tabular-nums ${band.text}`}
        >
          {score.toFixed(1)}
          <span className="text-[10px] font-medium text-m3-on-surface-variant">
            /5
          </span>
        </span>
      </div>
      {/* Quantitative score bar */}
      <div className="h-2 w-full rounded-full bg-m3-outline-variant/20 overflow-hidden">
        <div
          className={`h-full rounded-full ${band.bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Qualitative per-criterion notes from the judge */}
      {good.map((note, i) => (
        <p
          key={`g-${i}`}
          className="text-xs text-emerald-700 leading-relaxed pl-2 border-l-2 border-emerald-300"
        >
          <span className="font-bold mr-1">+</span>
          {note}
        </p>
      ))}
      {bad.map((note, i) => (
        <p
          key={`b-${i}`}
          className="text-xs text-red-600 leading-relaxed pl-2 border-l-2 border-red-300"
        >
          <span className="font-bold mr-1">−</span>
          {note}
        </p>
      ))}
    </li>
  );
}

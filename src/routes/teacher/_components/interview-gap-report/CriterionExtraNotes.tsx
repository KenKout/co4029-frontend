import { useTranslation } from "react-i18next";

/** Notes not tied to a rubric criterion (e.g. theory/practice gap). */
export function CriterionExtraNotes({
  extraStrengths,
  extraWeaknesses,
}: {
  extraStrengths: string[];
  extraWeaknesses: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl bg-m3-surface-container-low p-4 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-m3-on-surface-variant">
        {t("teacher_interview_gap_report.labels.other_notes")}
      </p>
      {extraStrengths.map((note, i) => (
        <p key={`eg-${i}`} className="text-xs text-emerald-700 leading-relaxed">
          <span className="font-bold mr-1">+</span>
          {note}
        </p>
      ))}
      {extraWeaknesses.map((note, i) => (
        <p key={`eb-${i}`} className="text-xs text-red-600 leading-relaxed">
          <span className="font-bold mr-1">−</span>
          {note}
        </p>
      ))}
    </div>
  );
}

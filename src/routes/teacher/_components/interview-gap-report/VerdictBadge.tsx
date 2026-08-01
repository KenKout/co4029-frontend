import { useTranslation } from "react-i18next";

/** Pass / fail pill shown in the context grid's verdict row. */
export function VerdictBadge({ verdict }: { verdict: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={
        verdict
          ? "inline-flex rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
          : "inline-flex rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
      }
    >
      {verdict
        ? t("teacher_interview_gap_report.labels.passed")
        : t("teacher_interview_gap_report.labels.failed")}
    </span>
  );
}
